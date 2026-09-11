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
