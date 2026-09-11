using System.Security.Cryptography;
using System.Text;
using ImobooCRM.Application.Abstractions;
using ImobooCRM.Application.Common;
using ImobooCRM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ImobooCRM.Application.Users;

public interface IUserService
{
    Task<IReadOnlyList<UserListItemDto>> ListAsync(CancellationToken ct = default);
    Task<CreatedUserDto> CreateAsync(CreateUserRequest request, CancellationToken ct = default);
    Task UpdateAsync(Guid id, UpdateUserRequest request, CancellationToken ct = default);
    Task<CreatedUserDto> ResetPasswordAsync(Guid id, CancellationToken ct = default);
}

/// <summary>
/// Gestão de corretores dentro do tenant. Toda operação aqui é restrita a Admin
/// na camada de API — este serviço assume que quem chamou já foi autorizado.
/// </summary>
public sealed class UserService(
    IAppDbContext db,
    ITenantContext tenant,
    IPasswordHasher hasher,
    IDateTimeProvider clock) : IUserService
{
    // Sem caracteres ambíguos (0/O, 1/l/I) — a senha provisória é lida e digitada
    // por uma pessoa, então precisa ser fácil de transcrever sem erro.
    private const string PasswordAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    private const int PasswordLength = 12;

    public async Task<IReadOnlyList<UserListItemDto>> ListAsync(CancellationToken ct = default) =>
        await db.Users
            .OrderBy(u => u.Name)
            .AsNoTracking()
            .Select(u => new UserListItemDto(
                u.Id, u.Name, u.Email, u.Role, u.IsActive, u.MustChangePassword,
                u.LastLoginAtUtc, u.CreatedAtUtc))
            .ToListAsync(ct);

    public async Task<CreatedUserDto> CreateAsync(CreateUserRequest request, CancellationToken ct = default)
    {
        var name = request.Name.Trim();
        var email = request.Email.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(name))
            throw new ValidationAppException("Informe o nome do corretor.");

        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            throw new ValidationAppException("Informe um e-mail válido.");

        // E-mail é a chave de login em toda a plataforma, não só neste tenant —
        // por isso a checagem ignora o filtro de tenant, igual ao login.
        var taken = await db.Users.IgnoreQueryFilters().AnyAsync(u => u.Email == email, ct);
        if (taken)
            throw new ValidationAppException("Já existe uma conta com este e-mail.");

        var initialPassword = GenerateInitialPassword();

        var user = new User
        {
            TenantId = tenant.TenantId,
            Name = name,
            Email = email,
            Role = request.Role,
            PasswordHash = hasher.Hash(initialPassword),
            MustChangePassword = true,
            IsActive = true
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        return new CreatedUserDto(user.Id, user.Name, user.Email, initialPassword);
    }

    public async Task UpdateAsync(Guid id, UpdateUserRequest request, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct)
            ?? throw new NotFoundException("Corretor");

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ValidationAppException("Informe o nome do corretor.");

        // Impede o admin de se autodesativar por engano e travar o próprio acesso.
        if (!request.IsActive && id == tenant.UserId)
            throw new ValidationAppException("Você não pode desativar a própria conta.");

        user.Name = request.Name.Trim();
        user.Role = request.Role;
        user.IsActive = request.IsActive;
        user.UpdatedAtUtc = clock.UtcNow;

        await db.SaveChangesAsync(ct);
    }

    /// <summary>Gera uma nova senha provisória e força a troca no próximo login.</summary>
    public async Task<CreatedUserDto> ResetPasswordAsync(Guid id, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct)
            ?? throw new NotFoundException("Corretor");

        var initialPassword = GenerateInitialPassword();
        user.PasswordHash = hasher.Hash(initialPassword);
        user.MustChangePassword = true;
        user.UpdatedAtUtc = clock.UtcNow;

        await db.SaveChangesAsync(ct);

        return new CreatedUserDto(user.Id, user.Name, user.Email, initialPassword);
    }

    private static string GenerateInitialPassword()
    {
        var bytes = RandomNumberGenerator.GetBytes(PasswordLength);
        var builder = new StringBuilder(PasswordLength);

        foreach (var b in bytes)
            builder.Append(PasswordAlphabet[b % PasswordAlphabet.Length]);

        return builder.ToString();
    }
}
