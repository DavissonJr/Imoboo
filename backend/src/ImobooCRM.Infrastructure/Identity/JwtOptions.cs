namespace ImobooCRM.Infrastructure.Identity;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    /// <summary>Minimo 32 caracteres. Vem de environment variable.</summary>
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "imoboo-crm";
    public string Audience { get; set; } = "imoboo-crm";
    public int ExpirationHours { get; set; } = 12;
}
