using ImobooCRM.Application.Abstractions;
using ImobooCRM.Application.Properties;
using Microsoft.EntityFrameworkCore;

namespace ImobooCRM.Application.PublicCatalog;

public interface IPublicCatalogService
{
    Task<PublicCatalogResponse?> SearchAsync(
        string tenantSlug, PropertySearchFilter filter, CancellationToken ct = default);
}

/// <summary>
/// Único ponto do sistema onde alguém sem login consulta dados de um tenant —
/// por isso é deliberadamente restrito: só imóveis disponíveis, só leitura,
/// e resolve o tenant pelo slug (público por natureza), nunca por Id direto.
/// </summary>
public sealed class PublicCatalogService(
    IAppDbContext db,
    ITenantContext tenant,
    IPropertySearchService catalog) : IPublicCatalogService
{
    public async Task<PublicCatalogResponse?> SearchAsync(
        string tenantSlug, PropertySearchFilter filter, CancellationToken ct = default)
    {
        var t = await db.Tenants
            .Where(x => x.Slug == tenantSlug && x.IsActive)
            .Select(x => new { x.Id, x.Name })
            .FirstOrDefaultAsync(ct);

        if (t is null) return null;

        // Mesmo mecanismo do webhook: nao ha usuario logado aqui, entao o tenant
        // e definido explicitamente a partir do slug resolvido acima.
        tenant.SetTenant(t.Id);

        // Nunca confia em OnlyAvailable vindo da query string: catalogo publico
        // so mostra o que esta realmente disponivel, sempre.
        filter.OnlyAvailable = true;

        var result = await catalog.SearchAsync(filter, ct);
        return new PublicCatalogResponse(t.Name, result);
    }
}
