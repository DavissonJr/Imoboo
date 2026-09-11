namespace ImobooCRM.Application.Abstractions;

/// <summary>
/// Contrato do provedor de IA. Fica generico o suficiente para trocar a Anthropic
/// por outro provedor sem tocar nos casos de uso.
/// </summary>
public interface IAiChatService
{
    Task<AiCompletionResult> CompleteAsync(AiCompletionRequest request, CancellationToken ct = default);
}

public sealed record AiMessage(string Role, string Content); // role: user | assistant

public sealed record AiCompletionRequest(
    string SystemPrompt,
    IReadOnlyList<AiMessage> Messages,
    int MaxTokens = 800,
    double Temperature = 0.3,
    AiModelTier Tier = AiModelTier.Balanced,
    /// <summary>Forca saida JSON pura. Usado em extracao e classificacao.</summary>
    bool JsonOutput = false);

/// <summary>
/// A Application escolhe o "tamanho" do modelo pela natureza da tarefa,
/// nao pelo nome comercial. Infrastructure faz o de-para.
/// </summary>
public enum AiModelTier
{
    /// <summary>Tarefas mecanicas e baratas: extracao, classificacao, resumo.</summary>
    Fast = 1,
    /// <summary>Conversa com o lead.</summary>
    Balanced = 2
}

public sealed record AiCompletionResult(
    bool Success,
    string Content,
    int InputTokens,
    int OutputTokens,
    string Model,
    string? Error = null);
