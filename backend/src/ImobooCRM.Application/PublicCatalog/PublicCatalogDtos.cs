using ImobooCRM.Application.Common;
using ImobooCRM.Application.Properties;

namespace ImobooCRM.Application.PublicCatalog;

public sealed record PublicCatalogResponse(string TenantName, PagedResult<PropertyListItemDto> Properties);
