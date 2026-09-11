using ImobooCRM.Domain.Common;
using ImobooCRM.Domain.Enums;

namespace ImobooCRM.Domain.Entities;

public class Lead : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }

    public string Name { get; set; } = string.Empty;
    /// <summary>Somente digitos, com DDI. Chave natural do lead dentro do tenant.</summary>
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }

    public LeadSource Source { get; set; } = LeadSource.WhatsApp;
    public LeadStatus Status { get; set; } = LeadStatus.Novo;
    public LeadTemperature Temperature { get; set; } = LeadTemperature.Frio;

    public Guid? AssignedUserId { get; set; }
    public User? AssignedUser { get; set; }

    public LeadPreference Preference { get; set; } = new();

    public string? Notes { get; set; }
    /// <summary>Resumo da conversa mantido pela IA. Evita reenviar o historico inteiro a cada chamada.</summary>
    public string? AiSummary { get; set; }

    public DateTime? LastContactAtUtc { get; set; }
    public DateTime? NextContactAtUtc { get; set; }

    public ICollection<Conversation> Conversations { get; set; } = new List<Conversation>();
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();

    public void RegisterContact(DateTime nowUtc)
    {
        LastContactAtUtc = nowUtc;
        if (Status == LeadStatus.Novo) Status = LeadStatus.EmAtendimento;
    }
}

/// <summary>
/// Preferencias extraidas da conversa. Owned type: uma linha, sem join.
/// Preenchido pela IA mas usado como filtro deterministico no banco.
/// </summary>
public class LeadPreference
{
    public PropertyPurpose? Purpose { get; set; }
    public PropertyType? PropertyType { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public int? MinBedrooms { get; set; }
    public int? MinBathrooms { get; set; }
    public int? MinParkingSpots { get; set; }
    public decimal? MinArea { get; set; }
    public string? City { get; set; }
    /// <summary>Bairros desejados separados por ponto e virgula.</summary>
    public string? Neighborhoods { get; set; }
    public bool? NeedsFinancing { get; set; }

    public bool HasAnything =>
        Purpose is not null || PropertyType is not null || MaxPrice is not null ||
        MinBedrooms is not null || City is not null || !string.IsNullOrWhiteSpace(Neighborhoods);

    public IEnumerable<string> NeighborhoodList =>
        string.IsNullOrWhiteSpace(Neighborhoods)
            ? Array.Empty<string>()
            : Neighborhoods.Split(";", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
