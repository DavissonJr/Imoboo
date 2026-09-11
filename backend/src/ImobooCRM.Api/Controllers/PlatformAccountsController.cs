using ImobooCRM.Application.PlatformAdmin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ImobooCRM.Api.Controllers;

[ApiController]
[Authorize(Roles = "PlatformAdmin")]
[Route("api/platform/accounts")]
public sealed class PlatformAccountsController(IPlatformAdminService platformAdmin) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PlatformAccountDto>>> List(CancellationToken ct)
        => Ok(await platformAdmin.ListAccountsAsync(ct));

    [HttpPost]
    public async Task<ActionResult<CreatedAccountDto>> Create(CreateAccountRequest request, CancellationToken ct)
        => Ok(await platformAdmin.CreateAccountAsync(request, ct));

    [HttpPost("{tenantId:guid}/toggle-active")]
    public async Task<IActionResult> ToggleActive(Guid tenantId, [FromBody] bool isActive, CancellationToken ct)
    {
        await platformAdmin.SetAccountActiveAsync(tenantId, isActive, ct);
        return NoContent();
    }

    [HttpPost("{tenantId:guid}/reset-password")]
    public async Task<ActionResult<CreatedAccountDto>> ResetPassword(Guid tenantId, CancellationToken ct)
        => Ok(await platformAdmin.ResetOwnerPasswordAsync(tenantId, ct));
}
