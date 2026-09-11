using ImobooCRM.Domain.Common;
using ImobooCRM.Domain.Enums;

namespace ImobooCRM.Domain.Entities;

public class Conversation : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }

    public Guid LeadId { get; set; }
    public Lead? Lead { get; set; }

    /// <summary>Identificador do chat no provedor (ex.: 5581999999999@s.whatsapp.net).</summary>
    public string ExternalChatId { get; set; } = string.Empty;
    public string Channel { get; set; } = "whatsapp";

    public ConversationMode Mode { get; set; } = ConversationMode.Automatica;
    public ConversationStatus Status { get; set; } = ConversationStatus.AguardandoCliente;
    public HandoffReason HandoffReason { get; set; } = HandoffReason.Nenhum;

    public Guid? AssignedUserId { get; set; }
    public User? AssignedUser { get; set; }

    public DateTime? LastMessageAtUtc { get; set; }
    public string? LastMessagePreview { get; set; }
    public int UnreadCount { get; set; }

    public ICollection<Message> Messages { get; set; } = new List<Message>();

    /// <summary>Corretor assume: a IA para de responder ate que a automacao seja retomada.</summary>
    public void TakeOver(Guid userId, DateTime nowUtc)
    {
        Mode = ConversationMode.Humana;
        AssignedUserId = userId;
        Status = ConversationStatus.AguardandoCorretor;
        UpdatedAtUtc = nowUtc;
    }

    public void ResumeAutomation(DateTime nowUtc)
    {
        Mode = ConversationMode.Automatica;
        HandoffReason = HandoffReason.Nenhum;
        Status = ConversationStatus.AguardandoCliente;
        UpdatedAtUtc = nowUtc;
    }

    /// <summary>A IA se declara incapaz e joga a conversa na fila humana.</summary>
    public void RequestHumanHandoff(HandoffReason reason, DateTime nowUtc)
    {
        Mode = ConversationMode.Humana;
        HandoffReason = reason;
        Status = ConversationStatus.AguardandoCorretor;
        UpdatedAtUtc = nowUtc;
    }

    public bool ShouldAiReply => Mode == ConversationMode.Automatica && Status != ConversationStatus.Encerrada;
}
