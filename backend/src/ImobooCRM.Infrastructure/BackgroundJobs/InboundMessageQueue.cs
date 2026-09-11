using System.Threading.Channels;
using ImobooCRM.Application.Messaging;

namespace ImobooCRM.Infrastructure.BackgroundJobs;

/// <summary>
/// Fila em memoria com backpressure. Suficiente para o inicio.
/// Quando houver mais de uma replica, trocar por RabbitMQ/Service Bus:
/// so esta classe muda, o contrato IInboundMessageQueue continua igual.
/// </summary>
public sealed class ChannelInboundMessageQueue : IInboundMessageQueue
{
    private readonly Channel<InboundMessage> _channel =
        Channel.CreateBounded<InboundMessage>(new BoundedChannelOptions(1000)
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleReader = false,
            SingleWriter = false
        });

    public ValueTask EnqueueAsync(InboundMessage message, CancellationToken ct = default) =>
        _channel.Writer.WriteAsync(message, ct);

    public IAsyncEnumerable<InboundMessage> DequeueAllAsync(CancellationToken ct) =>
        _channel.Reader.ReadAllAsync(ct);
}
