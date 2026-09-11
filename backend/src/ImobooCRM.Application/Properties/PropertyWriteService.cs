using ImobooCRM.Application.Abstractions;
using ImobooCRM.Application.Common;
using ImobooCRM.Domain.Entities;
using ImobooCRM.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace ImobooCRM.Application.Properties;

public interface IPropertyWriteService
{
    Task<Guid> CreateAsync(UpsertPropertyRequest request, CancellationToken ct = default);
    Task UpdateAsync(Guid id, UpsertPropertyRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

public sealed class PropertyWriteService(
    IAppDbContext db,
    ICacheService cache,
    ITenantContext tenant,
    IDateTimeProvider clock) : IPropertyWriteService
{
    public async Task<Guid> CreateAsync(UpsertPropertyRequest request, CancellationToken ct = default)
    {
        ValidateRequest(request);

        var codeTaken = await db.Properties.AnyAsync(p => p.Code == request.Code, ct);
        if (codeTaken)
            throw new ValidationAppException($"Ja existe um imovel com o codigo {request.Code}.");

        var property = new Property { TenantId = tenant.TenantId };
        Apply(property, request);

        db.Properties.Add(property);
        await db.SaveChangesAsync(ct);
        await InvalidateCatalogCache(ct);

        return property.Id;
    }

    public async Task UpdateAsync(Guid id, UpsertPropertyRequest request, CancellationToken ct = default)
    {
        ValidateRequest(request);

        var property = await db.Properties
            .Include(p => p.Features)
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new NotFoundException("Imovel");

        var codeTaken = await db.Properties.AnyAsync(p => p.Code == request.Code && p.Id != id, ct);
        if (codeTaken)
            throw new ValidationAppException($"Ja existe um imovel com o codigo {request.Code}.");

        Apply(property, request);
        property.UpdatedAtUtc = clock.UtcNow;

        await db.SaveChangesAsync(ct);
        await InvalidateCatalogCache(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var property = await db.Properties.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new NotFoundException("Imovel");

        db.Properties.Remove(property);
        await db.SaveChangesAsync(ct);
        await InvalidateCatalogCache(ct);
    }

    private static void ValidateRequest(UpsertPropertyRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Code) || r.Code.Length > 40)
            throw new ValidationAppException("Código do imóvel é obrigatório e deve ter até 40 caracteres.");

        if (string.IsNullOrWhiteSpace(r.Title) || r.Title.Length > 250)
            throw new ValidationAppException("Título é obrigatório e deve ter até 250 caracteres.");

        if (string.IsNullOrWhiteSpace(r.Neighborhood))
            throw new ValidationAppException("Bairro é obrigatório.");

        if (string.IsNullOrWhiteSpace(r.City))
            throw new ValidationAppException("Cidade é obrigatória.");

        if (string.IsNullOrWhiteSpace(r.State) || r.State.Trim().Length != 2)
            throw new ValidationAppException("Estado deve ser a sigla com 2 letras (ex.: PE).");

        if (r.SalePrice is < 0 || r.RentPrice is < 0)
            throw new ValidationAppException("Preço não pode ser negativo.");

        if (r.Bedrooms < 0 || r.Bathrooms < 0 || r.ParkingSpots < 0 || r.Suites < 0)
            throw new ValidationAppException("Quantidades não podem ser negativas.");
    }

    private void Apply(Property p, UpsertPropertyRequest r)
    {
        p.Code = r.Code.Trim();
        p.Title = r.Title.Trim();
        p.Description = r.Description;
        p.Type = r.Type;
        p.Purpose = r.Purpose;
        p.Status = r.Status;
        p.SalePrice = r.SalePrice;
        p.RentPrice = r.RentPrice;
        p.CondoFee = r.CondoFee;
        p.PropertyTax = r.PropertyTax;
        p.AcceptsFinancing = r.AcceptsFinancing;
        p.AcceptsExchange = r.AcceptsExchange;
        p.TotalArea = r.TotalArea;
        p.UsableArea = r.UsableArea;
        p.Bedrooms = r.Bedrooms;
        p.Suites = r.Suites;
        p.Bathrooms = r.Bathrooms;
        p.ParkingSpots = r.ParkingSpots;
        p.FloorNumber = r.FloorNumber;
        p.YearBuilt = r.YearBuilt;
        p.AssignedUserId = r.AssignedUserId;

        p.Location = new PropertyLocation
        {
            Street = r.Street,
            Number = r.Number,
            Neighborhood = r.Neighborhood.Trim(),
            City = r.City.Trim(),
            State = r.State.Trim().ToUpperInvariant(),
            ZipCode = r.ZipCode
        };

        if (r.Features is not null)
        {
            p.Features.Clear();
            foreach (var name in r.Features.Where(f => !string.IsNullOrWhiteSpace(f)).Distinct())
                p.Features.Add(new PropertyFeature { TenantId = tenant.TenantId, Name = name.Trim() });
        }
    }

    /// <summary>
    /// Catalogo alterado invalida as buscas em cache do tenant.
    /// Sem isso a IA pode oferecer um imovel que acabou de ser vendido.
    /// </summary>
    private Task InvalidateCatalogCache(CancellationToken ct) =>
        cache.RemoveByPrefixAsync(CacheKeys.PropertySearchPrefix(tenant.TenantId), ct);
}
