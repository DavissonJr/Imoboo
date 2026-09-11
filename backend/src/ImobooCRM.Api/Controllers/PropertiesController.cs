using ImobooCRM.Application.Common;
using ImobooCRM.Application.Properties;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ImobooCRM.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/properties")]
public sealed class PropertiesController(
    IPropertySearchService search,
    IPropertyWriteService write,
    IPropertyPhotoService photos) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<PropertyListItemDto>>> List(
        [FromQuery] PropertySearchFilter filter, CancellationToken ct)
        => Ok(await search.SearchAsync(filter, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PropertyDetailDto>> Get(Guid id, CancellationToken ct)
        => Ok(await search.GetByIdAsync(id, ct));

    [HttpPost]
    public async Task<IActionResult> Create(UpsertPropertyRequest request, CancellationToken ct)
    {
        var id = await write.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id }, new { id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpsertPropertyRequest request, CancellationToken ct)
    {
        await write.UpdateAsync(id, request, ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await write.DeleteAsync(id, ct);
        return NoContent();
    }

    /// <summary>Upload de uma foto. multipart/form-data com o campo "file".</summary>
    [HttpPost("{id:guid}/photos")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<PropertyPhotoDto>> AddPhoto(
        Guid id, IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            throw new ValidationAppException("Nenhum arquivo enviado.");

        await using var stream = file.OpenReadStream();

        var photo = await photos.AddAsync(id,
            new UploadPhotoRequest(file.FileName, file.ContentType, file.Length, stream), ct);

        return Ok(photo);
    }

    [HttpDelete("{id:guid}/photos/{photoId:guid}")]
    public async Task<IActionResult> RemovePhoto(Guid id, Guid photoId, CancellationToken ct)
    {
        await photos.RemoveAsync(id, photoId, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/photos/{photoId:guid}/cover")]
    public async Task<IActionResult> SetCoverPhoto(Guid id, Guid photoId, CancellationToken ct)
    {
        await photos.SetCoverAsync(id, photoId, ct);
        return NoContent();
    }

    [HttpPut("{id:guid}/photos/order")]
    public async Task<IActionResult> ReorderPhotos(Guid id, [FromBody] List<Guid> orderedPhotoIds, CancellationToken ct)
    {
        await photos.ReorderAsync(id, orderedPhotoIds, ct);
        return NoContent();
    }
}

