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

    /// <summary>
    /// Pede à Evolution o QR code para parear o número. O resultado sempre vem com
    /// motivo do erro quando falha — quem chama decide como exibir (a Application
    /// checa IsInstanceConnectedAsync antes de chegar aqui).
    /// </summary>
    Task<QrCodeResult> GetQrCodeAsync(string instanceName, CancellationToken ct = default);

    /// <summary>
    /// Diz à Evolution para onde mandar as mensagens que chegam. Sem isso, a
    /// instância existe e conecta normalmente, mas nunca avisa o sistema —
    /// o corretor recebe no celular e o CRM nunca fica sabendo.
    /// </summary>
    Task<bool> SetWebhookAsync(string instanceName, string webhookUrl, CancellationToken ct = default);
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

/// <summary>Motivo do erro vai até a tela do admin — sem isso, a única pista fica presa no log do container.</summary>
public sealed record QrCodeResult(string? Base64, string? Error)
{
    public static QrCodeResult Ok(string base64) => new(base64, null);
    public static QrCodeResult Fail(string error) => new(null, error);
}
