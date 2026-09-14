using System.Net;
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

    public async Task<QrCodeResult> GetQrCodeAsync(string instanceName, CancellationToken ct = default)
    {
        var (result, notFound) = await ConnectAsync(instanceName, ct);
        if (result.Base64 is not null || !notFound) return result;

        // Instancia ainda nao existe na Evolution: cria e tenta pegar o QR de novo,
        // uma unica vez. O corretor nunca precisa saber que essa etapa existe.
        logger.LogInformation("Instancia inexistente, criando. Instance={Instance}", instanceName);

        var createError = await CreateInstanceAsync(instanceName, ct);
        return createError is not null
            ? QrCodeResult.Fail(createError)
            : (await ConnectAsync(instanceName, ct)).Result;
    }

    private async Task<(QrCodeResult Result, bool NotFound)> ConnectAsync(string instanceName, CancellationToken ct)
    {
        try
        {
            var response = await http.GetAsync($"/instance/connect/{instanceName}", ct);

            if (response.StatusCode == HttpStatusCode.NotFound)
                return (QrCodeResult.Fail("instancia_nao_encontrada"), true);

            if (!response.IsSuccessStatusCode)
            {
                var status = (int)response.StatusCode;

                logger.LogWarning(
                    "Falha ao obter QR code. Provider=evolution Instance={Instance} Status={Status}",
                    instanceName, status);

                return (QrCodeResult.Fail($"A Evolution respondeu com erro (HTTP {status}) ao pedir o QR code."), false);
            }

            var result = await response.Content.ReadFromJsonAsync<QrCodeResponse>(ct);

            if (string.IsNullOrWhiteSpace(result?.Base64))
            {
                logger.LogWarning("Evolution respondeu sem QR code. Instance={Instance}", instanceName);
                return (QrCodeResult.Fail(
                    "A Evolution respondeu, mas sem o QR code. A instância pode já estar pareada ou nesse momento indisponível — tente de novo em instantes."), false);
            }

            return (QrCodeResult.Ok(result.Base64), false);
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            logger.LogError("Timeout ao pedir QR code. Instance={Instance}", instanceName);
            return (QrCodeResult.Fail("A Evolution não respondeu a tempo (timeout). Verifique se ela está no ar."), false);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Evolution indisponivel ao pedir QR code. Instance={Instance}", instanceName);
            return (QrCodeResult.Fail(
                "Não foi possível conectar à Evolution API. Confira o endereço configurado (Evolution:BaseUrl) " +
                "e se o serviço está no ar e acessível a partir do container da API."), false);
        }
    }

    /// <summary>Devolve null em sucesso, ou a mensagem de erro para mostrar ao admin.</summary>
    private async Task<string?> CreateInstanceAsync(string instanceName, CancellationToken ct)
    {
        try
        {
            var payload = new { instanceName, qrcode = true, integration = "WHATSAPP-BAILEYS" };
            var response = await http.PostAsJsonAsync("/instance/create", payload, ct);

            if (response.IsSuccessStatusCode) return null;

            var body = await response.Content.ReadAsStringAsync(ct);

            logger.LogError(
                "Falha ao criar instancia. Provider=evolution Instance={Instance} Status={Status} Body={Body}",
                instanceName, (int)response.StatusCode, Truncate(body));

            return $"A Evolution recusou criar a instância \"{instanceName}\" (HTTP {(int)response.StatusCode}). " +
                   "Confira se esse nome já está em uso com outra configuração.";
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogError(ex, "Evolution indisponivel ao criar instancia. Instance={Instance}", instanceName);
            return "Não foi possível conectar à Evolution API para criar a instância.";
        }
    }

    /// <summary>
    /// Formato confirmado na documentacao oficial: POST /webhook/set/{instance},
    /// eventos em maiusculo com underscore na configuracao — mas o payload que chega
    /// no nosso endpoint usa "messages.upsert" minusculo. Confusao conhecida da propria
    /// Evolution, nao e engano nosso.
    /// </summary>
    public async Task<bool> SetWebhookAsync(string instanceName, string webhookUrl, CancellationToken ct = default)
    {
        try
        {
            var payload = new
            {
                webhook = new
                {
                    enabled = true,
                    url = webhookUrl,
                    webhook_by_events = false,
                    webhook_base64 = false,
                    events = new[] { "MESSAGES_UPSERT" }
                }
            };

            var response = await http.PostAsJsonAsync($"/webhook/set/{instanceName}", payload, ct);

            if (response.IsSuccessStatusCode)
            {
                logger.LogInformation("Webhook configurado. Instance={Instance}", instanceName);
                return true;
            }

            var body = await response.Content.ReadAsStringAsync(ct);

            logger.LogError(
                "Falha ao configurar webhook. Provider=evolution Instance={Instance} Status={Status} Body={Body}",
                instanceName, (int)response.StatusCode, Truncate(body));

            return false;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            logger.LogError(ex, "Evolution indisponivel ao configurar webhook. Instance={Instance}", instanceName);
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
    private sealed record QrCodeResponse([property: JsonPropertyName("base64")] string? Base64);
}
