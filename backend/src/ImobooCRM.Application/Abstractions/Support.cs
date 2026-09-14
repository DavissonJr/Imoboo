namespace ImobooCRM.Application.Abstractions;

public interface IDateTimeProvider
{
    DateTime UtcNow { get; }
}

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string hash);
}

public interface IJwtTokenService
{
    string CreateToken(
        Guid userId, Guid tenantId, string email, string role, bool isPlatformAdmin, out DateTime expiresAtUtc);
}

/// <summary>
/// Monta URLs públicas (ex.: catálogo) sem a Application saber de onde vem o domínio —
/// isso é configuração, mora na Infrastructure.
/// </summary>
public interface IPublicLinkBuilder
{
    string CatalogUrl(string tenantSlug);
}
