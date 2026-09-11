using ImobooCRM.Application.Common;
using ImobooCRM.Application.Leads;
using ImobooCRM.Application.Properties;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ImobooCRM.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/leads")]
public sealed class LeadsController(ILeadService leads) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<LeadListItemDto>>> List(
        [FromQuery] LeadFilter filter, CancellationToken ct)
        => Ok(await leads.ListAsync(filter, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LeadDetailDto>> Get(Guid id, CancellationToken ct)
        => Ok(await leads.GetAsync(id, ct));

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateLeadRequest request, CancellationToken ct)
    {
        await leads.UpdateAsync(id, request, ct);
        return NoContent();
    }

    /// <summary>Imoveis do catalogo compativeis com o que o lead procura.</summary>
    [HttpGet("{id:guid}/suggested-properties")]
    public async Task<ActionResult<IReadOnlyList<PropertyListItemDto>>> Suggested(Guid id, CancellationToken ct)
        => Ok(await leads.SuggestPropertiesAsync(id, ct));
}
