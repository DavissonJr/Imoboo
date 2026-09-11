using ImobooCRM.Application.Abstractions;
using ImobooCRM.Domain.Entities;

namespace ImobooCRM.Application.Ai;

public interface IAiUsageRecorder
{
    Task RecordAsync(string operation, AiCompletionResult result, Guid? leadId, Guid? conversationId,
        bool fromCache, CancellationToken ct = default);

    Task RecordCacheHitAsync(string operation, Guid? leadId, Guid? conversationId, CancellationToken ct = default);
}

/// <summary>
/// Grava consumo de IA. Sem prompt, sem conteudo do lead: apenas metadados e tokens.
/// </summary>
public sealed class AiUsageRecorder(IAppDbContext db, ITenantContext tenant) : IAiUsageRecorder
{
    public Task RecordAsync(string operation, AiCompletionResult result, Guid? leadId,
        Guid? conversationId, bool fromCache, CancellationToken ct = default)
    {
        db.AiUsageLogs.Add(new AiUsageLog
        {
            TenantId = tenant.TenantId,
            Operation = operation,
            Model = result.Model,
            InputTokens = result.InputTokens,
            OutputTokens = result.OutputTokens,
            LeadId = leadId,
            ConversationId = conversationId,
            FromCache = fromCache,
            Success = result.Success,
            ErrorCode = result.Success ? null : "provider_error"
        });

        return Task.CompletedTask; // persistido no SaveChanges do pipeline
    }

    public Task RecordCacheHitAsync(string operation, Guid? leadId, Guid? conversationId,
        CancellationToken ct = default)
    {
        db.AiUsageLogs.Add(new AiUsageLog
        {
            TenantId = tenant.TenantId,
            Operation = operation,
            Model = "cache",
            LeadId = leadId,
            ConversationId = conversationId,
            FromCache = true,
            Success = true
        });

        return Task.CompletedTask;
    }
}
