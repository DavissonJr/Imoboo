using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ImobooCRM.Application.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace ImobooCRM.Infrastructure.Identity;

public static class AppClaims
{
    /// <summary>O tenant viaja no token e so no token. Nunca em body, query ou header do cliente.</summary>
    public const string TenantId = "tenant_id";
}

public sealed class JwtTokenService(IOptions<JwtOptions> options) : IJwtTokenService
{
    private readonly JwtOptions _options = options.Value;

    public string CreateToken(
        Guid userId, Guid tenantId, string email, string role, bool isPlatformAdmin, out DateTime expiresAtUtc)
    {
        expiresAtUtc = DateTime.UtcNow.AddHours(_options.ExpirationHours);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(JwtRegisteredClaimNames.Email, email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(AppClaims.TenantId, tenantId.ToString()),
            new(ClaimTypes.Role, role)
        };

        // Claim de Role adicional: [Authorize(Roles = "PlatformAdmin")] casa com
        // qualquer uma das claims de Role presentes, sem conflitar com o role do tenant.
        if (isPlatformAdmin) claims.Add(new Claim(ClaimTypes.Role, "PlatformAdmin"));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Secret));

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
