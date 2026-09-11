using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using ImobooCRM.Application.Abstractions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ImobooCRM.Infrastructure.Ai;

/// <summary>
/// Cliente da Messages API da Anthropic. Unico ponto que conhece o provedor.
/// </summary>
public sealed class AnthropicChatService(
    HttpClient http,
    IOptions<AnthropicOptions> options,
    ILogger<AnthropicChatService> logger) : IAiChatService
{
    private readonly AnthropicOptions _options = options.Value;

    public async Task<AiCompletionResult> CompleteAsync(
        AiCompletionRequest request, CancellationToken ct = default)
    {
        var model = request.Tier == AiModelTier.Fast ? _options.FastModel : _options.BalancedModel;
        var stopwatch = Stopwatch.StartNew();

        var system = request.JsonOutput
            ? request.SystemPrompt + "\n\nResponda apenas com o JSON, sem cercas de codigo."
            : request.SystemPrompt;

        var payload = new AnthropicRequest(
            Model: model,
            MaxTokens: request.MaxTokens,
            Temperature: request.Temperature,
            System: system,
            Messages: request.Messages.Select(m => new AnthropicMessage(m.Role, m.Content)).ToList());

        try
        {
            var response = await http.PostAsJsonAsync("/v1/messages", payload, ct);

            if (!response.IsSuccessStatusCode)
            {
                var status = (int)response.StatusCode;

                // Nao logamos o corpo do erro: ele pode ecoar trechos do prompt.
                logger.LogError(
                    "Chamada de IA rejeitada. Provider=anthropic Model={Model} Status={Status} LatencyMs={Latency}",
                    model, status, stopwatch.ElapsedMilliseconds);

                var code = response.StatusCode switch
                {
                    HttpStatusCode.TooManyRequests => "rate_limit",
                    HttpStatusCode.Unauthorized => "auth_error",
                    _ => $"http_{status}"
                };

                return new AiCompletionResult(false, string.Empty, 0, 0, model, code);
            }

            var body = await response.Content.ReadFromJsonAsync<AnthropicResponse>(ct);

            var text = string.Join("\n",
                body?.Content?.Where(c => c.Type == "text").Select(c => c.Text) ?? []);

            logger.LogInformation(
                "Chamada de IA concluida. Provider=anthropic Model={Model} InputTokens={In} OutputTokens={Out} LatencyMs={Latency}",
                model, body?.Usage?.InputTokens ?? 0, body?.Usage?.OutputTokens ?? 0, stopwatch.ElapsedMilliseconds);

            return new AiCompletionResult(
                Success: true,
                Content: text.Trim(),
                InputTokens: body?.Usage?.InputTokens ?? 0,
                OutputTokens: body?.Usage?.OutputTokens ?? 0,
                Model: model);
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            logger.LogError("Timeout na IA. Provider=anthropic Model={Model}", model);
            return new AiCompletionResult(false, string.Empty, 0, 0, model, "timeout");
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Anthropic indisponivel. Model={Model}", model);
            return new AiCompletionResult(false, string.Empty, 0, 0, model, "provider_unavailable");
        }
    }

    private sealed record AnthropicRequest(
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("max_tokens")] int MaxTokens,
        [property: JsonPropertyName("temperature")] double Temperature,
        [property: JsonPropertyName("system")] string System,
        [property: JsonPropertyName("messages")] IReadOnlyList<AnthropicMessage> Messages);

    private sealed record AnthropicMessage(
        [property: JsonPropertyName("role")] string Role,
        [property: JsonPropertyName("content")] string Content);

    private sealed record AnthropicResponse(
        [property: JsonPropertyName("content")] List<ContentBlock>? Content,
        [property: JsonPropertyName("usage")] Usage? Usage);

    private sealed record ContentBlock(
        [property: JsonPropertyName("type")] string Type,
        [property: JsonPropertyName("text")] string Text);

    private sealed record Usage(
        [property: JsonPropertyName("input_tokens")] int InputTokens,
        [property: JsonPropertyName("output_tokens")] int OutputTokens);
}
