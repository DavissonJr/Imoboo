using System.Text.RegularExpressions;
using ImobooCRM.Domain.Enums;

namespace ImobooCRM.Application.Ai;

/// <summary>
/// Duas camadas de deteccao de handoff:
/// 1. Deterministica, antes da IA: palavras inequivocas nao precisam de token gasto.
/// 2. Marcacao [HANDOFF:motivo] que a propria IA emite quando percebe o limite.
/// </summary>
public static partial class HandoffDetector
{
    [GeneratedRegex(@"\[HANDOFF:([a-z_]+)\]", RegexOptions.IgnoreCase)]
    private static partial Regex HandoffTag();

    private static readonly (string[] Terms, HandoffReason Reason)[] Triggers =
    [
        (["falar com corretor", "falar com um humano", "falar com atendente", "quero falar com alguem",
          "me liga", "pode ligar", "atendimento humano", "pessoa de verdade"], HandoffReason.PedidoExplicito),
        (["desconto", "abaixa", "abaixar o valor", "melhor preco", "consegue fazer por", "contraproposta",
          "aceita menos"], HandoffReason.Negociacao),
        (["advogado", "juridico", "processo", "inventario", "usucapiao", "clausula", "rescisao"], HandoffReason.Juridico),
        (["reclamacao", "reclamar", "procon", "pessimo atendimento", "descaso"], HandoffReason.Reclamacao),
        (["contrato", "documentacao", "documentos", "certidao", "escritura", "matricula"], HandoffReason.Documentacao)
    ];

    /// <summary>Checagem barata sobre a mensagem do lead, antes de qualquer chamada de IA.</summary>
    public static HandoffReason FromLeadMessage(string message)
    {
        if (string.IsNullOrWhiteSpace(message)) return HandoffReason.Nenhum;

        var normalized = RemoveDiacritics(message.ToLowerInvariant());

        foreach (var (terms, reason) in Triggers)
            if (terms.Any(normalized.Contains))
                return reason;

        return HandoffReason.Nenhum;
    }

    /// <summary>Le e remove a marcacao emitida pela IA. O lead nunca ve a tag.</summary>
    public static (string CleanText, HandoffReason Reason) FromAiReply(string reply)
    {
        var match = HandoffTag().Match(reply);
        if (!match.Success) return (reply.Trim(), HandoffReason.Nenhum);

        var reason = match.Groups[1].Value.ToLowerInvariant() switch
        {
            "pedido_explicito" => HandoffReason.PedidoExplicito,
            "negociacao" => HandoffReason.Negociacao,
            "juridico" => HandoffReason.Juridico,
            "reclamacao" => HandoffReason.Reclamacao,
            "documentacao" => HandoffReason.Documentacao,
            "informacao_indisponivel" => HandoffReason.InformacaoIndisponivel,
            _ => HandoffReason.BaixaConfianca
        };

        return (HandoffTag().Replace(reply, string.Empty).Trim(), reason);
    }

    private static string RemoveDiacritics(string text)
    {
        var normalized = text.Normalize(System.Text.NormalizationForm.FormD);
        return string.Concat(normalized.Where(c =>
            System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c)
                != System.Globalization.UnicodeCategory.NonSpacingMark))
            .Normalize(System.Text.NormalizationForm.FormC);
    }
}
