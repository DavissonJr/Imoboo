using ImobooCRM.Application.Appointments;
using ImobooCRM.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ImobooCRM.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/appointments")]
public sealed class AppointmentsController(IAppointmentService appointments) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<AppointmentListItemDto>>> List(
        [FromQuery] AppointmentFilter filter, CancellationToken ct)
        => Ok(await appointments.ListAsync(filter, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AppointmentListItemDto>> Get(Guid id, CancellationToken ct)
        => Ok(await appointments.GetAsync(id, ct));

    [HttpPost]
    public async Task<IActionResult> Create(UpsertAppointmentRequest request, CancellationToken ct)
    {
        var id = await appointments.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id }, new { id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpsertAppointmentRequest request, CancellationToken ct)
    {
        await appointments.UpdateAsync(id, request, ct);
        return NoContent();
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, UpdateAppointmentStatusRequest request, CancellationToken ct)
    {
        await appointments.UpdateStatusAsync(id, request, ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await appointments.DeleteAsync(id, ct);
        return NoContent();
    }
}
