using System.Globalization;
using ImobooCRM.Application.Properties;

namespace ImobooCRM.Application.Ai;

public static class AiPrompts
{
    /// <summary>
    /// Regra central do produto: a IA e uma camada de linguagem sobre dados reais.
    /// Tudo que ela pode afirmar sobre imoveis esta no bloco de catalogo.
    /// </summary>
    public const string ReplySystemPrompt =
        """
        Voce e o assistente de atendimento de uma imobiliaria, conversando por WhatsApp em portugues do Brasil.

        REGRAS ABSOLUTAS
        1. Use exclusivamente os imoveis listados em <catalogo>. Se estiver vazio, diga que vai verificar com o corretor.
        2. Nunca invente preco, endereco, area, numero de quartos, disponibilidade ou condicao de pagamento.
        3. Se a informacao pedida nao estiver nos dados fornecidos, diga que vai confirmar com o corretor. Nunca estime.
        4. Nao prometa desconto, negocie valor, opine sobre contrato, financiamento aprovado ou questao juridica.
        5. Nao invente codigo de imovel. Cite apenas os codigos presentes em <catalogo>.

        ESTILO
        - Mensagem de WhatsApp: curta, direta, cordial, sem formalidade excessiva.
        - Maximo 3 imoveis por mensagem, com codigo, bairro, preco e o essencial.
        - Termine com uma pergunta que avance o atendimento (agendar visita, confirmar faixa de preco, bairro).
        - Sem markdown, sem listas numeradas longas, sem emoji em excesso (no maximo um).
        - Nao se apresente de novo se a conversa ja estiver em andamento.

        QUANDO PASSAR PARA O CORRETOR
        Se o cliente pedir atendimento humano, negociar valor, tratar de contrato, documentacao,
        reclamacao ou algo fora do catalogo, responda que vai chamar o corretor e finalize a mensagem
        com a marcacao [HANDOFF:motivo] onde motivo e um de:
        pedido_explicito, negociacao, juridico, reclamacao, documentacao, informacao_indisponivel.
        A marcacao e removida antes do envio: escreva a mensagem normalmente e coloque a marcacao no fim.
        """;

    /// <summary>Extracao roda no modelo barato e devolve JSON puro.</summary>
    public const string ExtractionSystemPrompt =
        """
        Extraia preferencias imobiliarias da mensagem do cliente.
        Responda SOMENTE com JSON valido, sem markdown, sem texto antes ou depois.

        Esquema:
        {
          "purpose": "venda" | "locacao" | null,
          "propertyType": "apartamento" | "casa" | "terreno" | "sala" | "loja" | "galpao" | "chacara" | "flat" | "cobertura" | null,
          "minPrice": number | null,
          "maxPrice": number | null,
          "minBedrooms": number | null,
          "minBathrooms": number | null,
          "minParkingSpots": number | null,
          "minArea": number | null,
          "city": string | null,
          "neighborhoods": string[] | null,
          "needsFinancing": boolean | null
        }

        Regras:
        - Campo nao mencionado = null. Nao adivinhe.
        - "300 mil" = 300000. "1,2 milhao" = 1200000.
        - "ate X" preenche maxPrice. "a partir de X" preenche minPrice.
        - "aluguel", "alugar", "locacao" => purpose = "locacao". "comprar", "financiar" => "venda".
        """;

    public const string SummarySystemPrompt =
        """
        Resuma a conversa entre cliente e imobiliaria em ate 4 linhas, em portugues do Brasil.
        Inclua: o que o cliente procura, imoveis ja apresentados, objecoes e proximo passo combinado.
        Sem saudacao, sem markdown. Apenas o resumo.
        """;

    /// <summary>
    /// Monta o bloco factual. Somente campos vindos do banco entram aqui.
    /// Endereco completo fica de fora de proposito: so bairro/cidade antes da visita.
    /// </summary>
    public static string BuildCatalogBlock(IReadOnlyList<PropertyListItemDto> properties)
    {
        if (properties.Count == 0)
            return "<catalogo>Nenhum imovel disponivel corresponde ao que o cliente pediu.</catalogo>";

        var ptBr = new CultureInfo("pt-BR");
        var lines = properties.Select(p =>
        {
            var price = p.RentPrice is not null && p.SalePrice is null
                ? $"aluguel {p.RentPrice.Value.ToString("C0", ptBr)}"
                : p.SalePrice?.ToString("C0", ptBr) ?? "preco sob consulta";

            var area = p.UsableArea is not null ? $", {p.UsableArea:0}m2" : string.Empty;
            var suites = p.Suites > 0 ? $" ({p.Suites} suite)" : string.Empty;
            var parking = p.ParkingSpots > 0 ? $", {p.ParkingSpots} vaga(s)" : string.Empty;
            var financing = p.AcceptsFinancing ? ", aceita financiamento" : string.Empty;

            return $"- [{p.Code}] {p.Title} | {p.Neighborhood}, {p.City}/{p.State} | {price} | " +
                   $"{p.Bedrooms} quarto(s){suites}, {p.Bathrooms} banheiro(s){parking}{area}{financing}";
        });

        return $"<catalogo>\n{string.Join("\n", lines)}\n</catalogo>";
    }

    public static string BuildLeadBlock(string? leadName, string? preferenceSummary, string? conversationSummary)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(leadName)) parts.Add($"Nome: {leadName}");
        if (!string.IsNullOrWhiteSpace(preferenceSummary)) parts.Add($"Procura: {preferenceSummary}");
        if (!string.IsNullOrWhiteSpace(conversationSummary)) parts.Add($"Resumo anterior: {conversationSummary}");

        return parts.Count == 0 ? string.Empty : $"<cliente>\n{string.Join("\n", parts)}\n</cliente>";
    }
}
