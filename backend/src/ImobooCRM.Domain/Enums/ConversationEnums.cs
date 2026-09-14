namespace ImobooCRM.Domain.Enums;

/// <summary>
/// Quem esta conduzindo a conversa neste momento.
/// Menu        -> bot determinístico (sem IA), estado inicial de toda conversa nova.
/// Automatica  -> IA responde.
/// Humana      -> IA silenciada, corretor assumiu.
/// </summary>
public enum ConversationMode
{
    Menu = 3,
    Automatica = 1,
    Humana = 2
}

public enum ConversationStatus
{
    AguardandoCliente = 1,
    AguardandoCorretor = 2,
    Encerrada = 3
}

public enum MessageDirection
{
    Inbound = 1,
    Outbound = 2
}

/// <summary>Autor da mensagem. Usado para exibir a origem no painel do corretor.</summary>
public enum MessageAuthor
{
    Lead = 1,
    Ia = 2,
    Corretor = 3,
    Sistema = 4
}

public enum MessageDeliveryStatus
{
    Pendente = 1,
    Enviada = 2,
    Entregue = 3,
    Lida = 4,
    Falhou = 5
}

/// <summary>Motivo pelo qual a conversa precisou de um humano.</summary>
public enum HandoffReason
{
    Nenhum = 0,
    PedidoExplicito = 1,
    Negociacao = 2,
    Juridico = 3,
    Reclamacao = 4,
    Documentacao = 5,
    InformacaoIndisponivel = 6,
    FalhaTecnica = 7,
    BaixaConfianca = 8
}
