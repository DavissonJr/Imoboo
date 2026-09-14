using ImobooCRM.Application.Abstractions;
using ImobooCRM.Application.Ai;
using ImobooCRM.Application.Common;
using ImobooCRM.Application.Properties;
using ImobooCRM.Domain.Entities;
using ImobooCRM.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ImobooCRM.Application.Messaging;

public interface IProcessInboundMessageHandler
{
    Task HandleAsync(InboundMessage inbound, CancellationToken ct = default);
}

/// <summary>
/// Caso de uso central. Ordem deliberada: dados reais primeiro, IA por ultimo.
/// Toda decisao que pode ser tomada com codigo e tomada antes de gastar token.
/// </summary>
public sealed class ProcessInboundMessageHandler(
    IAppDbContext db,
    ICacheService cache,
    ITenantContext tenant,
    IAiChatService ai,
    IAiUsageRecorder usage,
    ILeadPreferenceExtractor extractor,
    IPropertySearchService catalog,
    IWhatsAppService whatsApp,
    IPublicLinkBuilder linkBuilder,
    IDateTimeProvider clock,
    ILogger<ProcessInboundMessageHandler> logger) : IProcessInboundMessageHandler
{
    /// <summary>Quantas mensagens recentes vao no prompt. Historico antigo vive no resumo.</summary>
    private const int HistoryWindow = 8;
    private const int MaxPropertiesInContext = 5;
    private static readonly TimeSpan ReplyCacheTtl = TimeSpan.FromHours(6);
    private static readonly TimeSpan LockTtl = TimeSpan.FromSeconds(60);

    private const string WelcomeMenuText =
        "Olá! 👋 Que bom falar com você.\n\n" +
        "1 - Ver imóveis disponíveis\n" +
        "2 - Falar com um atendente\n\n" +
        "Responda com o número da opção.";

    private const string RepromptMenuText =
        "Não entendi 🙂 Escolha uma das opções:\n\n" +
        "1 - Ver imóveis disponíveis\n" +
        "2 - Falar com um atendente\n\n" +
        "Responda com o número da opção.";

    public async Task HandleAsync(InboundMessage inbound, CancellationToken ct = default)
    {
        tenant.SetTenant(inbound.TenantId);

        // Serializa o processamento por telefone: duas mensagens seguidas do mesmo lead
        // nao podem gerar duas conversas nem duas respostas simultaneas.
        var lockKey = $"tenant:{inbound.TenantId}:inbound:{inbound.FromPhone}";
        await using var handle = await cache.AcquireLockAsync(lockKey, LockTtl, ct);

        if (handle is null)
        {
            logger.LogWarning(
                "Lock ocupado, mensagem reenfileirada. TenantId={TenantId} Phone={Phone}",
                inbound.TenantId, Mask(inbound.FromPhone));
            return;
        }

        var settings = await db.TenantSettings.FirstOrDefaultAsync(s => s.TenantId == inbound.TenantId, ct);
        if (settings is null)
        {
            logger.LogError("TenantSettings ausente. TenantId={TenantId}", inbound.TenantId);
            return;
        }

        var lead = await GetOrCreateLeadAsync(inbound, ct);
        var conversation = await GetOrCreateConversationAsync(lead, inbound, ct);

        // Idempotencia em segundo nivel: mesmo ExternalMessageId nao entra duas vezes.
        var alreadyStored = await db.Messages.AnyAsync(
            m => m.ConversationId == conversation.Id && m.ExternalMessageId == inbound.ExternalMessageId, ct);

        if (alreadyStored)
        {
            logger.LogInformation(
                "Mensagem duplicada ignorada. ConversationId={ConversationId} MessageId={MessageId}",
                conversation.Id, inbound.ExternalMessageId);
            return;
        }

        StoreInbound(conversation, inbound);
        lead.RegisterContact(clock.UtcNow);

        // Toda conversa nasce em modo Menu: nenhuma chamada de IA acontece até o
        // lead pedir explicitamente para falar com um atendente.
        if (conversation.Mode == ConversationMode.Menu)
        {
            var continueToAi = await HandleMenuAsync(settings, conversation, lead, inbound, ct);

            if (!continueToAi)
            {
                await db.SaveChangesAsync(ct);
                await cache.RemoveAsync(CacheKeys.DashboardSummary(tenant.TenantId), ct);
                return;
            }
            // continueToAi == true: o lead escolheu falar com atendente, o modo já
            // virou Automatica — segue direto para o fluxo normal de IA abaixo.
        }

        var decision = await DecideAsync(settings, conversation, lead, inbound, ct);

        if (!decision.ShouldReply)
        {
            conversation.Status = ConversationStatus.AguardandoCorretor;
            await db.SaveChangesAsync(ct);

            logger.LogInformation(
                "Sem resposta automatica. ConversationId={ConversationId} Motivo={Reason}",
                conversation.Id, decision.SkipReason);
            return;
        }

        await ReplyAsync(settings, conversation, lead, inbound, decision.Properties, ct);
        await db.SaveChangesAsync(ct);
    }

    // ---------------------------------------------------------------- decisao

    private sealed record Decision(bool ShouldReply, string SkipReason, IReadOnlyList<PropertyListItemDto> Properties)
    {
        public static Decision Skip(string reason) => new(false, reason, []);
        public static Decision Reply(IReadOnlyList<PropertyListItemDto> properties) => new(true, "", properties);
    }

    /// <summary>
    /// Filtros baratos primeiro. Cada return antecipado e uma chamada de IA que nao aconteceu.
    /// </summary>
    private async Task<Decision> DecideAsync(
        TenantSettings settings, Conversation conversation, Lead lead, InboundMessage inbound, CancellationToken ct)
    {
        if (conversation.Mode == ConversationMode.Humana)
            return Decision.Skip("conversa_assumida_pelo_corretor");

        if (conversation.Status == ConversationStatus.Encerrada)
            return Decision.Skip("conversa_encerrada");

        if (!settings.CanUseAi(clock.UtcNow))
        {
            conversation.RequestHumanHandoff(HandoffReason.Nenhum, clock.UtcNow);
            return Decision.Skip("ia_desabilitada_ou_fora_de_janela");
        }

        // Audio/imagem/documento nao passam pelo modelo de texto: vao direto ao corretor.
        if (string.IsNullOrWhiteSpace(inbound.Text))
        {
            conversation.RequestHumanHandoff(HandoffReason.FalhaTecnica, clock.UtcNow);
            return Decision.Skip("mensagem_sem_texto");
        }

        var deterministicHandoff = HandoffDetector.FromLeadMessage(inbound.Text);
        if (deterministicHandoff != HandoffReason.Nenhum)
        {
            conversation.RequestHumanHandoff(deterministicHandoff, clock.UtcNow);
            lead.Temperature = LeadTemperature.Quente;
            return Decision.Skip($"handoff_deterministico:{deterministicHandoff}");
        }

        // Extracao (modelo barato, com cache) alimenta o filtro SQL.
        await extractor.EnrichAsync(lead, inbound.Text, ct);

        var properties = lead.Preference.HasAnything
            ? await catalog.MatchForLeadAsync(lead.Preference, MaxPropertiesInContext, ct)
            : [];

        return Decision.Reply(properties);
    }

    // ---------------------------------------------------------------- menu (sem IA)

    /// <summary>
    /// Retorna true quando o lead escolheu falar com um atendente — nesse caso a conversa
    /// já foi promovida para Automatica e quem chamou deve seguir para o fluxo normal de IA
    /// na mesma requisição, para a primeira resposta não ficar um "ok" vazio.
    /// </summary>
    private async Task<bool> HandleMenuAsync(
        TenantSettings settings, Conversation conversation, Lead lead, InboundMessage inbound, CancellationToken ct)
    {
        var alreadySentSomething = await db.Messages.AnyAsync(
            m => m.ConversationId == conversation.Id && m.Direction == MessageDirection.Outbound, ct);

        if (!alreadySentSomething)
        {
            await SendSystemMessageAsync(settings, conversation, lead, WelcomeMenuText, ct);
            return false;
        }

        var option = MenuOption.Parse(inbound.Text);

        switch (option)
        {
            case 1:
                await SendCatalogLinkAsync(settings, conversation, lead, ct);
                return false;

            case 2:
                conversation.Mode = ConversationMode.Automatica;
                return true;

            default:
                await SendSystemMessageAsync(settings, conversation, lead, RepromptMenuText, ct);
                return false;
        }
    }

    private async Task SendCatalogLinkAsync(
        TenantSettings settings, Conversation conversation, Lead lead, CancellationToken ct)
    {
        var slug = await db.Tenants
            .Where(t => t.Id == tenant.TenantId)
            .Select(t => t.Slug)
            .FirstOrDefaultAsync(ct);

        var text = string.IsNullOrWhiteSpace(slug)
            ? "No momento não consegui gerar o link do catálogo. Digite 2 para falar com um atendente."
            : $"Aqui está: {linkBuilder.CatalogUrl(slug)}\n\n" +
              "Dá pra filtrar por bairro, preço e quantidade de quartos. " +
              "Se quiser, digite 2 a qualquer momento para falar com um atendente.";

        await SendSystemMessageAsync(settings, conversation, lead, text, ct);
    }

    /// <summary>
    /// Envia e persiste uma mensagem determinística (não gerada por IA) — mesmo
    /// esqueleto de envio que a resposta de IA usa, mas Author=Sistema, para o
    /// corretor e o dashboard distinguirem uma coisa da outra.
    /// </summary>
    private async Task SendSystemMessageAsync(
        TenantSettings settings, Conversation conversation, Lead lead, string text, CancellationToken ct)
    {
        var outbound = new Message
        {
            TenantId = tenant.TenantId,
            ConversationId = conversation.Id,
            Direction = MessageDirection.Outbound,
            Author = MessageAuthor.Sistema,
            Content = text,
            SentAtUtc = clock.UtcNow,
            DeliveryStatus = MessageDeliveryStatus.Pendente
        };

        db.Messages.Add(outbound);

        var send = await whatsApp.SendTextAsync(
            new SendTextRequest(settings.EvolutionInstanceName ?? string.Empty, lead.Phone, text), ct);

        if (send.Success)
        {
            outbound.DeliveryStatus = MessageDeliveryStatus.Enviada;
            outbound.ExternalMessageId = send.ExternalMessageId;
            conversation.Status = ConversationStatus.AguardandoCliente;
        }
        else
        {
            outbound.DeliveryStatus = MessageDeliveryStatus.Falhou;
            outbound.FailureReason = send.Error;

            logger.LogError(
                "Falha no envio do menu. ConversationId={ConversationId} Provider=evolution Error={Error}",
                conversation.Id, send.Error);
        }

        conversation.LastMessageAtUtc = clock.UtcNow;
        conversation.LastMessagePreview = Preview(text);
    }

    // ---------------------------------------------------------------- resposta

    private async Task ReplyAsync(
        TenantSettings settings,
        Conversation conversation,
        Lead lead,
        InboundMessage inbound,
        IReadOnlyList<PropertyListItemDto> properties,
        CancellationToken ct)
    {
        var history = await db.Messages
            .Where(m => m.ConversationId == conversation.Id)
            .OrderByDescending(m => m.SentAtUtc)
            .Take(HistoryWindow)
            .AsNoTracking()
            .ToListAsync(ct);

        var catalogBlock = AiPrompts.BuildCatalogBlock(properties);
        var leadBlock = AiPrompts.BuildLeadBlock(lead.Name, DescribePreference(lead.Preference), lead.AiSummary);

        var systemPrompt = string.Join("\n\n",
            AiPrompts.ReplySystemPrompt,
            string.IsNullOrWhiteSpace(settings.AiPersona) ? null : $"<imobiliaria>\n{settings.AiPersona}\n</imobiliaria>",
            leadBlock,
            catalogBlock).Replace("\n\n\n", "\n\n");

        var messages = history
            .OrderBy(m => m.SentAtUtc)
            .Select(m => new AiMessage(m.Direction == MessageDirection.Inbound ? "user" : "assistant", m.Content))
            .ToList();

        // Cache de resposta: mesma pergunta + mesmo catalogo + mesmo estado = mesma resposta.
        // O historico entra no hash, entao conversas diferentes nao compartilham resposta.
        var promptHash = Hashing.Sha256Short(systemPrompt + "|" + string.Join("|", messages.Select(m => m.Content)));
        var cacheKey = CacheKeys.AiReply(tenant.TenantId, promptHash);

        var cachedReply = await cache.GetAsync<string>(cacheKey, ct);
        string replyText;

        if (cachedReply is not null)
        {
            replyText = cachedReply;
            await usage.RecordCacheHitAsync("reply", lead.Id, conversation.Id, ct);
        }
        else
        {
            var result = await ai.CompleteAsync(new AiCompletionRequest(
                SystemPrompt: systemPrompt,
                Messages: messages,
                MaxTokens: 600,
                Temperature: 0.3,
                Tier: AiModelTier.Balanced), ct);

            await usage.RecordAsync("reply", result, lead.Id, conversation.Id, false, ct);

            if (!result.Success || string.IsNullOrWhiteSpace(result.Content))
            {
                logger.LogError(
                    "Falha na IA. ConversationId={ConversationId} Provider=anthropic Error={Error}",
                    conversation.Id, result.Error);

                conversation.RequestHumanHandoff(HandoffReason.FalhaTecnica, clock.UtcNow);
                return;
            }

            replyText = result.Content;
            settings.MonthlyAiMessageCount++;
            await cache.SetAsync(cacheKey, replyText, ReplyCacheTtl, ct);
        }

        var (cleanText, handoffReason) = HandoffDetector.FromAiReply(replyText);

        var outbound = new Message
        {
            TenantId = tenant.TenantId,
            ConversationId = conversation.Id,
            Direction = MessageDirection.Outbound,
            Author = MessageAuthor.Ia,
            Content = cleanText,
            SentAtUtc = clock.UtcNow,
            DeliveryStatus = MessageDeliveryStatus.Pendente
        };

        // Rastreabilidade: fica registrado o que a IA ofereceu a este lead.
        foreach (var mentioned in properties.Where(p => cleanText.Contains(p.Code, StringComparison.OrdinalIgnoreCase)))
            outbound.RelatedProperties.Add(new MessageProperty
            {
                TenantId = tenant.TenantId,
                PropertyId = mentioned.Id
            });

        db.Messages.Add(outbound);

        var send = await whatsApp.SendTextAsync(
            new SendTextRequest(settings.EvolutionInstanceName ?? string.Empty, lead.Phone, cleanText), ct);

        if (send.Success)
        {
            outbound.DeliveryStatus = MessageDeliveryStatus.Enviada;
            outbound.ExternalMessageId = send.ExternalMessageId;
            conversation.Status = ConversationStatus.AguardandoCliente;
        }
        else
        {
            outbound.DeliveryStatus = MessageDeliveryStatus.Falhou;
            outbound.FailureReason = send.Error;
            conversation.RequestHumanHandoff(HandoffReason.FalhaTecnica, clock.UtcNow);

            logger.LogError(
                "Falha no envio. ConversationId={ConversationId} Provider=evolution Error={Error}",
                conversation.Id, send.Error);
        }

        if (handoffReason != HandoffReason.Nenhum)
        {
            conversation.RequestHumanHandoff(handoffReason, clock.UtcNow);
            lead.Temperature = LeadTemperature.Quente;
        }

        conversation.LastMessageAtUtc = clock.UtcNow;
        conversation.LastMessagePreview = Preview(cleanText);

        if (properties.Count > 0 && lead.Status == LeadStatus.EmAtendimento)
            lead.Temperature = LeadTemperature.Morno;

        await cache.RemoveAsync(CacheKeys.DashboardSummary(tenant.TenantId), ct);
    }

    // ---------------------------------------------------------------- suporte

    private async Task<Lead> GetOrCreateLeadAsync(InboundMessage inbound, CancellationToken ct)
    {
        var phone = PhoneNumber.Normalize(inbound.FromPhone);

        var lead = await db.Leads.FirstOrDefaultAsync(l => l.Phone == phone, ct);
        if (lead is not null)
        {
            if (lead.Name == phone && !string.IsNullOrWhiteSpace(inbound.PushName))
                lead.Name = inbound.PushName;
            return lead;
        }

        lead = new Lead
        {
            TenantId = inbound.TenantId,
            Phone = phone,
            Name = string.IsNullOrWhiteSpace(inbound.PushName) ? phone : inbound.PushName,
            Source = LeadSource.WhatsApp,
            Status = LeadStatus.Novo,
            LastContactAtUtc = clock.UtcNow
        };

        db.Leads.Add(lead);
        return lead;
    }

    private async Task<Conversation> GetOrCreateConversationAsync(Lead lead, InboundMessage inbound, CancellationToken ct)
    {
        var conversation = await db.Conversations
            .Where(c => c.LeadId == lead.Id && c.Status != ConversationStatus.Encerrada)
            .OrderByDescending(c => c.LastMessageAtUtc)
            .FirstOrDefaultAsync(ct);

        if (conversation is not null) return conversation;

        conversation = new Conversation
        {
            TenantId = inbound.TenantId,
            LeadId = lead.Id,
            Lead = lead,
            ExternalChatId = inbound.FromPhone,
            Mode = ConversationMode.Menu,
            Status = ConversationStatus.AguardandoCliente
        };

        db.Conversations.Add(conversation);
        return conversation;
    }

    private void StoreInbound(Conversation conversation, InboundMessage inbound)
    {
        db.Messages.Add(new Message
        {
            TenantId = inbound.TenantId,
            ConversationId = conversation.Id,
            Conversation = conversation,
            ExternalMessageId = inbound.ExternalMessageId,
            Direction = MessageDirection.Inbound,
            Author = MessageAuthor.Lead,
            Content = inbound.Text,
            MediaUrl = inbound.MediaUrl,
            MediaType = inbound.MediaType,
            SentAtUtc = inbound.SentAtUtc,
            DeliveryStatus = MessageDeliveryStatus.Entregue
        });

        conversation.LastMessageAtUtc = inbound.SentAtUtc;
        conversation.LastMessagePreview = Preview(inbound.Text);
        conversation.UnreadCount++;
    }

    private static string? DescribePreference(LeadPreference p)
    {
        if (!p.HasAnything) return null;

        var parts = new List<string>();
        if (p.PropertyType is not null) parts.Add(p.PropertyType.ToString()!);
        if (p.Purpose is not null) parts.Add($"para {p.Purpose}");
        if (p.MinBedrooms is not null) parts.Add($"{p.MinBedrooms}+ quartos");
        if (p.MaxPrice is not null) parts.Add($"ate R$ {p.MaxPrice:N0}");
        if (!string.IsNullOrWhiteSpace(p.City)) parts.Add($"em {p.City}");
        if (!string.IsNullOrWhiteSpace(p.Neighborhoods)) parts.Add($"bairros: {p.Neighborhoods.Replace(";", ", ")}");

        return string.Join(", ", parts);
    }

    private static string Preview(string text) =>
        text.Length <= 120 ? text : text[..120] + "...";

    /// <summary>Telefone parcialmente mascarado em log.</summary>
    private static string Mask(string phone) =>
        phone.Length <= 4 ? "****" : string.Concat(phone.AsSpan(0, phone.Length - 4), "****");
}
