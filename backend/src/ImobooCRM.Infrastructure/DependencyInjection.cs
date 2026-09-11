using ImobooCRM.Application.Abstractions;
using ImobooCRM.Application.Ai;
using ImobooCRM.Application.Appointments;
using ImobooCRM.Application.Auth;
using ImobooCRM.Application.Conversations;
using ImobooCRM.Application.Dashboard;
using ImobooCRM.Application.Leads;
using ImobooCRM.Application.Messaging;
using ImobooCRM.Application.PlatformAdmin;
using ImobooCRM.Application.Properties;
using ImobooCRM.Application.Settings;
using ImobooCRM.Infrastructure.Ai;
using ImobooCRM.Infrastructure.BackgroundJobs;
using ImobooCRM.Infrastructure.Caching;
using ImobooCRM.Infrastructure.Identity;
using ImobooCRM.Infrastructure.Persistence;
using ImobooCRM.Infrastructure.Storage;
using ImobooCRM.Infrastructure.WhatsApp;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http.Resilience;
using Microsoft.Extensions.Options;
using Polly;
using StackExchange.Redis;

namespace ImobooCRM.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("SqlServer"),
                sql =>
                {
                    sql.EnableRetryOnFailure(3, TimeSpan.FromSeconds(5), null);
                    sql.CommandTimeout(30);
                }));

        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        // --- Redis ---
        var redisConnection = configuration.GetConnectionString("Redis")
            ?? throw new InvalidOperationException("ConnectionStrings:Redis nao configurada.");

        services.AddSingleton<IConnectionMultiplexer>(_ =>
        {
            var config = ConfigurationOptions.Parse(redisConnection);
            config.AbortOnConnectFail = false; // sobe mesmo se o Redis ainda nao estiver pronto
            config.ConnectRetry = 3;
            return ConnectionMultiplexer.Connect(config);
        });

        services.AddSingleton<ICacheService, RedisCacheService>();

        // --- Integracoes externas ---
        services.Configure<EvolutionOptions>(configuration.GetSection(EvolutionOptions.SectionName));
        services.Configure<AnthropicOptions>(configuration.GetSection(AnthropicOptions.SectionName));
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));

        services.AddHttpClient<IWhatsAppService, EvolutionWhatsAppService>((sp, client) =>
            {
                var options = sp.GetRequiredService<IOptions<EvolutionOptions>>().Value;
                client.BaseAddress = new Uri(options.BaseUrl);
                client.DefaultRequestHeaders.Add("apikey", options.ApiKey);
                client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
            })
            .AddStandardResilienceHandler(o =>
            {
                o.Retry.MaxRetryAttempts = 2;
                o.Retry.BackoffType = DelayBackoffType.Exponential;
                o.AttemptTimeout.Timeout = TimeSpan.FromSeconds(20);
                o.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(60);
                // O Polly exige amostragem >= 2x o AttemptTimeout para o circuit breaker ser efetivo.
                o.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(60);
            });

        services.AddHttpClient<IAiChatService, AnthropicChatService>((sp, client) =>
            {
                var options = sp.GetRequiredService<IOptions<AnthropicOptions>>().Value;
                client.BaseAddress = new Uri(options.BaseUrl);
                client.DefaultRequestHeaders.Add("x-api-key", options.ApiKey);
                client.DefaultRequestHeaders.Add("anthropic-version", options.ApiVersion);
                client.Timeout = TimeSpan.FromSeconds(options.TimeoutSeconds);
            })
            .AddStandardResilienceHandler(o =>
            {
                // Retry de IA custa dinheiro: 1 tentativa extra apenas.
                o.Retry.MaxRetryAttempts = 1;
                o.Retry.BackoffType = DelayBackoffType.Exponential;
                o.AttemptTimeout.Timeout = TimeSpan.FromSeconds(45);
                o.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(100);
                o.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(120);
            });

        // --- Identidade ---
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<IJwtTokenService, JwtTokenService>();
        services.AddSingleton<IDateTimeProvider, SystemDateTimeProvider>();

        // --- Processamento assincrono ---
        services.AddSingleton<IInboundMessageQueue, ChannelInboundMessageQueue>();
        services.AddHostedService<InboundMessageWorker>();

        // --- Casos de uso ---
        services.AddScoped<IPropertySearchService, PropertySearchService>();
        services.AddScoped<IPropertyWriteService, PropertyWriteService>();
        services.AddScoped<IPropertyPhotoService, PropertyPhotoService>();
        services.AddScoped<ILeadService, LeadService>();
        services.AddScoped<IConversationService, ConversationService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAppointmentService, AppointmentService>();
        services.AddScoped<IPlatformAdminService, PlatformAdminService>();
        services.AddScoped<ITenantSettingsService, TenantSettingsService>();
        services.AddScoped<ILeadPreferenceExtractor, LeadPreferenceExtractor>();
        services.AddScoped<IAiUsageRecorder, AiUsageRecorder>();
        services.AddScoped<IProcessInboundMessageHandler, ProcessInboundMessageHandler>();

        // --- Armazenamento de arquivo (fotos de imóvel) ---
        services.Configure<LocalFileStorageOptions>(configuration.GetSection(LocalFileStorageOptions.SectionName));
        services.AddSingleton<IFileStorageService, LocalFileStorageService>();

        return services;
    }
}

public sealed class SystemDateTimeProvider : IDateTimeProvider
{
    public DateTime UtcNow => DateTime.UtcNow;
}
