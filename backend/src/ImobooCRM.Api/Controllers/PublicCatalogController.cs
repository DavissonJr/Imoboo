using ImobooCRM.Application.Properties;
using ImobooCRM.Application.PublicCatalog;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ImobooCRM.Api.Controllers;

/// <summary>
/// Aberto de propósito: é o link que o bot manda pro cliente final no WhatsApp,
/// que nunca teve login no sistema.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/public/catalog")]
public sealed class PublicCatalogController(IPublicCatalogService catalog) : ControllerBase
{
    [HttpGet("{tenantSlug}")]
    public async Task<ActionResult<PublicCatalogResponse>> Get(
        string tenantSlug, [FromQuery] PropertySearchFilter filter, CancellationToken ct)
    {
        var result = await catalog.SearchAsync(tenantSlug, filter, ct);
        return result is null ? NotFound() : Ok(result);
    }
}
