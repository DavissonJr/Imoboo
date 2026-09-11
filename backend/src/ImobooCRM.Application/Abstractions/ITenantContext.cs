namespace ImobooCRM.Application.Abstractions;

/// <summary>
/// Tenant da requisicao atual, resolvido a partir do token (nunca do body/query).
/// </summary>
public interface ITenantContext
{
    Guid TenantId { get; }
    Guid? UserId { get; }
    bool HasTenant { get; }

    /// <summary>
    /// Define o tenant fora do pipeline HTTP: webhooks e workers em background,
    /// onde o tenant vem da instancia da Evolution e nao de um usuario logado.
    /// </summary>
    void SetTenant(Guid tenantId, Guid? userId = null);
}
