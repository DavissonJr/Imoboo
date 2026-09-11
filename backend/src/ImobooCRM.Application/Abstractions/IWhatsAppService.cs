namespace ImobooCRM.Application.Abstractions;

/// <summary>
/// Contrato de canal WhatsApp. A Application nao sabe que existe Evolution API.
/// Trocar por API oficial = nova implementacao na Infrastructure, nada muda aqui.
/// </summary>
public interface IWhatsAppService
{
    Task<SendMessageResult> SendTextAsync(SendTextRequest request, CancellationToken ct = default);
    Task<SendMessageResult> SendMediaAsync(SendMediaRequest request, CancellationToken ct = default);
    Task<bool> IsInstanceConnectedAsync(string instanceName, CancellationToken ct = default);
}

public sealed record SendTextRequest(string InstanceName, string ToPhone, string Text);

public sealed record SendMediaRequest(
    string InstanceName,
    string ToPhone,
    string MediaUrl,
    string MediaType,
    string? Caption);

public sealed record SendMessageResult(bool Success, string? ExternalMessageId, string? Error)
{
    public static SendMessageResult Ok(string? id) => new(true, id, null);
    public static SendMessageResult Fail(string error) => new(false, null, error);
}
