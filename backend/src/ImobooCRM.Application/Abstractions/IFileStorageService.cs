namespace ImobooCRM.Application.Abstractions;

/// <summary>
/// Contrato de armazenamento de arquivo. Hoje a Infrastructure guarda em disco local
/// (volume Docker); trocar por S3/Azure Blob depois é uma implementação nova aqui,
/// sem tocar em quem pede o upload.
/// </summary>
public interface IFileStorageService
{
    Task<StoredFile> SaveAsync(SaveFileRequest request, CancellationToken ct = default);
    Task DeleteAsync(string storageKey, CancellationToken ct = default);
}

/// <summary>
/// storageKey identifica o arquivo para o provedor (caminho relativo, chave S3 etc.).
/// publicUrl é o que vai para o banco e para o navegador.
/// </summary>
public sealed record SaveFileRequest(
    Guid TenantId,
    string Folder,
    string FileName,
    string ContentType,
    Stream Content,
    long ContentLength);

public sealed record StoredFile(string StorageKey, string PublicUrl);

public static class AllowedImageTypes
{
    private static readonly HashSet<string> ContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp"
    };

    public const long MaxSizeBytes = 8 * 1024 * 1024; // 8 MB por foto

    public static bool IsAllowed(string contentType) => ContentTypes.Contains(contentType);
}
