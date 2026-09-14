using ImobooCRM.Application.Abstractions;
using Microsoft.Extensions.Options;

namespace ImobooCRM.Infrastructure.Links;

public sealed class PublicLinkOptions
{
    public const string SectionName = "App";

    /// <summary>URL pública do frontend — o mesmo domínio que o cliente final abre no navegador.</summary>
    public string PublicBaseUrl { get; set; } = "http://localhost:4200";

    /// <summary>
    /// Endereço da própria API, visto de dentro da rede Docker — é para onde a
    /// Evolution (que roda no mesmo docker-compose) deve mandar os webhooks.
    /// Nunca é "localhost": de dentro de outro container isso não aponta pra nada.
    /// </summary>
    public string InternalApiBaseUrl { get; set; } = "http://api:8080";
}

public sealed class PublicLinkBuilder(IOptions<PublicLinkOptions> options) : IPublicLinkBuilder
{
    public string CatalogUrl(string tenantSlug) =>
        $"{options.Value.PublicBaseUrl.TrimEnd('/')}/c/{tenantSlug}";

    public string WebhookUrl(string webhookToken)
    {
        var baseUrl = $"{options.Value.InternalApiBaseUrl.TrimEnd('/')}/api/webhooks/whatsapp/evolution";
        return string.IsNullOrWhiteSpace(webhookToken)
            ? baseUrl
            : $"{baseUrl}?token={Uri.EscapeDataString(webhookToken)}";
    }
}
