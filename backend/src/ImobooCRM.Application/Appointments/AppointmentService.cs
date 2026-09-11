using ImobooCRM.Application.Abstractions;
using ImobooCRM.Application.Common;
using ImobooCRM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ImobooCRM.Application.Appointments;

public interface IAppointmentService
{
    Task<PagedResult<AppointmentListItemDto>> ListAsync(AppointmentFilter filter, CancellationToken ct = default);
    Task<AppointmentListItemDto> GetAsync(Guid id, CancellationToken ct = default);
    Task<Guid> CreateAsync(UpsertAppointmentRequest request, CancellationToken ct = default);
    Task UpdateAsync(Guid id, UpsertAppointmentRequest request, CancellationToken ct = default);
    Task UpdateStatusAsync(Guid id, UpdateAppointmentStatusRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

public sealed class AppointmentService(
    IAppDbContext db,
    ICacheService cache,
    ITenantContext tenant,
    IDateTimeProvider clock) : IAppointmentService
{
    public async Task<PagedResult<AppointmentListItemDto>> ListAsync(
        AppointmentFilter filter, CancellationToken ct = default)
    {
        var query = db.Appointments
            .Include(a => a.Lead)
            .Include(a => a.Property)
            .Include(a => a.AssignedUser)
            .AsQueryable();

        if (filter.LeadId is not null) query = query.Where(a => a.LeadId == filter.LeadId);
        if (filter.AssignedUserId is not null) query = query.Where(a => a.AssignedUserId == filter.AssignedUserId);
        if (filter.Status is not null) query = query.Where(a => a.Status == filter.Status);
        if (filter.FromUtc is not null) query = query.Where(a => a.ScheduledAtUtc >= filter.FromUtc);
        if (filter.ToUtc is not null) query = query.Where(a => a.ScheduledAtUtc <= filter.ToUtc);

        if (filter.OnlyUpcoming)
        {
            var now = clock.UtcNow;
            query = query.Where(a => a.ScheduledAtUtc >= now && a.Status != AppointmentStatus.Cancelado);
        }

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderBy(a => a.ScheduledAtUtc)
            .Skip(filter.Skip)
            .Take(filter.PageSize)
            .AsNoTracking()
            .Select(a => ToDto(a))
            .ToListAsync(ct);

        return new PagedResult<AppointmentListItemDto>(items, total, filter.Page, filter.PageSize);
    }

    public async Task<AppointmentListItemDto> GetAsync(Guid id, CancellationToken ct = default)
    {
        var appointment = await db.Appointments
            .Include(a => a.Lead)
            .Include(a => a.Property)
            .Include(a => a.AssignedUser)
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new NotFoundException("Agendamento");

        return ToDto(appointment);
    }

    public async Task<Guid> CreateAsync(UpsertAppointmentRequest request, CancellationToken ct = default)
    {
        ValidateRequest(request);
        await EnsureLeadExistsAsync(request.LeadId, ct);
        await EnsurePropertyExistsAsync(request.PropertyId, ct);

        var appointment = new Appointment
        {
            TenantId = tenant.TenantId,
            LeadId = request.LeadId,
            PropertyId = request.PropertyId,
            AssignedUserId = request.AssignedUserId ?? tenant.UserId,
            Type = request.Type,
            Status = AppointmentStatus.Agendado,
            ScheduledAtUtc = request.ScheduledAtUtc,
            Notes = request.Notes
        };

        db.Appointments.Add(appointment);
        await db.SaveChangesAsync(ct);
        await InvalidateDashboard(ct);

        return appointment.Id;
    }

    public async Task UpdateAsync(Guid id, UpsertAppointmentRequest request, CancellationToken ct = default)
    {
        ValidateRequest(request);
        var appointment = await db.Appointments.FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new NotFoundException("Agendamento");

        await EnsureLeadExistsAsync(request.LeadId, ct);
        await EnsurePropertyExistsAsync(request.PropertyId, ct);

        appointment.LeadId = request.LeadId;
        appointment.PropertyId = request.PropertyId;
        appointment.AssignedUserId = request.AssignedUserId;
        appointment.Type = request.Type;
        appointment.ScheduledAtUtc = request.ScheduledAtUtc;
        appointment.Notes = request.Notes;
        appointment.UpdatedAtUtc = clock.UtcNow;

        await db.SaveChangesAsync(ct);
        await InvalidateDashboard(ct);
    }

    public async Task UpdateStatusAsync(Guid id, UpdateAppointmentStatusRequest request, CancellationToken ct = default)
    {
        var appointment = await db.Appointments.FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new NotFoundException("Agendamento");

        appointment.Status = request.Status;
        appointment.UpdatedAtUtc = clock.UtcNow;

        await db.SaveChangesAsync(ct);
        await InvalidateDashboard(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var appointment = await db.Appointments.FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new NotFoundException("Agendamento");

        db.Appointments.Remove(appointment);
        await db.SaveChangesAsync(ct);
        await InvalidateDashboard(ct);
    }

    private static void ValidateRequest(UpsertAppointmentRequest request)
    {
        if (request.ScheduledAtUtc == default)
            throw new ValidationAppException("Informe a data e hora do agendamento.");

        if (request.Notes is { Length: > 1000 })
            throw new ValidationAppException("As observações podem ter no máximo 1000 caracteres.");
    }

    private async Task EnsureLeadExistsAsync(Guid leadId, CancellationToken ct)
    {
        if (!await db.Leads.AnyAsync(l => l.Id == leadId, ct))
            throw new ValidationAppException("Lead informado não existe.");
    }

    private async Task EnsurePropertyExistsAsync(Guid? propertyId, CancellationToken ct)
    {
        if (propertyId is not null && !await db.Properties.AnyAsync(p => p.Id == propertyId, ct))
            throw new ValidationAppException("Imóvel informado não existe.");
    }

    private static AppointmentListItemDto ToDto(Appointment a) => new(
        a.Id, a.LeadId, a.Lead?.Name ?? "", a.Lead?.Phone ?? "",
        a.PropertyId, a.Property?.Code, a.Property?.Title,
        a.AssignedUserId, a.AssignedUser?.Name,
        a.Type, a.Status, a.ScheduledAtUtc, a.Notes);

    private Task InvalidateDashboard(CancellationToken ct) =>
        cache.RemoveAsync(CacheKeys.DashboardSummary(tenant.TenantId), ct);
}
