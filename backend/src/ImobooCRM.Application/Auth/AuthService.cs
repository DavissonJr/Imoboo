using ImobooCRM.Application.Abstractions;
using ImobooCRM.Application.Common;
using Microsoft.EntityFrameworkCore;

namespace ImobooCRM.Application.Auth;

public sealed record LoginRequest(string Email, string Password);

public sealed record LoginResponse(
    string Token,
    DateTime ExpiresAtUtc,
    Guid UserId,
    Guid TenantId,
    string Name,
    string Email,
    string Role,
    string TenantName);

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
}

public sealed class AuthService(
    IAppDbContext db,
    IPasswordHasher hasher,
    IJwtTokenService jwt,
    IDateTimeProvider clock) : IAuthService
{
    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        // IgnoreQueryFilters: no login ainda nao existe tenant no contexto.
        var user = await db.Users
            .IgnoreQueryFilters()
            .Include(u => u.Tenant)
            .FirstOrDefaultAsync(u => u.Email == email && u.IsActive, ct);

        // Mensagem generica de proposito: nao revela se o e-mail existe.
        if (user is null || !hasher.Verify(request.Password, user.PasswordHash))
            throw new AppException("E-mail ou senha invalidos.", "invalid_credentials", 401);

        if (user.Tenant is null || !user.Tenant.IsActive)
            throw new ForbiddenException("Conta inativa. Fale com o administrador.");

        var token = jwt.CreateToken(user.Id, user.TenantId, user.Email, user.Role.ToString(), out var expiresAt);

        user.LastLoginAtUtc = clock.UtcNow;
        await db.SaveChangesAsync(ct);

        return new LoginResponse(token, expiresAt, user.Id, user.TenantId,
            user.Name, user.Email, user.Role.ToString(), user.Tenant.Name);
    }
}
