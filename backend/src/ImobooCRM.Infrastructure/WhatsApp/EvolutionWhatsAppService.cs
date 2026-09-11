using System.Net.Http.Json;
using System.Text.Json.Serialization;
using ImobooCRM.Application.Abstractions;
using ImobooCRM.Application.Common;
using Microsoft.Extensions.Logging;

namespace ImobooCRM.Infrastructure.WhatsApp;

/// <summary>
/// Unico ponto do sistema que conhece o formato da Evolution API.
/// Substituir pela API oficial do WhatsApp = nova classe implementando IWhatsAppService.
/// </summary>
public sealed class EvolutionWhatsAppService(
    HttpClient http,
    ILogger<EvolutionWhatsAppService> logger) : IWhatsAppService
{
    public async Task<SendMessageResult> SendTextAsync(SendTextRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.InstanceName))
            return SendMessageResult.Fail("Instancia do WhatsApp nao configurada para este tenant.");

        var payload = new
        {
            number = PhoneNumber.Normalize(request.ToPhone),
            text = request.Text
        };

        return await PostAsync($"/message/sendText/{request.InstanceName}", payload, ct);
    }

    public async Task<SendMessageResult> SendMediaAsync(SendMediaRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.InstanceName))
            return SendMessageResult.Fail("Instancia do WhatsApp nao configurada para este tenant.");

        var payload = new
        {
            number = PhoneNumber.Normalize(request.ToPhone),
            mediatype = request.MediaType,
            media = request.MediaUrl,
            caption = request.Caption
        };

        return await PostAsync($"/message/sendMedia/{request.InstanceName}", payload, ct);
    }

    public async Task<bool> IsInstanceConnectedAsync(string instanceName, CancellationToken ct = default)
    {
        try
        {
            var response = await http.GetAsync($"/instance/connectionState/{instanceName}", ct);
            if (!response.IsSuccessStatusCode) return false;

            var state = await response.Content.ReadFromJsonAsync<ConnectionStateResponse>(ct);
            return string.Equals(state?.Instance?.State, "open", StringComparison.OrdinalIgnoreCase);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning(ex,
                "Falha ao consultar estado da instancia. Provider=evolution Instance={Instance}", instanceName);
            return false;
        }
    }

    private async Task<SendMessageResult> PostAsync(string path, object payload, CancellationToken ct)
    {
        try
        {
            var response = await http.PostAsJsonAsync(path, payload, ct);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                var reason = $"HTTP {(int)response.StatusCode}";

                logger.LogError(
                    "Envio rejeitado. Provider=evolution Path={Path} Status={Status} Body={Body}",
                    path, (int)response.StatusCode, Truncate(body));

                return SendMessageResult.Fail(reason);
            }

            var result = await response.Content.ReadFromJsonAsync<SendResponse>(ct);
            return SendMessageResult.Ok(result?.Key?.Id);
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            logger.LogError("Timeout no envio. Provider=evolution Path={Path}", path);
            return SendMessageResult.Fail("timeout");
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Evolution indisponivel. Path={Path}", path);
            return SendMessageResult.Fail("provider_unavailable");
        }
    }

    private static string Truncate(string value) => value.Length <= 300 ? value : value[..300];

    private sealed record SendResponse([property: JsonPropertyName("key")] MessageKey? Key);
    private sealed record MessageKey([property: JsonPropertyName("id")] string? Id);
    private sealed record ConnectionStateResponse(
        [property: JsonPropertyName("instance")] InstanceState? Instance);
    private sealed record InstanceState([property: JsonPropertyName("state")] string? State);
}
