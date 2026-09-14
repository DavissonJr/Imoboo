using ImobooCRM.Application.Abstractions;
using Microsoft.Extensions.Options;

namespace ImobooCRM.Infrastructure.Links;

public sealed class PublicLinkOptions
{
    public const string SectionName = "App";

    /// <summary>URL pública do frontend — o mesmo domínio que o cliente final abre no navegador.</summary>
    public string PublicBaseUrl { get; set; } = "http://localhost:4200";
}

public sealed class PublicLinkBuilder(IOptions<PublicLinkOptions> options) : IPublicLinkBuilder
{
    public string CatalogUrl(string tenantSlug) =>
        $"{options.Value.PublicBaseUrl.TrimEnd('/')}/c/{tenantSlug}";
}
