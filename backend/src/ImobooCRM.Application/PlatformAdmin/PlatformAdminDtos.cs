namespace ImobooCRM.Application.PlatformAdmin;

/// <summary>
/// Uma "conta" aqui é um tenant inteiro — um corretor autônomo com seu próprio
/// WhatsApp e catálogo, isolado dos demais. Não é um usuário dentro do tenant
/// de quem está olhando; é um negócio à parte.
/// </summary>
public sealed record PlatformAccountDto(
    Guid TenantId,
    string TenantName,
    bool TenantIsActive,
    Guid OwnerUserId,
    string OwnerName,
    string OwnerEmail,
    bool MustChangePassword,
    bool WhatsAppConnected,
    string? WhatsAppNumber,
    int PropertiesCount,
    DateTime? LastLoginAtUtc,
    DateTime CreatedAtUtc);

public sealed record CreateAccountRequest(string TenantName, string OwnerName, string OwnerEmail);

/// <summary>Devolvida uma única vez, na resposta do cadastro — a senha não fica recuperável depois.</summary>
public sealed record CreatedAccountDto(Guid TenantId, Guid OwnerUserId, string OwnerEmail, string InitialPassword);
