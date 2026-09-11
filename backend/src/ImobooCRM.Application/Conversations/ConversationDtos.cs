using ImobooCRM.Application.Common;
using ImobooCRM.Domain.Enums;

namespace ImobooCRM.Application.Conversations;

public sealed record ConversationListItemDto(
    Guid Id,
    Guid LeadId,
    string LeadName,
    string LeadPhone,
    ConversationMode Mode,
    ConversationStatus Status,
    HandoffReason HandoffReason,
    LeadStatus LeadStatus,
    LeadTemperature Temperature,
    string? LastMessagePreview,
    DateTime? LastMessageAtUtc,
    int UnreadCount,
    Guid? AssignedUserId);

public sealed record MessageDto(
    Guid Id,
    MessageDirection Direction,
    MessageAuthor Author,
    string Content,
    string? MediaUrl,
    string? MediaType,
    MessageDeliveryStatus DeliveryStatus,
    DateTime SentAtUtc,
    IReadOnlyList<RelatedPropertyDto> Properties);

public sealed record RelatedPropertyDto(Guid Id, string Code, string Title);

public sealed record ConversationDetailDto(
    Guid Id,
    Guid LeadId,
    string LeadName,
    string LeadPhone,
    ConversationMode Mode,
    ConversationStatus Status,
    HandoffReason HandoffReason,
    Guid? AssignedUserId,
    IReadOnlyList<MessageDto> Messages);

public sealed class ConversationFilter : PageRequest
{
    public ConversationMode? Mode { get; set; }
    public ConversationStatus? Status { get; set; }
    /// <summary>Somente as que estao esperando o corretor agir.</summary>
    public bool OnlyNeedingAttention { get; set; }
    public Guid? AssignedUserId { get; set; }
    public string? Term { get; set; }
}

public sealed record SendManualMessageRequest(string Text);
