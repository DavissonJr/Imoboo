using ImobooCRM.Domain.Common;

namespace ImobooCRM.Domain.Entities;

public class Appointment : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }

    public Guid LeadId { get; set; }
    public Lead? Lead { get; set; }

    public Guid? PropertyId { get; set; }
    public Property? Property { get; set; }

    public Guid? AssignedUserId { get; set; }
    public User? AssignedUser { get; set; }

    public AppointmentType Type { get; set; } = AppointmentType.Visita;
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Agendado;

    public DateTime ScheduledAtUtc { get; set; }
    public string? Notes { get; set; }
}

public enum AppointmentType
{
    Visita = 1,
    Retorno = 2,
    Ligacao = 3,
    Reuniao = 4
}

public enum AppointmentStatus
{
    Agendado = 1,
    Confirmado = 2,
    Realizado = 3,
    Cancelado = 4,
    NaoCompareceu = 5
}
