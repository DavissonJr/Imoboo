using ImobooCRM.Domain.Common;

namespace ImobooCRM.Domain.Entities;

/// <summary>
/// Uma linha por chamada a IA. Base do controle de custo por tenant.
/// Nao guarda o prompt completo, apenas metadados e contagem de tokens.
/// </summary>
public class AiUsageLog : BaseEntity, ITenantScoped
{
    public Guid TenantId { get; set; }
    public Guid? ConversationId { get; set; }
    public Guid? LeadId { get; set; }

    public string Operation { get; set; } = string.Empty; // reply | extract | summarize | classify
    public string Model { get; set; } = string.Empty;
    public int InputTokens { get; set; }
    public int OutputTokens { get; set; }
    public int LatencyMs { get; set; }
    public bool FromCache { get; set; }
    public bool Success { get; set; } = true;
    public string? ErrorCode { get; set; }
}
