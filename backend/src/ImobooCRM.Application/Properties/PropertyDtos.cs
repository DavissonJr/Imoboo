using ImobooCRM.Application.Common;
using ImobooCRM.Domain.Enums;

namespace ImobooCRM.Application.Properties;

public sealed record PropertyListItemDto(
    Guid Id,
    string Code,
    string Title,
    PropertyType Type,
    PropertyPurpose Purpose,
    PropertyStatus Status,
    decimal? SalePrice,
    decimal? RentPrice,
    string Neighborhood,
    string City,
    string State,
    int Bedrooms,
    int Suites,
    int Bathrooms,
    int ParkingSpots,
    decimal? UsableArea,
    bool AcceptsFinancing,
    string? CoverPhotoUrl);

public sealed record PropertyDetailDto(
    Guid Id,
    string Code,
    string Title,
    string? Description,
    PropertyType Type,
    PropertyPurpose Purpose,
    PropertyStatus Status,
    decimal? SalePrice,
    decimal? RentPrice,
    decimal? CondoFee,
    decimal? PropertyTax,
    bool AcceptsFinancing,
    bool AcceptsExchange,
    string? Street,
    string? Number,
    string Neighborhood,
    string City,
    string State,
    string? ZipCode,
    decimal? TotalArea,
    decimal? UsableArea,
    int Bedrooms,
    int Suites,
    int Bathrooms,
    int ParkingSpots,
    int? FloorNumber,
    int? YearBuilt,
    Guid? AssignedUserId,
    IReadOnlyList<string> Features,
    IReadOnlyList<PropertyPhotoDto> Photos);

public sealed record PropertyPhotoDto(Guid Id, string Url, string? Caption, bool IsCover, int SortOrder);

public sealed class PropertySearchFilter : PageRequest
{
    public string? Term { get; set; }
    public PropertyType? Type { get; set; }
    public PropertyPurpose? Purpose { get; set; }
    public PropertyStatus? Status { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public int? MinBedrooms { get; set; }
    public int? MinBathrooms { get; set; }
    public int? MinParkingSpots { get; set; }
    public decimal? MinArea { get; set; }
    public string? City { get; set; }
    public IReadOnlyList<string>? Neighborhoods { get; set; }
    public bool? AcceptsFinancing { get; set; }
    public bool OnlyAvailable { get; set; } = true;

    /// <summary>Assinatura estavel do filtro. Usada como parte da chave no Redis.</summary>
    public string Fingerprint() =>
        Hashing.Sha256Short(string.Join("|",
            Term, Type, Purpose, Status, MinPrice, MaxPrice, MinBedrooms, MinBathrooms,
            MinParkingSpots, MinArea, City,
            Neighborhoods is null ? "" : string.Join(",", Neighborhoods.OrderBy(n => n)),
            AcceptsFinancing, OnlyAvailable, Page, PageSize));
}

public sealed record UpsertPropertyRequest(
    string Code,
    string Title,
    string? Description,
    PropertyType Type,
    PropertyPurpose Purpose,
    PropertyStatus Status,
    decimal? SalePrice,
    decimal? RentPrice,
    decimal? CondoFee,
    decimal? PropertyTax,
    bool AcceptsFinancing,
    bool AcceptsExchange,
    string? Street,
    string? Number,
    string Neighborhood,
    string City,
    string State,
    string? ZipCode,
    decimal? TotalArea,
    decimal? UsableArea,
    int Bedrooms,
    int Suites,
    int Bathrooms,
    int ParkingSpots,
    int? FloorNumber,
    int? YearBuilt,
    Guid? AssignedUserId,
    IReadOnlyList<string>? Features);
