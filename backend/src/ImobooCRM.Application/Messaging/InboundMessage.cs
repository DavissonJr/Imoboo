namespace ImobooCRM.Application.Messaging;

/// <summary>
/// Mensagem normalizada, ja desacoplada do formato da Evolution.
/// E o que trafega na fila interna entre o webhook e o worker.
/// </summary>
public sealed record InboundMessage(
    Guid TenantId,
    string InstanceName,
    string ExternalMessageId,
    string FromPhone,
    string? PushName,
    string Text,
    string? MediaUrl,
    string? MediaType,
    DateTime SentAtUtc);

/// <summary>
/// Fila em processo. O webhook responde 200 imediatamente e o processamento
/// (banco + IA + envio) acontece fora do ciclo HTTP.
/// Trocar por RabbitMQ/Service Bus depois nao afeta a Application.
/// </summary>
public interface IInboundMessageQueue
{
    ValueTask EnqueueAsync(InboundMessage message, CancellationToken ct = default);
    IAsyncEnumerable<InboundMessage> DequeueAllAsync(CancellationToken ct);
}
