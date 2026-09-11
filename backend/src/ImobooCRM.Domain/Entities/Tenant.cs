using ImobooCRM.Domain.Common;

namespace ImobooCRM.Domain.Entities;

public class Tenant : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Document { get; set; }
    public bool IsActive { get; set; } = true;

    public TenantSettings Settings { get; set; } = new();

    public ICollection<User> Users { get; set; } = new List<User>();
}

/// <summary>Configuracoes por tenant. Uma linha por tenant.</summary>
public class TenantSettings : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public Tenant? Tenant { get; set; }

    // --- WhatsApp / Evolution ---
    public string? EvolutionInstanceName { get; set; }
    /// <summary>Token do webhook usado para validar a origem das chamadas. Nunca logar.</summary>
    public string? WebhookToken { get; set; }
    public string? WhatsAppNumber { get; set; }
    public bool WhatsAppConnected { get; set; }

    // --- IA ---
    public bool AiEnabled { get; set; } = true;
    /// <summary>Persona/instrucoes especificas da imobiliaria injetadas no system prompt.</summary>
    public string? AiPersona { get; set; }
    /// <summary>Fora desta janela a IA nao responde e a conversa vai para a fila do corretor.</summary>
    public TimeOnly? AiActiveFrom { get; set; }
    public TimeOnly? AiActiveTo { get; set; }
    /// <summary>Teto mensal de chamadas a IA por tenant. Protege contra custo descontrolado.</summary>
    public int MonthlyAiMessageLimit { get; set; } = 5000;
    public int MonthlyAiMessageCount { get; set; }
    public DateTime? AiCounterResetAtUtc { get; set; }

    public bool CanUseAi(DateTime nowUtc)
    {
        if (!AiEnabled) return false;
        if (MonthlyAiMessageCount >= MonthlyAiMessageLimit) return false;
        if (AiActiveFrom is null || AiActiveTo is null) return true;

        var now = TimeOnly.FromDateTime(nowUtc);
        return AiActiveFrom <= AiActiveTo
            ? now >= AiActiveFrom && now <= AiActiveTo
            : now >= AiActiveFrom || now <= AiActiveTo; // janela que cruza a meia-noite
    }
}
