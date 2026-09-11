namespace ImobooCRM.Domain.Enums;

public enum PropertyType
{
    Apartamento = 1,
    Casa = 2,
    CasaDeCondominio = 3,
    Terreno = 4,
    Sala = 5,
    Loja = 6,
    Galpao = 7,
    Chacara = 8,
    Flat = 9,
    Cobertura = 10
}

public enum PropertyPurpose
{
    Venda = 1,
    Locacao = 2,
    VendaELocacao = 3
}

public enum PropertyStatus
{
    Disponivel = 1,
    Reservado = 2,
    Vendido = 3,
    Alugado = 4,
    Inativo = 5
}
