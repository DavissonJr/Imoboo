using ImobooCRM.Application.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ImobooCRM.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/settings")]
public sealed class SettingsController(ITenantSettingsService settings) : ControllerBase
{
    /// <summary>Qualquer corretor pode ver (ex.: saber se o WhatsApp está conectado).</summary>
    [HttpGet]
    public async Task<ActionResult<TenantSettingsDto>> Get(CancellationToken ct)
        => Ok(await settings.GetAsync(ct));

    [HttpPut]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(UpdateTenantSettingsRequest request, CancellationToken ct)
    {
        await settings.UpdateAsync(request, ct);
        return NoContent();
    }

    [HttpPost("whatsapp/qrcode")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<WhatsAppQrCodeDto>> GetWhatsAppQrCode(CancellationToken ct)
        => Ok(await settings.GetWhatsAppQrCodeAsync(ct));
}
