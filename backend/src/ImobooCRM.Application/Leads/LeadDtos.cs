using ImobooCRM.Application.Common;
using ImobooCRM.Domain.Enums;

namespace ImobooCRM.Application.Leads;

public sealed record LeadListItemDto(
    Guid Id,
    string Name,
    string Phone,
    string? Email,
    LeadSource Source,
    LeadStatus Status,
    LeadTemperature Temperature,
    Guid? AssignedUserId,
    string? AssignedUserName,
    DateTime? LastContactAtUtc,
    DateTime? NextContactAtUtc,
    string? PreferenceSummary);

public sealed record LeadDetailDto(
    Guid Id,
    string Name,
    string Phone,
    string? Email,
    LeadSource Source,
    LeadStatus Status,
    LeadTemperature Temperature,
    Guid? AssignedUserId,
    string? Notes,
    string? AiSummary,
    DateTime? LastContactAtUtc,
    DateTime? NextContactAtUtc,
    LeadPreferenceDto Preference);

public sealed record LeadPreferenceDto(
    PropertyPurpose? Purpose,
    PropertyType? PropertyType,
    decimal? MinPrice,
    decimal? MaxPrice,
    int? MinBedrooms,
    int? MinBathrooms,
    int? MinParkingSpots,
    decimal? MinArea,
    string? City,
    IReadOnlyList<string> Neighborhoods,
    bool? NeedsFinancing);

public sealed class LeadFilter : PageRequest
{
    public LeadStatus? Status { get; set; }
    public LeadTemperature? Temperature { get; set; }
    public Guid? AssignedUserId { get; set; }
    public string? Term { get; set; }
    /// <summary>Leads sem contato ha mais de N dias. Base do alerta de follow-up.</summary>
    public int? IdleForDays { get; set; }
}

public sealed record UpdateLeadRequest(
    string Name,
    string? Email,
    LeadStatus Status,
    LeadTemperature Temperature,
    Guid? AssignedUserId,
    string? Notes,
    DateTime? NextContactAtUtc,
    LeadPreferenceDto? Preference);
