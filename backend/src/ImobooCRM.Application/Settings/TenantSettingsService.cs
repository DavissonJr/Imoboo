using ImobooCRM.Application.Abstractions;
using ImobooCRM.Application.Common;
using ImobooCRM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ImobooCRM.Application.Settings;

public interface ITenantSettingsService
{
    Task<TenantSettingsDto> GetAsync(CancellationToken ct = default);
    Task UpdateAsync(UpdateTenantSettingsRequest request, CancellationToken ct = default);
    Task<WhatsAppQrCodeDto> GetWhatsAppQrCodeAsync(CancellationToken ct = default);
}

public sealed class TenantSettingsService(
    IAppDbContext db,
    IWhatsAppService whatsApp,
    IPublicLinkBuilder linkBuilder,
    ITenantContext tenant,
    IDateTimeProvider clock) : ITenantSettingsService
{
    public async Task<TenantSettingsDto> GetAsync(CancellationToken ct = default)
    {
        var settings = await Load(ct);

        // O status refletido na tela é sempre consultado ao vivo na Evolution,
        // nunca só o que ficou salvo da última vez — evita mostrar "conectado"
        // depois que o WhatsApp caiu do outro lado.
        if (!string.IsNullOrWhiteSpace(settings.EvolutionInstanceName))
        {
            var connected = await whatsApp.IsInstanceConnectedAsync(settings.EvolutionInstanceName, ct);
            if (connected != settings.WhatsAppConnected)
            {
                settings.WhatsAppConnected = connected;
                await db.SaveChangesAsync(ct);
            }
        }

        return ToDto(settings);
    }

    public async Task UpdateAsync(UpdateTenantSettingsRequest request, CancellationToken ct = default)
    {
        var settings = await Load(ct);

        settings.AiPersona = string.IsNullOrWhiteSpace(request.AiPersona) ? null : request.AiPersona.Trim();
        settings.EvolutionInstanceName = string.IsNullOrWhiteSpace(request.EvolutionInstanceName)
            ? null
            : request.EvolutionInstanceName.Trim();
        settings.UpdatedAtUtc = clock.UtcNow;

        EnsureWebhookToken(settings);
        await db.SaveChangesAsync(ct);

        // Toda vez que a instância é (re)configurada, garante que a Evolution sabe
        // pra onde mandar as mensagens. Idempotente e barato — sem risco chamar sempre.
        if (!string.IsNullOrWhiteSpace(settings.EvolutionInstanceName))
            await whatsApp.SetWebhookAsync(settings.EvolutionInstanceName, linkBuilder.WebhookUrl(settings.WebhookToken!), ct);
    }

    public async Task<WhatsAppQrCodeDto> GetWhatsAppQrCodeAsync(CancellationToken ct = default)
    {
        var settings = await Load(ct);

        if (string.IsNullOrWhiteSpace(settings.EvolutionInstanceName))
            throw new ValidationAppException("Configure o nome da instância da Evolution antes de conectar.");

        EnsureWebhookToken(settings);
        await db.SaveChangesAsync(ct);

        // Reconfirma o webhook aqui também — cobre o caso de uma instância que já
        // estava conectada antes dessa etapa existir no sistema.
        await whatsApp.SetWebhookAsync(settings.EvolutionInstanceName, linkBuilder.WebhookUrl(settings.WebhookToken!), ct);

        var alreadyConnected = await whatsApp.IsInstanceConnectedAsync(settings.EvolutionInstanceName, ct);
        if (alreadyConnected)
        {
            settings.WhatsAppConnected = true;
            await db.SaveChangesAsync(ct);
            return new WhatsAppQrCodeDto(null, AlreadyConnected: true, Error: null);
        }

        var result = await whatsApp.GetQrCodeAsync(settings.EvolutionInstanceName, ct);
        return new WhatsAppQrCodeDto(result.Base64, AlreadyConnected: false, result.Error);
    }

    /// <summary>Contas antigas (ou criadas antes desta etapa existir) podem não ter token ainda.</summary>
    private static void EnsureWebhookToken(TenantSettings settings)
    {
        if (string.IsNullOrWhiteSpace(settings.WebhookToken))
            settings.WebhookToken = Guid.NewGuid().ToString("N");
    }

    private async Task<TenantSettings> Load(CancellationToken ct) =>
        await db.TenantSettings.FirstOrDefaultAsync(s => s.TenantId == tenant.TenantId, ct)
        ?? throw new NotFoundException("Configuração do tenant");

    private static TenantSettingsDto ToDto(TenantSettings s) => new(
        s.AiPersona, s.EvolutionInstanceName, s.WhatsAppConnected, s.WhatsAppNumber,
        s.MonthlyAiMessageLimit, s.MonthlyAiMessageCount);
}
