namespace ImobooCRM.Application.Settings;

public sealed record TenantSettingsDto(
    string? AiPersona,
    string? EvolutionInstanceName,
    bool WhatsAppConnected,
    string? WhatsAppNumber,
    int MonthlyAiMessageLimit,
    int MonthlyAiMessageCount);

public sealed record UpdateTenantSettingsRequest(string? AiPersona, string? EvolutionInstanceName);

public sealed record WhatsAppQrCodeDto(string? Base64Image, bool AlreadyConnected);
