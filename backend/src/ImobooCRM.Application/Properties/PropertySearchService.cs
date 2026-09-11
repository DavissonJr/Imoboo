using ImobooCRM.Application.Abstractions;
using ImobooCRM.Application.Common;
using ImobooCRM.Domain.Entities;
using ImobooCRM.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ImobooCRM.Application.Properties;

public interface IPropertySearchService
{
    Task<PagedResult<PropertyListItemDto>> SearchAsync(PropertySearchFilter filter, CancellationToken ct = default);
    Task<PropertyDetailDto> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<PropertyListItemDto>> MatchForLeadAsync(LeadPreference preference, int take, CancellationToken ct = default);
}

/// <summary>
/// Busca no catalogo. Deterministica, sem IA: filtro vira SQL.
/// A IA so entra depois, para transformar este resultado em texto natural.
/// </summary>
public sealed class PropertySearchService(
    IAppDbContext db,
    ICacheService cache,
    ITenantContext tenant,
    ILogger<PropertySearchService> logger) : IPropertySearchService
{
    private static readonly TimeSpan SearchCacheTtl = TimeSpan.FromMinutes(5);

    public async Task<PagedResult<PropertyListItemDto>> SearchAsync(
        PropertySearchFilter filter, CancellationToken ct = default)
    {
        var cacheKey = CacheKeys.PropertySearch(tenant.TenantId, filter.Fingerprint());

        var cached = await cache.GetAsync<PagedResult<PropertyListItemDto>>(cacheKey, ct);
        if (cached is not null) return cached;

        var query = BuildQuery(filter);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(p => p.Status == PropertyStatus.Disponivel)
            .ThenByDescending(p => p.UpdatedAtUtc ?? p.CreatedAtUtc)
            .Skip(filter.Skip)
            .Take(filter.PageSize)
            .Include(p => p.Photos)      // evita N+1 na capa
            .AsNoTracking()
            .ToListAsync(ct);

        var result = new PagedResult<PropertyListItemDto>(
            items.Select(p => p.ToListItem()).ToList(), total, filter.Page, filter.PageSize);

        await cache.SetAsync(cacheKey, result, SearchCacheTtl, ct);
        return result;
    }

    public async Task<PropertyDetailDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var property = await db.Properties
            .Include(p => p.Photos)
            .Include(p => p.Features)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new NotFoundException("Imovel");

        return property.ToDetail();
    }

    /// <summary>
    /// Traduz as preferencias do lead em filtro e devolve os melhores candidatos.
    /// Esta lista e o unico contexto factual que a IA recebe sobre imoveis.
    /// </summary>
    public async Task<IReadOnlyList<PropertyListItemDto>> MatchForLeadAsync(
        LeadPreference preference, int take, CancellationToken ct = default)
    {
        var filter = new PropertySearchFilter
        {
            Purpose = preference.Purpose,
            Type = preference.PropertyType,
            MinPrice = preference.MinPrice,
            MaxPrice = preference.MaxPrice,
            MinBedrooms = preference.MinBedrooms,
            MinBathrooms = preference.MinBathrooms,
            MinParkingSpots = preference.MinParkingSpots,
            MinArea = preference.MinArea,
            City = preference.City,
            Neighborhoods = preference.NeighborhoodList.ToList(),
            AcceptsFinancing = preference.NeedsFinancing == true ? true : null,
            OnlyAvailable = true,
            Page = 1,
            PageSize = take
        };

        var result = await SearchAsync(filter, ct);

        // Sem resultado exato: relaxa bairro antes de dizer que nao ha nada.
        if (result.Items.Count == 0 && filter.Neighborhoods?.Count > 0)
        {
            logger.LogInformation(
                "Nenhum imovel no bairro solicitado. Relaxando filtro de bairro. TenantId={TenantId}",
                tenant.TenantId);

            filter.Neighborhoods = null;
            result = await SearchAsync(filter, ct);
        }

        return result.Items;
    }

    private IQueryable<Property> BuildQuery(PropertySearchFilter f)
    {
        // O global query filter do DbContext ja restringe ao tenant atual.
        var q = db.Properties.AsQueryable();

        if (f.OnlyAvailable)
            q = q.Where(p => p.Status == PropertyStatus.Disponivel);
        else if (f.Status is not null)
            q = q.Where(p => p.Status == f.Status);

        if (f.Type is not null) q = q.Where(p => p.Type == f.Type);

        if (f.Purpose is not null)
            q = q.Where(p => p.Purpose == f.Purpose || p.Purpose == PropertyPurpose.VendaELocacao);

        var isRent = f.Purpose == PropertyPurpose.Locacao;

        if (f.MinPrice is not null)
            q = isRent ? q.Where(p => p.RentPrice >= f.MinPrice) : q.Where(p => p.SalePrice >= f.MinPrice);

        if (f.MaxPrice is not null)
            q = isRent ? q.Where(p => p.RentPrice <= f.MaxPrice) : q.Where(p => p.SalePrice <= f.MaxPrice);

        if (f.MinBedrooms is not null) q = q.Where(p => p.Bedrooms >= f.MinBedrooms);
        if (f.MinBathrooms is not null) q = q.Where(p => p.Bathrooms >= f.MinBathrooms);
        if (f.MinParkingSpots is not null) q = q.Where(p => p.ParkingSpots >= f.MinParkingSpots);
        if (f.MinArea is not null) q = q.Where(p => p.UsableArea >= f.MinArea);
        if (f.AcceptsFinancing == true) q = q.Where(p => p.AcceptsFinancing);

        if (!string.IsNullOrWhiteSpace(f.City))
            q = q.Where(p => p.Location.City == f.City);

        if (f.Neighborhoods is { Count: > 0 })
            q = q.Where(p => f.Neighborhoods.Contains(p.Location.Neighborhood));

        if (!string.IsNullOrWhiteSpace(f.Term))
        {
            var term = f.Term.Trim();
            q = q.Where(p =>
                p.Code.Contains(term) ||
                p.Title.Contains(term) ||
                p.Location.Neighborhood.Contains(term) ||
                p.Location.City.Contains(term));
        }

        return q;
    }
}
