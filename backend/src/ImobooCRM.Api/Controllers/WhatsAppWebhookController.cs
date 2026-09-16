using ImobooCRM.Application.Abstractions;
using ImobooCRM.Application.Common;
using ImobooCRM.Application.Messaging;
using ImobooCRM.Domain.Entities;
using ImobooCRM.Infrastructure.Persistence;
using ImobooCRM.Infrastructure.WhatsApp;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ImobooCRM.Api.Controllers;

/// <summary>
/// Porta de entrada das mensagens. Faz o minimo: valida, garante idempotencia,
/// enfileira e responde. Nada de IA ou envio dentro do ciclo HTTP.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/webhooks/whatsapp")]
public sealed class WhatsAppWebhookController(
    AppDbContext db,
    ICacheService cache,
    IInboundMessageQueue queue,
    ILogger<WhatsAppWebhookController> logger) : ControllerBase
{
    private const string MessageUpsertEvent = "messages.upsert";
    private static readonly TimeSpan InstanceCacheTtl = TimeSpan.FromMinutes(30);

    [HttpPost("evolution")]
    public async Task<IActionResult> Receive(
        [FromBody] EvolutionWebhookPayload payload,
        [FromHeader(Name = "x-webhook-token")] string? headerToken,
        [FromQuery(Name = "token")] string? queryToken,
        CancellationToken ct)
    {
        var token = headerToken ?? queryToken;

        // 200 mesmo em payload inutil: 4xx faz a Evolution reentregar sem necessidade.
        if (payload.Data?.Key is null || string.IsNullOrWhiteSpace(payload.Instance))
            return Ok(new { ignored = "payload_incompleto" });

        if (!string.Equals(payload.Event, MessageUpsertEvent, StringComparison.OrdinalIgnoreCase))
            return Ok(new { ignored = "evento_nao_tratado" });

        // Eco das nossas proprias mensagens: descarta, senao a IA responde a si mesma.
        if (payload.Data.Key.FromMe)
            return Ok(new { ignored = "mensagem_propria" });

        // Grupo: JID sempre termina em @g.us. O produto e para atendimento 1:1,
        // nao para responder em grupos de WhatsApp.
        if (payload.Data.Key.RemoteJid?.EndsWith("@g.us", StringComparison.OrdinalIgnoreCase) == true)
            return Ok(new { ignored = "mensagem_de_grupo" });

        var tenant = await ResolveTenantAsync(payload.Instance, ct);
        if (tenant is null)
        {
            logger.LogWarning(
                "Instancia desconhecida. Provider=evolution Instance={Instance}", payload.Instance);
            return Ok(new { ignored = "instancia_desconhecida" });
        }

        if (!string.IsNullOrWhiteSpace(tenant.WebhookToken) && token != tenant.WebhookToken)
        {
            logger.LogWarning(
                "Token de webhook invalido. TenantId={TenantId} Instance={Instance}",
                tenant.TenantId, payload.Instance);
            return Unauthorized();
        }

        var externalId = payload.Data.Key.Id;
        if (string.IsNullOrWhiteSpace(externalId))
            return Ok(new { ignored = "sem_id_externo" });

        if (!await TryRegisterEventAsync(tenant.TenantId, externalId, payload.Event!, ct))
        {
            logger.LogInformation(
                "Webhook duplicado descartado. TenantId={TenantId} MessageId={MessageId}",
                tenant.TenantId, externalId);
            return Ok(new { ignored = "duplicado" });
        }

        var phone = PhoneNumber.Normalize(payload.Data.Key.RemoteJid ?? string.Empty);
        if (string.IsNullOrWhiteSpace(phone))
            return Ok(new { ignored = "remetente_invalido" });

        var (mediaUrl, mediaType) = payload.Data.Message?.ExtractMedia() ?? (null, null);

        await queue.EnqueueAsync(new InboundMessage(
            TenantId: tenant.TenantId,
            InstanceName: payload.Instance,
            ExternalMessageId: externalId,
            FromPhone: phone,
            PushName: payload.Data.PushName,
            Text: payload.Data.Message?.ExtractText() ?? string.Empty,
            MediaUrl: mediaUrl,
            MediaType: mediaType,
            SentAtUtc: payload.Data.MessageTimestamp is { } ts
                ? DateTimeOffset.FromUnixTimeSeconds(ts).UtcDateTime
                : DateTime.UtcNow), ct);

        return Ok(new { queued = true });
    }

    /// <summary>Instancia -> tenant. Cacheado: e a mesma resposta para milhares de mensagens.</summary>
    private async Task<TenantSettings?> ResolveTenantAsync(string instance, CancellationToken ct)
    {
        var key = CacheKeys.InstanceTenant(instance);

        var cached = await cache.GetAsync<CachedTenant>(key, ct);
        if (cached is not null)
            return new TenantSettings { TenantId = cached.TenantId, WebhookToken = cached.WebhookToken };

        // IgnoreQueryFilters: ainda nao existe tenant no contexto neste ponto.
        var settings = await db.TenantSettings
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.EvolutionInstanceName == instance, ct);

        if (settings is null) return null;

        await cache.SetAsync(key, new CachedTenant(settings.TenantId, settings.WebhookToken), InstanceCacheTtl, ct);
        return settings;
    }

    /// <summary>
    /// Idempotencia: o indice unico (Provider, ExternalEventId) e o arbitro.
    /// Se o insert falhar, outra replica ja pegou este evento.
    /// </summary>
    private async Task<bool> TryRegisterEventAsync(
        Guid tenantId, string externalId, string eventType, CancellationToken ct)
    {
        db.InboundWebhookEvents.Add(new InboundWebhookEvent
        {
            TenantId = tenantId,
            Provider = "evolution",
            ExternalEventId = externalId,
            EventType = eventType
        });

        try
        {
            await db.SaveChangesAsync(ct);
            return true;
        }
        catch (DbUpdateException)
        {
            db.ChangeTracker.Clear();
            return false;
        }
    }

    private sealed record CachedTenant(Guid TenantId, string? WebhookToken);
}
