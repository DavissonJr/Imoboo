export enum PropertyType {
  Apartamento = 1, Casa = 2, CasaDeCondominio = 3, Terreno = 4, Sala = 5,
  Loja = 6, Galpao = 7, Chacara = 8, Flat = 9, Cobertura = 10,
}

export enum PropertyPurpose { Venda = 1, Locacao = 2, VendaELocacao = 3 }

export enum PropertyStatus { Disponivel = 1, Reservado = 2, Vendido = 3, Alugado = 4, Inativo = 5 }

export enum LeadStatus {
  Novo = 1, EmAtendimento = 2, Qualificado = 3, VisitaAgendada = 4,
  Proposta = 5, Fechado = 6, Perdido = 7,
}

export enum LeadTemperature { Frio = 1, Morno = 2, Quente = 3 }

export enum LeadSource { WhatsApp = 1, Site = 2, Portal = 3, Indicacao = 4, Manual = 5, Outro = 99 }

export enum ConversationMode { Automatica = 1, Humana = 2 }

export enum ConversationStatus { AguardandoCliente = 1, AguardandoCorretor = 2, Encerrada = 3 }

export enum MessageDirection { Inbound = 1, Outbound = 2 }

export enum MessageAuthor { Lead = 1, Ia = 2, Corretor = 3, Sistema = 4 }

export enum MessageDeliveryStatus { Pendente = 1, Enviada = 2, Entregue = 3, Lida = 4, Falhou = 5 }

export enum HandoffReason {
  Nenhum = 0, PedidoExplicito = 1, Negociacao = 2, Juridico = 3, Reclamacao = 4,
  Documentacao = 5, InformacaoIndisponivel = 6, FalhaTecnica = 7, BaixaConfianca = 8,
}

export enum AppointmentType { Visita = 1, Retorno = 2, Ligacao = 3, Reuniao = 4 }

export enum AppointmentStatus {
  Agendado = 1, Confirmado = 2, Realizado = 3, Cancelado = 4, NaoCompareceu = 5,
}

/* Rotulos exibidos ao corretor. Linguagem do usuario, nao do sistema. */

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  [PropertyType.Apartamento]: "Apartamento",
  [PropertyType.Casa]: "Casa",
  [PropertyType.CasaDeCondominio]: "Casa de condomínio",
  [PropertyType.Terreno]: "Terreno",
  [PropertyType.Sala]: "Sala",
  [PropertyType.Loja]: "Loja",
  [PropertyType.Galpao]: "Galpão",
  [PropertyType.Chacara]: "Chácara",
  [PropertyType.Flat]: "Flat",
  [PropertyType.Cobertura]: "Cobertura",
};

export const PROPERTY_STATUS_LABEL: Record<PropertyStatus, string> = {
  [PropertyStatus.Disponivel]: "Disponível",
  [PropertyStatus.Reservado]: "Reservado",
  [PropertyStatus.Vendido]: "Vendido",
  [PropertyStatus.Alugado]: "Alugado",
  [PropertyStatus.Inativo]: "Inativo",
};

export const PROPERTY_PURPOSE_LABEL: Record<PropertyPurpose, string> = {
  [PropertyPurpose.Venda]: "Venda",
  [PropertyPurpose.Locacao]: "Locação",
  [PropertyPurpose.VendaELocacao]: "Venda e locação",
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  [LeadStatus.Novo]: "Novo",
  [LeadStatus.EmAtendimento]: "Em atendimento",
  [LeadStatus.Qualificado]: "Qualificado",
  [LeadStatus.VisitaAgendada]: "Visita agendada",
  [LeadStatus.Proposta]: "Proposta",
  [LeadStatus.Fechado]: "Fechado",
  [LeadStatus.Perdido]: "Perdido",
};

export const TEMPERATURE_LABEL: Record<LeadTemperature, string> = {
  [LeadTemperature.Frio]: "Frio",
  [LeadTemperature.Morno]: "Morno",
  [LeadTemperature.Quente]: "Quente",
};

export const HANDOFF_LABEL: Record<HandoffReason, string> = {
  [HandoffReason.Nenhum]: "",
  [HandoffReason.PedidoExplicito]: "Pediu para falar com você",
  [HandoffReason.Negociacao]: "Quer negociar valor",
  [HandoffReason.Juridico]: "Dúvida jurídica",
  [HandoffReason.Reclamacao]: "Reclamação",
  [HandoffReason.Documentacao]: "Pediu documentação",
  [HandoffReason.InformacaoIndisponivel]: "Informação fora do catálogo",
  [HandoffReason.FalhaTecnica]: "Falha no envio automático",
  [HandoffReason.BaixaConfianca]: "A IA não teve certeza",
};

export const APPOINTMENT_TYPE_LABEL: Record<AppointmentType, string> = {
  [AppointmentType.Visita]: "Visita",
  [AppointmentType.Retorno]: "Retorno",
  [AppointmentType.Ligacao]: "Ligação",
  [AppointmentType.Reuniao]: "Reunião",
};

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  [AppointmentStatus.Agendado]: "Agendado",
  [AppointmentStatus.Confirmado]: "Confirmado",
  [AppointmentStatus.Realizado]: "Realizado",
  [AppointmentStatus.Cancelado]: "Cancelado",
  [AppointmentStatus.NaoCompareceu]: "Não compareceu",
};
