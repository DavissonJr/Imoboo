namespace ImobooCRM.Application.Abstractions;

/// <summary>
/// Toda chave nasce com o tenant no prefixo. Nao existe chave global de dados
/// de cliente: e assim que se evita vazamento entre tenants no Redis.
/// </summary>
public static class CacheKeys
{
    private static string Root(Guid tenantId) => $"tenant:{tenantId}";

    public static string PropertySearch(Guid tenantId, string filterHash)
        => $"{Root(tenantId)}:properties:search:{filterHash}";

    public static string PropertySearchPrefix(Guid tenantId)
        => $"{Root(tenantId)}:properties:search:";

    public static string PropertyById(Guid tenantId, Guid propertyId)
        => $"{Root(tenantId)}:properties:item:{propertyId}";

    /// <summary>Resposta da IA reaproveitavel: mesma pergunta + mesmo conjunto de imoveis.</summary>
    public static string AiReply(Guid tenantId, string promptHash)
        => $"{Root(tenantId)}:ai:reply:{promptHash}";

    public static string AiExtraction(Guid tenantId, string textHash)
        => $"{Root(tenantId)}:ai:extract:{textHash}";

    public static string ConversationState(Guid tenantId, Guid conversationId)
        => $"{Root(tenantId)}:conversation:{conversationId}:state";

    public static string ConversationLock(Guid tenantId, Guid conversationId)
        => $"{Root(tenantId)}:conversation:{conversationId}:lock";

    public static string DashboardSummary(Guid tenantId)
        => $"{Root(tenantId)}:dashboard:summary";

    /// <summary>Resolucao instancia Evolution -> tenant. Sem dado de cliente, so roteamento.</summary>
    public static string InstanceTenant(string instanceName)
        => $"routing:evolution:instance:{instanceName}";

    public static string AllTenantData(Guid tenantId) => $"{Root(tenantId)}:";
}
