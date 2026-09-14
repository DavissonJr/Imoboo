using ImobooCRM.Application.Common;

namespace ImobooCRM.Application.Messaging;

/// <summary>
/// Interpreta a resposta do lead ao menu inicial. Puramente determinístico — sem IA,
/// por isso aceita bem menos variação do que a extração de preferências (essa sim
/// usa o modelo). Se o lead escrever algo fora do esperado, o menu é reenviado.
/// </summary>
public static class MenuOption
{
    private static readonly string[] CatalogKeywords =
        ["catalogo", "imoveis", "imovel", "ver imoveis", "ver casas", "casas", "apartamentos"];

    private static readonly string[] AttendantKeywords =
        ["atendente", "corretor", "assistente", "pessoa", "humano", "falar com alguem", "falar com voces"];

    public static int? Parse(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;

        var normalized = TextNormalization.RemoveDiacritics(text.Trim().ToLowerInvariant());

        if (normalized == "1" || CatalogKeywords.Any(normalized.Contains)) return 1;
        if (normalized == "2" || AttendantKeywords.Any(normalized.Contains)) return 2;

        return null;
    }
}
