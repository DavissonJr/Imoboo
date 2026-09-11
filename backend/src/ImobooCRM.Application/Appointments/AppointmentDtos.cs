using ImobooCRM.Application.Common;
using ImobooCRM.Domain.Entities;

namespace ImobooCRM.Application.Appointments;

public sealed record AppointmentListItemDto(
    Guid Id,
    Guid LeadId,
    string LeadName,
    string LeadPhone,
    Guid? PropertyId,
    string? PropertyCode,
    string? PropertyTitle,
    Guid? AssignedUserId,
    string? AssignedUserName,
    AppointmentType Type,
    AppointmentStatus Status,
    DateTime ScheduledAtUtc,
    string? Notes);

public sealed class AppointmentFilter : PageRequest
{
    public Guid? LeadId { get; set; }
    public Guid? AssignedUserId { get; set; }
    public AppointmentStatus? Status { get; set; }
    public DateTime? FromUtc { get; set; }
    public DateTime? ToUtc { get; set; }
    /// <summary>Só os que ainda vão acontecer, a partir de agora.</summary>
    public bool OnlyUpcoming { get; set; }
}

public sealed record UpsertAppointmentRequest(
    Guid LeadId,
    Guid? PropertyId,
    Guid? AssignedUserId,
    AppointmentType Type,
    DateTime ScheduledAtUtc,
    string? Notes);

public sealed record UpdateAppointmentStatusRequest(AppointmentStatus Status);
