using ImobooCRM.Application.Abstractions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ImobooCRM.Infrastructure.Storage;

/// <summary>
/// Guarda arquivos em disco, dentro de um volume Docker. Organiza por tenant para
/// que um tenant nunca escreva ou apague fisicamente no diretório de outro.
/// </summary>
public sealed class LocalFileStorageService(
    IOptions<LocalFileStorageOptions> options,
    ILogger<LocalFileStorageService> logger) : IFileStorageService
{
    private readonly LocalFileStorageOptions _options = options.Value;

    public async Task<StoredFile> SaveAsync(SaveFileRequest request, CancellationToken ct = default)
    {
        var extension = Path.GetExtension(request.FileName);
        var safeName = $"{Guid.NewGuid():N}{extension}";

        // Chave sempre construída a partir de Guid + extensão: nunca usa o nome
        // enviado pelo cliente como parte do caminho, o que fecha qualquer tentativa
        // de path traversal (../../etc).
        var storageKey = $"{request.TenantId:N}/{request.Folder}/{safeName}";
        var fullPath = Path.Combine(_options.RootPath, request.TenantId.ToString("N"), request.Folder, safeName);

        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await using (var fileStream = File.Create(fullPath))
        {
            await request.Content.CopyToAsync(fileStream, ct);
        }

        var publicUrl = $"{_options.PublicBaseUrl}/{storageKey}";

        logger.LogInformation(
            "Arquivo salvo. TenantId={TenantId} Folder={Folder} SizeBytes={Size}",
            request.TenantId, request.Folder, request.ContentLength);

        return new StoredFile(storageKey, publicUrl);
    }

    public Task DeleteAsync(string storageKey, CancellationToken ct = default)
    {
        var fullPath = Path.Combine(_options.RootPath, storageKey);

        // storageKey e sempre gerado por nos (SaveAsync); ainda assim confirmamos
        // que o caminho resolvido continua dentro do RootPath antes de apagar.
        var normalizedRoot = Path.GetFullPath(_options.RootPath);
        var normalizedTarget = Path.GetFullPath(fullPath);

        if (!normalizedTarget.StartsWith(normalizedRoot, StringComparison.Ordinal))
        {
            logger.LogWarning("Tentativa de exclusao fora do diretorio de uploads bloqueada. Key={Key}", storageKey);
            return Task.CompletedTask;
        }

        try
        {
            if (File.Exists(normalizedTarget)) File.Delete(normalizedTarget);
        }
        catch (IOException ex)
        {
            logger.LogWarning(ex, "Falha ao remover arquivo. Key={Key}", storageKey);
        }

        return Task.CompletedTask;
    }
}
