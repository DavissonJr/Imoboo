namespace ImobooCRM.Domain.Common;

/// <summary>
/// Toda entidade que carrega dados de um cliente do SaaS implementa esta interface.
/// O DbContext aplica global query filter + preenchimento automatico do TenantId
/// para essas entidades. Nao existe isolamento confiando no frontend.
/// </summary>
public interface ITenantScoped
{
    Guid TenantId { get; set; }
}
