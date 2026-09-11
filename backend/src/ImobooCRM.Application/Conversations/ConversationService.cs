using ImobooCRM.Application.Abstractions;
using ImobooCRM.Application.Common;
using ImobooCRM.Domain.Entities;
using ImobooCRM.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ImobooCRM.Application.Conversations;

public interface IConversationService
{
    Task<PagedResult<ConversationListItemDto>> ListAsync(ConversationFilter filter, CancellationToken ct = default);
    Task<ConversationDetailDto> GetAsync(Guid id, int messageLimit = 50, CancellationToken ct = default);
    Task TakeOverAsync(Guid id, CancellationToken ct = default);
    Task ResumeAutomationAsync(Guid id, CancellationToken ct = default);
    Task CloseAsync(Guid id, CancellationToken ct = default);
    Task<MessageDto> SendManualAsync(Guid id, SendManualMessageRequest request, CancellationToken ct = default);
    Task MarkAsReadAsync(Guid id, CancellationToken ct = default);
}

public sealed class ConversationService(
    IAppDbContext db,
    ITenantContext tenant,
    IWhatsAppService whatsApp,
    ICacheService cache,
    IDateTimeProvider clock) : IConversationService
{
    public async Task<PagedResult<ConversationListItemDto>> ListAsync(
        ConversationFilter filter, CancellationToken ct = default)
    {
        var query = db.Conversations.Include(c => c.Lead).AsQueryable();

        if (filter.Mode is not null) query = query.Where(c => c.Mode == filter.Mode);
        if (filter.Status is not null) query = query.Where(c => c.Status == filter.Status);
        if (filter.AssignedUserId is not null) query = query.Where(c => c.AssignedUserId == filter.AssignedUserId);

        if (filter.OnlyNeedingAttention)
            query = query.Where(c =>
                c.Status == ConversationStatus.AguardandoCorretor ||
                c.HandoffReason != HandoffReason.Nenhum);

        if (!string.IsNullOrWhiteSpace(filter.Term))
        {
            var term = filter.Term.Trim();
            query = query.Where(c => c.Lead!.Name.Contains(term) || c.Lead.Phone.Contains(term));
        }

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(c => c.LastMessageAtUtc ?? c.CreatedAtUtc)
            .Skip(filter.Skip)
            .Take(filter.PageSize)
            .AsNoTracking()
            .Select(c => new ConversationListItemDto(
                c.Id, c.LeadId, c.Lead!.Name, c.Lead.Phone,
                c.Mode, c.Status, c.HandoffReason,
                c.Lead.Status, c.Lead.Temperature,
                c.LastMessagePreview, c.LastMessageAtUtc, c.UnreadCount, c.AssignedUserId))
            .ToListAsync(ct);

        return new PagedResult<ConversationListItemDto>(items, total, filter.Page, filter.PageSize);
    }

    public async Task<ConversationDetailDto> GetAsync(Guid id, int messageLimit = 50, CancellationToken ct = default)
    {
        var conversation = await db.Conversations
            .Include(c => c.Lead)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new NotFoundException("Conversa");

        var messages = await db.Messages
            .Where(m => m.ConversationId == id)
            .OrderByDescending(m => m.SentAtUtc)
            .Take(messageLimit)
            .Include(m => m.RelatedProperties).ThenInclude(rp => rp.Property)
            .AsNoTracking()
            .ToListAsync(ct);

        var dtos = messages
            .OrderBy(m => m.SentAtUtc)
            .Select(m => new MessageDto(
                m.Id, m.Direction, m.Author, m.Content, m.MediaUrl, m.MediaType,
                m.DeliveryStatus, m.SentAtUtc,
                m.RelatedProperties
                    .Where(rp => rp.Property is not null)
                    .Select(rp => new RelatedPropertyDto(rp.PropertyId, rp.Property!.Code, rp.Property.Title))
                    .ToList()))
            .ToList();

        return new ConversationDetailDto(
            conversation.Id, conversation.LeadId, conversation.Lead!.Name, conversation.Lead.Phone,
            conversation.Mode, conversation.Status, conversation.HandoffReason,
            conversation.AssignedUserId, dtos);
    }

    public async Task TakeOverAsync(Guid id, CancellationToken ct = default)
    {
        var conversation = await Load(id, ct);
        conversation.TakeOver(tenant.UserId ?? Guid.Empty, clock.UtcNow);
        await db.SaveChangesAsync(ct);
        await InvalidateDashboard(ct);
    }

    public async Task ResumeAutomationAsync(Guid id, CancellationToken ct = default)
    {
        var conversation = await Load(id, ct);
        conversation.ResumeAutomation(clock.UtcNow);
        await db.SaveChangesAsync(ct);
        await InvalidateDashboard(ct);
    }

    public async Task CloseAsync(Guid id, CancellationToken ct = default)
    {
        var conversation = await Load(id, ct);
        conversation.Status = ConversationStatus.Encerrada;
        conversation.UpdatedAtUtc = clock.UtcNow;
        await db.SaveChangesAsync(ct);
        await InvalidateDashboard(ct);
    }

    public async Task MarkAsReadAsync(Guid id, CancellationToken ct = default)
    {
        var conversation = await Load(id, ct);
        if (conversation.UnreadCount == 0) return;

        conversation.UnreadCount = 0;
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Corretor respondendo manualmente. Assume a conversa automaticamente:
    /// nao faz sentido o corretor escrever e a IA continuar respondendo em paralelo.
    /// </summary>
    public async Task<MessageDto> SendManualAsync(
        Guid id, SendManualMessageRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            throw new ValidationAppException("A mensagem nao pode estar vazia.");

        var conversation = await db.Conversations
            .Include(c => c.Lead)
            .FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new NotFoundException("Conversa");

        var settings = await db.TenantSettings.FirstOrDefaultAsync(s => s.TenantId == tenant.TenantId, ct)
            ?? throw new NotFoundException("Configuracao do tenant");

        if (conversation.Mode == ConversationMode.Automatica)
            conversation.TakeOver(tenant.UserId ?? Guid.Empty, clock.UtcNow);

        var message = new Message
        {
            TenantId = tenant.TenantId,
            ConversationId = conversation.Id,
            Direction = MessageDirection.Outbound,
            Author = MessageAuthor.Corretor,
            SentByUserId = tenant.UserId,
            Content = request.Text.Trim(),
            SentAtUtc = clock.UtcNow
        };

        db.Messages.Add(message);

        var result = await whatsApp.SendTextAsync(
            new SendTextRequest(settings.EvolutionInstanceName ?? string.Empty, conversation.Lead!.Phone, message.Content), ct);

        message.DeliveryStatus = result.Success ? MessageDeliveryStatus.Enviada : MessageDeliveryStatus.Falhou;
        message.ExternalMessageId = result.ExternalMessageId;
        message.FailureReason = result.Error;

        conversation.LastMessageAtUtc = clock.UtcNow;
        conversation.LastMessagePreview = message.Content.Length <= 120
            ? message.Content
            : message.Content[..120] + "...";
        conversation.Status = ConversationStatus.AguardandoCliente;
        conversation.UnreadCount = 0;
        conversation.Lead.LastContactAtUtc = clock.UtcNow;

        await db.SaveChangesAsync(ct);
        await InvalidateDashboard(ct);

        return new MessageDto(message.Id, message.Direction, message.Author, message.Content,
            null, null, message.DeliveryStatus, message.SentAtUtc, []);
    }

    private async Task<Conversation> Load(Guid id, CancellationToken ct) =>
        await db.Conversations.FirstOrDefaultAsync(c => c.Id == id, ct)
        ?? throw new NotFoundException("Conversa");

    private Task InvalidateDashboard(CancellationToken ct) =>
        cache.RemoveAsync(CacheKeys.DashboardSummary(tenant.TenantId), ct);
}
