using System.Text.Json;
using System.Text.Json.Serialization;
using ImobooCRM.Application.Abstractions;
using ImobooCRM.Application.Common;
using ImobooCRM.Domain.Entities;
using ImobooCRM.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace ImobooCRM.Application.Ai;

public interface ILeadPreferenceExtractor
{
    Task<bool> EnrichAsync(Lead lead, string message, CancellationToken ct = default);
}

/// <summary>
/// Extrai preferencias da mensagem. Roda no modelo barato, com cache por hash do texto:
/// "apartamento 2 quartos ate 300 mil" chega centenas de vezes por mes.
/// </summary>
public sealed class LeadPreferenceExtractor(
    IAiChatService ai,
    ICacheService cache,
    ITenantContext tenant,
    IAiUsageRecorder usage,
    ILogger<LeadPreferenceExtractor> logger) : ILeadPreferenceExtractor
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromDays(7);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = JsonNumberHandling.AllowReadingFromString
    };

    public async Task<bool> EnrichAsync(Lead lead, string message, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(message) || message.Length < 8) return false;

        var normalized = message.Trim().ToLowerInvariant();
        var cacheKey = CacheKeys.AiExtraction(tenant.TenantId, Hashing.Sha256Short(normalized));

        var extracted = await cache.GetAsync<ExtractedPreference>(cacheKey, ct);
        var fromCache = extracted is not null;

        if (extracted is null)
        {
            var result = await ai.CompleteAsync(new AiCompletionRequest(
                SystemPrompt: AiPrompts.ExtractionSystemPrompt,
                Messages: [new AiMessage("user", message)],
                MaxTokens: 300,
                Temperature: 0,
                Tier: AiModelTier.Fast,
                JsonOutput: true), ct);

            await usage.RecordAsync("extract", result, lead.Id, null, false, ct);

            if (!result.Success) return false;

            extracted = TryParse(result.Content);
            if (extracted is null)
            {
                logger.LogWarning("Extracao retornou JSON invalido. LeadId={LeadId}", lead.Id);
                return false;
            }

            await cache.SetAsync(cacheKey, extracted, CacheTtl, ct);
        }
        else
        {
            await usage.RecordCacheHitAsync("extract", lead.Id, null, ct);
        }

        return Merge(lead.Preference, extracted);
    }

    private static ExtractedPreference? TryParse(string content)
    {
        try
        {
            var json = content.Trim();
            var start = json.IndexOf('{');
            var end = json.LastIndexOf('}');
            if (start < 0 || end <= start) return null;

            return JsonSerializer.Deserialize<ExtractedPreference>(json[start..(end + 1)], JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>
    /// Merge aditivo: o que o cliente disse agora sobrescreve, o que ele nao disse permanece.
    /// Retorna true se algo mudou (evita UPDATE desnecessario).
    /// </summary>
    private static bool Merge(LeadPreference target, ExtractedPreference source)
    {
        var changed = false;

        if (MapPurpose(source.Purpose) is { } purpose && target.Purpose != purpose)
        { target.Purpose = purpose; changed = true; }

        if (MapType(source.PropertyType) is { } type && target.PropertyType != type)
        { target.PropertyType = type; changed = true; }

        if (source.MinPrice is > 0 && target.MinPrice != source.MinPrice)
        { target.MinPrice = source.MinPrice; changed = true; }

        if (source.MaxPrice is > 0 && target.MaxPrice != source.MaxPrice)
        { target.MaxPrice = source.MaxPrice; changed = true; }

        if (source.MinBedrooms is > 0 && target.MinBedrooms != source.MinBedrooms)
        { target.MinBedrooms = source.MinBedrooms; changed = true; }

        if (source.MinBathrooms is > 0 && target.MinBathrooms != source.MinBathrooms)
        { target.MinBathrooms = source.MinBathrooms; changed = true; }

        if (source.MinParkingSpots is > 0 && target.MinParkingSpots != source.MinParkingSpots)
        { target.MinParkingSpots = source.MinParkingSpots; changed = true; }

        if (source.MinArea is > 0 && target.MinArea != source.MinArea)
        { target.MinArea = source.MinArea; changed = true; }

        if (!string.IsNullOrWhiteSpace(source.City) && target.City != source.City)
        { target.City = source.City.Trim(); changed = true; }

        if (source.Neighborhoods is { Length: > 0 })
        {
            var joined = string.Join(";", source.Neighborhoods.Select(n => n.Trim()).Where(n => n.Length > 0));
            if (!string.IsNullOrWhiteSpace(joined) && target.Neighborhoods != joined)
            { target.Neighborhoods = joined; changed = true; }
        }

        if (source.NeedsFinancing is not null && target.NeedsFinancing != source.NeedsFinancing)
        { target.NeedsFinancing = source.NeedsFinancing; changed = true; }

        return changed;
    }

    private static PropertyPurpose? MapPurpose(string? value) => value?.ToLowerInvariant() switch
    {
        "venda" => PropertyPurpose.Venda,
        "locacao" or "locação" => PropertyPurpose.Locacao,
        _ => null
    };

    private static PropertyType? MapType(string? value) => value?.ToLowerInvariant() switch
    {
        "apartamento" => PropertyType.Apartamento,
        "casa" => PropertyType.Casa,
        "terreno" => PropertyType.Terreno,
        "sala" => PropertyType.Sala,
        "loja" => PropertyType.Loja,
        "galpao" or "galpão" => PropertyType.Galpao,
        "chacara" or "chácara" => PropertyType.Chacara,
        "flat" => PropertyType.Flat,
        "cobertura" => PropertyType.Cobertura,
        _ => null
    };

    private sealed record ExtractedPreference
    {
        public string? Purpose { get; init; }
        public string? PropertyType { get; init; }
        public decimal? MinPrice { get; init; }
        public decimal? MaxPrice { get; init; }
        public int? MinBedrooms { get; init; }
        public int? MinBathrooms { get; init; }
        public int? MinParkingSpots { get; init; }
        public decimal? MinArea { get; init; }
        public string? City { get; init; }
        public string[]? Neighborhoods { get; init; }
        public bool? NeedsFinancing { get; init; }
    }
}
