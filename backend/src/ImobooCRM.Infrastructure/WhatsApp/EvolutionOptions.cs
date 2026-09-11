namespace ImobooCRM.Infrastructure.WhatsApp;

public sealed class EvolutionOptions
{
    public const string SectionName = "Evolution";

    public string BaseUrl { get; set; } = string.Empty;
    /// <summary>Global API key da Evolution. Vem de variavel de ambiente, nunca do appsettings versionado.</summary>
    public string ApiKey { get; set; } = string.Empty;
    public int TimeoutSeconds { get; set; } = 20;
}
