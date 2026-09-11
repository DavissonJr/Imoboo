using ImobooCRM.Domain.Entities;

namespace ImobooCRM.Application.Properties;

public static class PropertyMappings
{
    public static PropertyListItemDto ToListItem(this Property p) => new(
        p.Id, p.Code, p.Title, p.Type, p.Purpose, p.Status,
        p.SalePrice, p.RentPrice,
        p.Location.Neighborhood, p.Location.City, p.Location.State,
        p.Bedrooms, p.Suites, p.Bathrooms, p.ParkingSpots, p.UsableArea,
        p.AcceptsFinancing,
        p.Photos.OrderByDescending(x => x.IsCover).ThenBy(x => x.SortOrder).Select(x => x.Url).FirstOrDefault());

    public static PropertyDetailDto ToDetail(this Property p) => new(
        p.Id, p.Code, p.Title, p.Description, p.Type, p.Purpose, p.Status,
        p.SalePrice, p.RentPrice, p.CondoFee, p.PropertyTax,
        p.AcceptsFinancing, p.AcceptsExchange,
        p.Location.Street, p.Location.Number, p.Location.Neighborhood,
        p.Location.City, p.Location.State, p.Location.ZipCode,
        p.TotalArea, p.UsableArea, p.Bedrooms, p.Suites, p.Bathrooms,
        p.ParkingSpots, p.FloorNumber, p.YearBuilt, p.AssignedUserId,
        p.Features.Select(f => f.Name).ToList(),
        p.Photos.OrderBy(x => x.SortOrder)
            .Select(x => new PropertyPhotoDto(x.Id, x.Url, x.Caption, x.IsCover, x.SortOrder)).ToList());
}
