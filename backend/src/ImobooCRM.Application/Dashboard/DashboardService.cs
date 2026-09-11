using ImobooCRM.Application.Abstractions;
using ImobooCRM.Domain.Entities;
using ImobooCRM.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ImobooCRM.Application.Dashboard;

public sealed record DashboardSummaryDto(
    int NewLeads,
    int LeadsInProgress,
    int HotLeads,
    int IdleLeads,
    int ConversationsWaitingBroker,
    int AutomatedConversations,
    int TotalProperties,
    int AvailableProperties,
    int MessagesSentToday,
    int AiRepliesToday,
    int AiCacheHitsToday,
    int UpcomingAppointments,
    IReadOnlyList<FunnelStageDto> Funnel);

public sealed record FunnelStageDto(LeadStatus Status, int Count);

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken ct = default);
}

/// <summary>
/// Indicadores da operacao. Cache curto: o corretor tolera 60s de defasagem,
/// mas nao tolera um dashboard que faz 12 COUNT a cada F5.
/// </summary>
public sealed class DashboardService(
    IAppDbContext db,
    ICacheService cache,
    ITenantContext tenant,
    IDateTimeProvider clock) : IDashboardService
{
    private static readonly TimeSpan Ttl = TimeSpan.FromSeconds(60);
    private const int IdleDays = 3;

    public async Task<DashboardSummaryDto> GetSummaryAsync(CancellationToken ct = default)
    {
        var key = CacheKeys.DashboardSummary(tenant.TenantId);

        var cached = await cache.GetAsync<DashboardSummaryDto>(key, ct);
        if (cached is not null) return cached;

        var today = clock.UtcNow.Date;
        var idleCutoff = clock.UtcNow.AddDays(-IdleDays);

        var leads = db.Leads;
        var conversations = db.Conversations;

        var summary = new DashboardSummaryDto(
            NewLeads: await leads.CountAsync(l => l.Status == LeadStatus.Novo, ct),
            LeadsInProgress: await leads.CountAsync(l => l.Status == LeadStatus.EmAtendimento, ct),
            HotLeads: await leads.CountAsync(l => l.Temperature == LeadTemperature.Quente, ct),
            IdleLeads: await leads.CountAsync(l =>
                l.Status != LeadStatus.Fechado && l.Status != LeadStatus.Perdido &&
                (l.LastContactAtUtc == null || l.LastContactAtUtc < idleCutoff), ct),
            ConversationsWaitingBroker: await conversations.CountAsync(c =>
                c.Status == ConversationStatus.AguardandoCorretor, ct),
            AutomatedConversations: await conversations.CountAsync(c =>
                c.Mode == ConversationMode.Automatica && c.Status != ConversationStatus.Encerrada, ct),
            TotalProperties: await db.Properties.CountAsync(ct),
            AvailableProperties: await db.Properties.CountAsync(p => p.Status == PropertyStatus.Disponivel, ct),
            MessagesSentToday: await db.Messages.CountAsync(m =>
                m.Direction == MessageDirection.Outbound && m.SentAtUtc >= today, ct),
            AiRepliesToday: await db.Messages.CountAsync(m =>
                m.Author == MessageAuthor.Ia && m.SentAtUtc >= today, ct),
            AiCacheHitsToday: await db.AiUsageLogs.CountAsync(a => a.FromCache && a.CreatedAtUtc >= today, ct),
            UpcomingAppointments: await db.Appointments.CountAsync(a =>
                a.ScheduledAtUtc >= clock.UtcNow && a.Status != AppointmentStatus.Cancelado, ct),
            Funnel: await leads
                .GroupBy(l => l.Status)
                .Select(g => new FunnelStageDto(g.Key, g.Count()))
                .ToListAsync(ct));

        await cache.SetAsync(key, summary, Ttl, ct);
        return summary;
    }
}
