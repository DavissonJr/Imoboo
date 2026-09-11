using ImobooCRM.Domain.Common;

namespace ImobooCRM.Domain.Entities;

/// <summary>
/// Registro de idempotencia. Antes de processar um webhook gravamos o par
/// (Provider, ExternalEventId) com indice unico. Se ja existir, o evento e descartado.
/// Uma mensagem entregue duas vezes nao gera duas respostas ao cliente.
/// </summary>
public class InboundWebhookEvent : BaseEntity
{
    public Guid? TenantId { get; set; }
    public string Provider { get; set; } = "evolution";
    public string ExternalEventId { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public DateTime ReceivedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAtUtc { get; set; }
    public string? Error { get; set; }
}
