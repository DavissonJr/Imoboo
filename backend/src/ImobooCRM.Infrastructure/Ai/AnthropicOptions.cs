namespace ImobooCRM.Infrastructure.Ai;

public sealed class AnthropicOptions
{
    public const string SectionName = "Anthropic";

    public string BaseUrl { get; set; } = "https://api.anthropic.com";
    /// <summary>Somente environment variable. Nunca no appsettings versionado, nunca em log.</summary>
    public string ApiKey { get; set; } = string.Empty;
    public string ApiVersion { get; set; } = "2023-06-01";

    /// <summary>Modelo barato: extracao, classificacao, resumo.</summary>
    public string FastModel { get; set; } = "claude-haiku-4-5-20251001";

    /// <summary>Modelo de conversa com o lead.</summary>
    public string BalancedModel { get; set; } = "claude-sonnet-5";

    public int TimeoutSeconds { get; set; } = 45;
}
