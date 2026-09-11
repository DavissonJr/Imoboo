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
    string TenantName,
    bool MustChangePassword,
    bool IsPlatformAdmin);

public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task ChangeOwnPasswordAsync(ChangePasswordRequest request, CancellationToken ct = default);
}

public sealed class AuthService(
    IAppDbContext db,
    ITenantContext tenant,
    IPasswordHasher hasher,
    IJwtTokenService jwt,
    IDateTimeProvider clock) : IAuthService
{
    private const int MinPasswordLength = 8;

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

        var token = jwt.CreateToken(
            user.Id, user.TenantId, user.Email, user.Role.ToString(), user.IsPlatformAdmin, out var expiresAt);

        user.LastLoginAtUtc = clock.UtcNow;
        await db.SaveChangesAsync(ct);

        return new LoginResponse(token, expiresAt, user.Id, user.TenantId,
            user.Name, user.Email, user.Role.ToString(), user.Tenant.Name,
            user.MustChangePassword, user.IsPlatformAdmin);
    }

    /// <summary>
    /// Troca de senha do proprio usuario logado. Serve tanto para o uso normal quanto
    /// para o primeiro acesso com senha provisoria — nos dois casos a senha atual
    /// precisa ser confirmada, mesmo que ela tenha sido gerada pelo admin.
    /// </summary>
    public async Task ChangeOwnPasswordAsync(ChangePasswordRequest request, CancellationToken ct = default)
    {
        if (!tenant.HasTenant || tenant.UserId is null)
            throw new ForbiddenException();

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == tenant.UserId, ct)
            ?? throw new NotFoundException("Usuario");

        if (!hasher.Verify(request.CurrentPassword, user.PasswordHash))
            throw new ValidationAppException("Senha atual incorreta.");

        if (request.NewPassword.Length < MinPasswordLength)
            throw new ValidationAppException($"A nova senha deve ter pelo menos {MinPasswordLength} caracteres.");

        if (request.NewPassword == request.CurrentPassword)
            throw new ValidationAppException("A nova senha deve ser diferente da atual.");

        user.PasswordHash = hasher.Hash(request.NewPassword);
        user.MustChangePassword = false;
        user.UpdatedAtUtc = clock.UtcNow;

        await db.SaveChangesAsync(ct);
    }
}
