using ImobooCRM.Application.Messaging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ImobooCRM.Infrastructure.BackgroundJobs;

/// <summary>
/// Consome a fila fora do ciclo HTTP. O webhook responde 200 em milissegundos;
/// banco, IA e envio acontecem aqui.
/// </summary>
public sealed class InboundMessageWorker(
    IInboundMessageQueue queue,
    IServiceScopeFactory scopeFactory,
    ILogger<InboundMessageWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Worker de mensagens iniciado.");

        await foreach (var message in queue.DequeueAllAsync(stoppingToken))
        {
            // Escopo proprio por mensagem: DbContext e ITenantContext isolados.
            using var scope = scopeFactory.CreateScope();

            try
            {
                var handler = scope.ServiceProvider.GetRequiredService<IProcessInboundMessageHandler>();
                await handler.HandleAsync(message, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                // Uma mensagem com problema nao pode derrubar o processamento das demais.
                logger.LogError(ex,
                    "Falha ao processar mensagem. TenantId={TenantId} MessageId={MessageId} Operation=process_inbound",
                    message.TenantId, message.ExternalMessageId);
            }
        }

        logger.LogInformation("Worker de mensagens encerrado.");
    }
}
