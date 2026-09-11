using ImobooCRM.Application.Abstractions;
using ImobooCRM.Application.Common;
using ImobooCRM.Application.Properties;
using ImobooCRM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ImobooCRM.Application.Leads;

public interface ILeadService
{
    Task<PagedResult<LeadListItemDto>> ListAsync(LeadFilter filter, CancellationToken ct = default);
    Task<LeadDetailDto> GetAsync(Guid id, CancellationToken ct = default);
    Task UpdateAsync(Guid id, UpdateLeadRequest request, CancellationToken ct = default);
    /// <summary>Imoveis do catalogo compativeis com as preferencias registradas do lead.</summary>
    Task<IReadOnlyList<PropertyListItemDto>> SuggestPropertiesAsync(Guid id, CancellationToken ct = default);
}

public sealed class LeadService(
    IAppDbContext db,
    IPropertySearchService catalog,
    ICacheService cache,
    ITenantContext tenant,
    IDateTimeProvider clock) : ILeadService
{
    public async Task<PagedResult<LeadListItemDto>> ListAsync(LeadFilter filter, CancellationToken ct = default)
    {
        var query = db.Leads.Include(l => l.AssignedUser).AsQueryable();

        if (filter.Status is not null) query = query.Where(l => l.Status == filter.Status);
        if (filter.Temperature is not null) query = query.Where(l => l.Temperature == filter.Temperature);
        if (filter.AssignedUserId is not null) query = query.Where(l => l.AssignedUserId == filter.AssignedUserId);

        if (filter.IdleForDays is > 0)
        {
            var cutoff = clock.UtcNow.AddDays(-filter.IdleForDays.Value);
            query = query.Where(l => l.LastContactAtUtc == null || l.LastContactAtUtc < cutoff);
        }

        if (!string.IsNullOrWhiteSpace(filter.Term))
        {
            var term = filter.Term.Trim();
            query = query.Where(l => l.Name.Contains(term) || l.Phone.Contains(term));
        }

        var total = await query.CountAsync(ct);

        var leads = await query
            .OrderByDescending(l => l.LastContactAtUtc ?? l.CreatedAtUtc)
            .Skip(filter.Skip)
            .Take(filter.PageSize)
            .AsNoTracking()
            .ToListAsync(ct);

        var items = leads.Select(l => new LeadListItemDto(
            l.Id, l.Name, l.Phone, l.Email, l.Source, l.Status, l.Temperature,
            l.AssignedUserId, l.AssignedUser?.Name,
            l.LastContactAtUtc, l.NextContactAtUtc,
            Describe(l.Preference))).ToList();

        return new PagedResult<LeadListItemDto>(items, total, filter.Page, filter.PageSize);
    }

    public async Task<LeadDetailDto> GetAsync(Guid id, CancellationToken ct = default)
    {
        var lead = await db.Leads.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id, ct)
            ?? throw new NotFoundException("Lead");

        return new LeadDetailDto(
            lead.Id, lead.Name, lead.Phone, lead.Email, lead.Source, lead.Status, lead.Temperature,
            lead.AssignedUserId, lead.Notes, lead.AiSummary,
            lead.LastContactAtUtc, lead.NextContactAtUtc, ToDto(lead.Preference));
    }

    public async Task UpdateAsync(Guid id, UpdateLeadRequest request, CancellationToken ct = default)
    {
        var lead = await db.Leads.FirstOrDefaultAsync(l => l.Id == id, ct)
            ?? throw new NotFoundException("Lead");

        lead.Name = request.Name.Trim();
        lead.Email = request.Email;
        lead.Status = request.Status;
        lead.Temperature = request.Temperature;
        lead.AssignedUserId = request.AssignedUserId;
        lead.Notes = request.Notes;
        lead.NextContactAtUtc = request.NextContactAtUtc;
        lead.UpdatedAtUtc = clock.UtcNow;

        if (request.Preference is { } p)
        {
            lead.Preference.Purpose = p.Purpose;
            lead.Preference.PropertyType = p.PropertyType;
            lead.Preference.MinPrice = p.MinPrice;
            lead.Preference.MaxPrice = p.MaxPrice;
            lead.Preference.MinBedrooms = p.MinBedrooms;
            lead.Preference.MinBathrooms = p.MinBathrooms;
            lead.Preference.MinParkingSpots = p.MinParkingSpots;
            lead.Preference.MinArea = p.MinArea;
            lead.Preference.City = p.City;
            lead.Preference.Neighborhoods = p.Neighborhoods.Count == 0 ? null : string.Join(";", p.Neighborhoods);
            lead.Preference.NeedsFinancing = p.NeedsFinancing;
        }

        await db.SaveChangesAsync(ct);
        await cache.RemoveAsync(CacheKeys.DashboardSummary(tenant.TenantId), ct);
    }

    public async Task<IReadOnlyList<PropertyListItemDto>> SuggestPropertiesAsync(Guid id, CancellationToken ct = default)
    {
        var lead = await db.Leads.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id, ct)
            ?? throw new NotFoundException("Lead");

        return lead.Preference.HasAnything
            ? await catalog.MatchForLeadAsync(lead.Preference, 10, ct)
            : [];
    }

    private static LeadPreferenceDto ToDto(LeadPreference p) => new(
        p.Purpose, p.PropertyType, p.MinPrice, p.MaxPrice, p.MinBedrooms, p.MinBathrooms,
        p.MinParkingSpots, p.MinArea, p.City, p.NeighborhoodList.ToList(), p.NeedsFinancing);

    private static string? Describe(LeadPreference p)
    {
        if (!p.HasAnything) return null;

        var parts = new List<string>();
        if (p.PropertyType is not null) parts.Add(p.PropertyType.ToString()!);
        if (p.MinBedrooms is not null) parts.Add($"{p.MinBedrooms}+ quartos");
        if (p.MaxPrice is not null) parts.Add($"ate R$ {p.MaxPrice:N0}");
        if (!string.IsNullOrWhiteSpace(p.City)) parts.Add(p.City);

        return string.Join(" · ", parts);
    }
}
