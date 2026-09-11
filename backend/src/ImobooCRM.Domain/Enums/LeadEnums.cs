namespace ImobooCRM.Domain.Enums;

/// <summary>Etapas do funil. A ordem numerica representa o avanco no funil.</summary>
public enum LeadStatus
{
    Novo = 1,
    EmAtendimento = 2,
    Qualificado = 3,
    VisitaAgendada = 4,
    Proposta = 5,
    Fechado = 6,
    Perdido = 7
}

public enum LeadTemperature
{
    Frio = 1,
    Morno = 2,
    Quente = 3
}

public enum LeadSource
{
    WhatsApp = 1,
    Site = 2,
    Portal = 3,
    Indicacao = 4,
    Manual = 5,
    Outro = 99
}
