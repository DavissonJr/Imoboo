namespace ImobooCRM.Domain.ValueObjects;

/// <summary>Owned type. Mapeado como colunas na tabela Properties.</summary>
public sealed class PropertyLocation
{
    public string? Street { get; set; }
    public string? Number { get; set; }
    public string? Complement { get; set; }
    public string Neighborhood { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string? ZipCode { get; set; }

    /// <summary>Endereco reduzido, seguro para enviar ao lead antes da visita.</summary>
    public string ToPublicLabel() => $"{Neighborhood}, {City}/{State}";
}
