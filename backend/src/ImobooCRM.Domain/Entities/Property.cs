using ImobooCRM.Domain.Common;
using ImobooCRM.Domain.Enums;
using ImobooCRM.Domain.ValueObjects;

namespace ImobooCRM.Domain.Entities;

/// <summary>
/// Fonte de verdade do catalogo. Nenhum dado exibido ao lead pode existir
/// apenas na resposta da IA: precisa sair daqui.
/// </summary>
public class Property : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }

    /// <summary>Codigo interno unico por tenant. Ex.: AP-0142.</summary>
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public PropertyType Type { get; set; }
    public PropertyPurpose Purpose { get; set; }
    public PropertyStatus Status { get; set; } = PropertyStatus.Disponivel;

    public decimal? SalePrice { get; set; }
    public decimal? RentPrice { get; set; }
    public decimal? CondoFee { get; set; }
    public decimal? PropertyTax { get; set; }
    public bool AcceptsFinancing { get; set; }
    public bool AcceptsExchange { get; set; }

    public PropertyLocation Location { get; set; } = new();

    public decimal? TotalArea { get; set; }
    public decimal? UsableArea { get; set; }
    public int Bedrooms { get; set; }
    public int Suites { get; set; }
    public int Bathrooms { get; set; }
    public int ParkingSpots { get; set; }
    public int? FloorNumber { get; set; }
    public int? YearBuilt { get; set; }

    public Guid? AssignedUserId { get; set; }
    public User? AssignedUser { get; set; }

    public ICollection<PropertyPhoto> Photos { get; set; } = new List<PropertyPhoto>();
    public ICollection<PropertyFeature> Features { get; set; } = new List<PropertyFeature>();

    public bool IsAvailable => Status == PropertyStatus.Disponivel;

    /// <summary>Preco relevante conforme a finalidade buscada pelo lead.</summary>
    public decimal? PriceFor(PropertyPurpose purpose) => purpose switch
    {
        PropertyPurpose.Locacao => RentPrice,
        _ => SalePrice
    };
}

public class PropertyPhoto : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public Guid PropertyId { get; set; }
    public Property? Property { get; set; }

    public string Url { get; set; } = string.Empty;
    public string? Caption { get; set; }
    public int SortOrder { get; set; }
    public bool IsCover { get; set; }
}

/// <summary>Caracteristica livre (piscina, mobiliado, portaria 24h...).</summary>
public class PropertyFeature : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public Guid PropertyId { get; set; }
    public Property? Property { get; set; }

    public string Name { get; set; } = string.Empty;
}
