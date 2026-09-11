using System.Security.Cryptography;
using System.Text;
using ImobooCRM.Application.Abstractions;
using ImobooCRM.Application.Common;
using ImobooCRM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ImobooCRM.Application.PlatformAdmin;

public interface IPlatformAdminService
{
    Task<IReadOnlyList<PlatformAccountDto>> ListAccountsAsync(CancellationToken ct = default);
    Task<CreatedAccountDto> CreateAccountAsync(CreateAccountRequest request, CancellationToken ct = default);
    Task SetAccountActiveAsync(Guid tenantId, bool isActive, CancellationToken ct = default);
    Task<CreatedAccountDto> ResetOwnerPasswordAsync(Guid tenantId, CancellationToken ct = default);
}

/// <summary>
/// Gestão de contas em toda a plataforma — cada conta é um tenant independente,
/// não um usuário dentro do tenant de quem está chamando. Por isso quase todo
/// método aqui usa IgnoreQueryFilters: o objetivo explícito é enxergar através
/// do isolamento normal, não escapar dele por acidente. Só endpoints com
/// [Authorize(Roles = "PlatformAdmin")] chegam neste serviço.
/// </summary>
public sealed class PlatformAdminService(
    IAppDbContext db,
    ITenantContext tenant,
    IPasswordHasher hasher,
    IDateTimeProvider clock) : IPlatformAdminService
{
    private const string PasswordAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    private const int PasswordLength = 12;

    public async Task<IReadOnlyList<PlatformAccountDto>> ListAccountsAsync(CancellationToken ct = default)
    {
        // Tenant não tem query filter (não é ITenantScoped) — é o diretório global por natureza.
        var tenants = await db.Tenants.AsNoTracking().ToListAsync(ct);

        var owners = await db.Users.IgnoreQueryFilters().AsNoTracking()
            .OrderBy(u => u.CreatedAtUtc)
            .ToListAsync(ct);

        var settings = await db.TenantSettings.IgnoreQueryFilters().AsNoTracking().ToListAsync(ct);

        var propertyCounts = await db.Properties.IgnoreQueryFilters()
            .GroupBy(p => p.TenantId)
            .Select(g => new { TenantId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var result = new List<PlatformAccountDto>();

        foreach (var t in tenants)
        {
            // O dono é o primeiro usuário cadastrado no tenant — hoje cada conta tem só um.
            var owner = owners.FirstOrDefault(u => u.TenantId == t.Id);
            if (owner is null) continue;

            var s = settings.FirstOrDefault(x => x.TenantId == t.Id);
            var propCount = propertyCounts.FirstOrDefault(x => x.TenantId == t.Id)?.Count ?? 0;

            result.Add(new PlatformAccountDto(
                t.Id, t.Name, t.IsActive,
                owner.Id, owner.Name, owner.Email, owner.MustChangePassword,
                s?.WhatsAppConnected ?? false, s?.WhatsAppNumber,
                propCount, owner.LastLoginAtUtc, t.CreatedAtUtc));
        }

        return result.OrderByDescending(a => a.CreatedAtUtc).ToList();
    }

    /// <summary>
    /// Cria um tenant novo com seu dono — uma conta independente do zero, com
    /// catálogo e WhatsApp próprios. O dono configura o WhatsApp sozinho depois,
    /// no primeiro acesso ou na área de Perfil.
    /// </summary>
    public async Task<CreatedAccountDto> CreateAccountAsync(CreateAccountRequest request, CancellationToken ct = default)
    {
        var tenantName = request.TenantName.Trim();
        var ownerName = request.OwnerName.Trim();
        var email = request.OwnerEmail.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(tenantName))
            throw new ValidationAppException("Informe o nome do negócio.");

        if (string.IsNullOrWhiteSpace(ownerName))
            throw new ValidationAppException("Informe o nome do corretor.");

        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            throw new ValidationAppException("Informe um e-mail válido.");

        var emailTaken = await db.Users.IgnoreQueryFilters().AnyAsync(u => u.Email == email, ct);
        if (emailTaken)
            throw new ValidationAppException("Já existe uma conta com este e-mail.");

        var newTenantId = Guid.NewGuid();
        var initialPassword = GenerateInitialPassword();

        // Muda o contexto de tenant da requisição para o tenant recém-criado: é o mesmo
        // mecanismo que o processamento de webhook usa. Sem isso, o guard de gravação
        // cruzada no SaveChanges bloquearia a escrita (o tenant do token é outro).
        tenant.SetTenant(newTenantId);

        db.Tenants.Add(new Tenant
        {
            Id = newTenantId,
            Name = tenantName,
            Slug = SlugFrom(tenantName, newTenantId),
            IsActive = true
        });

        db.TenantSettings.Add(new TenantSettings
        {
            TenantId = newTenantId,
            AiEnabled = true
        });

        var owner = new User
        {
            TenantId = newTenantId,
            Name = ownerName,
            Email = email,
            Role = UserRole.Admin, // administra a própria conta; não é PlatformAdmin
            PasswordHash = hasher.Hash(initialPassword),
            MustChangePassword = true,
            IsActive = true
        };

        db.Users.Add(owner);
        await db.SaveChangesAsync(ct);

        return new CreatedAccountDto(newTenantId, owner.Id, owner.Email, initialPassword);
    }

    public async Task SetAccountActiveAsync(Guid tenantId, bool isActive, CancellationToken ct = default)
    {
        var t = await db.Tenants.FirstOrDefaultAsync(x => x.Id == tenantId, ct)
            ?? throw new NotFoundException("Conta");

        t.IsActive = isActive;
        t.UpdatedAtUtc = clock.UtcNow;
        await db.SaveChangesAsync(ct);
    }

    public async Task<CreatedAccountDto> ResetOwnerPasswordAsync(Guid tenantId, CancellationToken ct = default)
    {
        var owner = await db.Users.IgnoreQueryFilters()
            .Where(u => u.TenantId == tenantId)
            .OrderBy(u => u.CreatedAtUtc)
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Conta");

        var initialPassword = GenerateInitialPassword();
        owner.PasswordHash = hasher.Hash(initialPassword);
        owner.MustChangePassword = true;
        owner.UpdatedAtUtc = clock.UtcNow;

        // Mesmo motivo do CreateAccountAsync: o owner pertence a outro tenant,
        // diferente do tenant do token do admin de plataforma.
        tenant.SetTenant(tenantId);
        await db.SaveChangesAsync(ct);

        return new CreatedAccountDto(tenantId, owner.Id, owner.Email, initialPassword);
    }

    private static string GenerateInitialPassword()
    {
        var bytes = RandomNumberGenerator.GetBytes(PasswordLength);
        var builder = new StringBuilder(PasswordLength);
        foreach (var b in bytes) builder.Append(PasswordAlphabet[b % PasswordAlphabet.Length]);
        return builder.ToString();
    }

    private static string SlugFrom(string name, Guid fallbackSuffix)
    {
        var normalized = name.Trim().ToLowerInvariant();
        var chars = normalized.Select(c => char.IsLetterOrDigit(c) ? c : '-').ToArray();
        var slug = new string(chars).Trim('-');
        while (slug.Contains("--")) slug = slug.Replace("--", "-");

        // Sufixo curto do Guid: evita colisão entre dois negócios com nome parecido.
        return string.IsNullOrWhiteSpace(slug)
            ? fallbackSuffix.ToString("N")[..8]
            : $"{slug}-{fallbackSuffix.ToString("N")[..6]}";
    }
}
