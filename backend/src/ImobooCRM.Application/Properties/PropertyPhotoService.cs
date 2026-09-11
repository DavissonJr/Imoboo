using ImobooCRM.Application.Abstractions;
using ImobooCRM.Application.Common;
using ImobooCRM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ImobooCRM.Application.Properties;

public interface IPropertyPhotoService
{
    Task<PropertyPhotoDto> AddAsync(Guid propertyId, UploadPhotoRequest request, CancellationToken ct = default);
    Task RemoveAsync(Guid propertyId, Guid photoId, CancellationToken ct = default);
    Task SetCoverAsync(Guid propertyId, Guid photoId, CancellationToken ct = default);
    Task ReorderAsync(Guid propertyId, IReadOnlyList<Guid> orderedPhotoIds, CancellationToken ct = default);
}

public sealed record UploadPhotoRequest(string FileName, string ContentType, long ContentLength, Stream Content);

/// <summary>
/// Fica separado do PropertyWriteService de propósito: escrever os dados do imóvel
/// e gerenciar o arquivo binário da foto são operações com falhas e regras diferentes
/// (validação de tipo/tamanho, storage externo) — misturar tudo em um serviço só
/// dificultaria testar cada parte isoladamente.
/// </summary>
public sealed class PropertyPhotoService(
    IAppDbContext db,
    IFileStorageService storage,
    ICacheService cache,
    ITenantContext tenant) : IPropertyPhotoService
{
    private const int MaxPhotosPerProperty = 20;

    public async Task<PropertyPhotoDto> AddAsync(
        Guid propertyId, UploadPhotoRequest request, CancellationToken ct = default)
    {
        if (!AllowedImageTypes.IsAllowed(request.ContentType))
            throw new ValidationAppException("Formato de imagem não aceito. Use JPEG, PNG ou WebP.");

        if (request.ContentLength <= 0 || request.ContentLength > AllowedImageTypes.MaxSizeBytes)
            throw new ValidationAppException("A imagem deve ter no máximo 8 MB.");

        var property = await db.Properties
            .Include(p => p.Photos)
            .FirstOrDefaultAsync(p => p.Id == propertyId, ct)
            ?? throw new NotFoundException("Imóvel");

        if (property.Photos.Count >= MaxPhotosPerProperty)
            throw new ValidationAppException($"Limite de {MaxPhotosPerProperty} fotos por imóvel atingido.");

        var stored = await storage.SaveAsync(
            new SaveFileRequest(tenant.TenantId, $"properties/{propertyId:N}",
                request.FileName, request.ContentType, request.Content, request.ContentLength),
            ct);

        var isFirstPhoto = property.Photos.Count == 0;

        var photo = new PropertyPhoto
        {
            TenantId = tenant.TenantId,
            PropertyId = propertyId,
            Url = stored.PublicUrl,
            SortOrder = property.Photos.Count,
            IsCover = isFirstPhoto
        };

        db.PropertyPhotos.Add(photo);
        await db.SaveChangesAsync(ct);
        await InvalidateCatalogCache(ct);

        return new PropertyPhotoDto(photo.Id, photo.Url, photo.Caption, photo.IsCover, photo.SortOrder);
    }

    public async Task RemoveAsync(Guid propertyId, Guid photoId, CancellationToken ct = default)
    {
        var photo = await db.PropertyPhotos
            .FirstOrDefaultAsync(p => p.Id == photoId && p.PropertyId == propertyId, ct)
            ?? throw new NotFoundException("Foto");

        var wasCover = photo.IsCover;
        var storageKey = ExtractStorageKey(photo.Url);

        db.PropertyPhotos.Remove(photo);
        await db.SaveChangesAsync(ct);

        // Se a removida era a capa, promove a próxima na ordem — nunca deixa
        // o imóvel sem capa enquanto tiver ao menos uma foto.
        if (wasCover)
        {
            var next = await db.PropertyPhotos
                .Where(p => p.PropertyId == propertyId)
                .OrderBy(p => p.SortOrder)
                .FirstOrDefaultAsync(ct);

            if (next is not null)
            {
                next.IsCover = true;
                await db.SaveChangesAsync(ct);
            }
        }

        if (storageKey is not null)
            await storage.DeleteAsync(storageKey, ct);

        await InvalidateCatalogCache(ct);
    }

    public async Task SetCoverAsync(Guid propertyId, Guid photoId, CancellationToken ct = default)
    {
        var photos = await db.PropertyPhotos
            .Where(p => p.PropertyId == propertyId)
            .ToListAsync(ct);

        if (photos.Count == 0) throw new NotFoundException("Foto");
        if (photos.All(p => p.Id != photoId)) throw new NotFoundException("Foto");

        foreach (var photo in photos)
            photo.IsCover = photo.Id == photoId;

        await db.SaveChangesAsync(ct);
        await InvalidateCatalogCache(ct);
    }

    public async Task ReorderAsync(Guid propertyId, IReadOnlyList<Guid> orderedPhotoIds, CancellationToken ct = default)
    {
        var photos = await db.PropertyPhotos
            .Where(p => p.PropertyId == propertyId)
            .ToListAsync(ct);

        var byId = photos.ToDictionary(p => p.Id);

        for (var i = 0; i < orderedPhotoIds.Count; i++)
        {
            if (byId.TryGetValue(orderedPhotoIds[i], out var photo))
                photo.SortOrder = i;
        }

        await db.SaveChangesAsync(ct);
        await InvalidateCatalogCache(ct);
    }

    private static string? ExtractStorageKey(string publicUrl)
    {
        const string marker = "/uploads/";
        var index = publicUrl.IndexOf(marker, StringComparison.Ordinal);
        return index < 0 ? null : publicUrl[(index + marker.Length)..];
    }

    private Task InvalidateCatalogCache(CancellationToken ct) =>
        cache.RemoveByPrefixAsync(CacheKeys.PropertySearchPrefix(tenant.TenantId), ct);
}
