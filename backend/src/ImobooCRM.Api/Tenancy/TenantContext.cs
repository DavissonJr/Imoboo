using System.Security.Claims;
using ImobooCRM.Application.Abstractions;
using ImobooCRM.Infrastructure.Identity;

namespace ImobooCRM.Api.Tenancy;

/// <summary>
/// Resolve o tenant a partir das claims do token. Scoped por requisicao.
/// Em webhooks e workers nao ha usuario: o tenant e definido via SetTenant
/// apos ser resolvido pela instancia da Evolution.
/// </summary>
public sealed class TenantContext : ITenantContext
{
    private Guid _tenantId;
    private Guid? _userId;

    public TenantContext(IHttpContextAccessor accessor)
    {
        var user = accessor.HttpContext?.User;
        if (user?.Identity?.IsAuthenticated != true) return;

        if (Guid.TryParse(user.FindFirstValue(AppClaims.TenantId), out var tenantId))
            _tenantId = tenantId;

        if (Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier)
                          ?? user.FindFirstValue("sub"), out var userId))
            _userId = userId;
    }

    public Guid TenantId => _tenantId;
    public Guid? UserId => _userId;
    public bool HasTenant => _tenantId != Guid.Empty;

    public void SetTenant(Guid tenantId, Guid? userId = null)
    {
        _tenantId = tenantId;
        _userId ??= userId;
    }
}
