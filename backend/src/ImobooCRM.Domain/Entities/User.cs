using ImobooCRM.Domain.Common;

namespace ImobooCRM.Domain.Entities;

public class User : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public UserRole Role { get; set; } = UserRole.Corretor;
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAtUtc { get; set; }

    /// <summary>
    /// Verdadeiro para contas criadas pelo admin com senha provisória.
    /// A API bloqueia qualquer rota que não seja trocar a senha enquanto isto for verdadeiro.
    /// </summary>
    public bool MustChangePassword { get; set; }

    /// <summary>
    /// Enxerga e administra TODAS as contas da plataforma (cada uma é um tenant
    /// independente — um corretor autônomo com seu próprio WhatsApp e catálogo).
    /// Não tem relação com o Role acima, que só vale dentro do próprio tenant.
    /// </summary>
    public bool IsPlatformAdmin { get; set; }
}

public enum UserRole
{
    Corretor = 1,
    Gestor = 2,
    Admin = 3
}
