using ImobooCRM.Domain.Common;
using ImobooCRM.Domain.Enums;

namespace ImobooCRM.Domain.Entities;

public class Message : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }

    public Guid ConversationId { get; set; }
    public Conversation? Conversation { get; set; }

    /// <summary>Id da mensagem no provedor. Unico por tenant: base da idempotencia do webhook.</summary>
    public string? ExternalMessageId { get; set; }

    public MessageDirection Direction { get; set; }
    public MessageAuthor Author { get; set; }
    public MessageDeliveryStatus DeliveryStatus { get; set; } = MessageDeliveryStatus.Pendente;

    public string Content { get; set; } = string.Empty;
    public string? MediaUrl { get; set; }
    public string? MediaType { get; set; }

    /// <summary>Corretor que enviou, quando Author = Corretor.</summary>
    public Guid? SentByUserId { get; set; }

    public DateTime SentAtUtc { get; set; } = DateTime.UtcNow;
    public string? FailureReason { get; set; }

    /// <summary>Imoveis citados nesta resposta. Rastreabilidade do que a IA ofereceu.</summary>
    public ICollection<MessageProperty> RelatedProperties { get; set; } = new List<MessageProperty>();
}

public class MessageProperty : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public Guid MessageId { get; set; }
    public Message? Message { get; set; }
    public Guid PropertyId { get; set; }
    public Property? Property { get; set; }
}
