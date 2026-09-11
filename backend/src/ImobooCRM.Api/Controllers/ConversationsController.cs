using ImobooCRM.Application.Common;
using ImobooCRM.Application.Conversations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ImobooCRM.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/conversations")]
public sealed class ConversationsController(IConversationService conversations) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<ConversationListItemDto>>> List(
        [FromQuery] ConversationFilter filter, CancellationToken ct)
        => Ok(await conversations.ListAsync(filter, ct));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ConversationDetailDto>> Get(
        Guid id, [FromQuery] int messageLimit = 50, CancellationToken ct = default)
        => Ok(await conversations.GetAsync(id, messageLimit, ct));

    /// <summary>Corretor assume a conversa. A IA para de responder.</summary>
    [HttpPost("{id:guid}/take-over")]
    public async Task<IActionResult> TakeOver(Guid id, CancellationToken ct)
    {
        await conversations.TakeOverAsync(id, ct);
        return NoContent();
    }

    /// <summary>Devolve a conversa para a automacao.</summary>
    [HttpPost("{id:guid}/resume-automation")]
    public async Task<IActionResult> ResumeAutomation(Guid id, CancellationToken ct)
    {
        await conversations.ResumeAutomationAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/close")]
    public async Task<IActionResult> Close(Guid id, CancellationToken ct)
    {
        await conversations.CloseAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id, CancellationToken ct)
    {
        await conversations.MarkAsReadAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/messages")]
    public async Task<ActionResult<MessageDto>> Send(
        Guid id, SendManualMessageRequest request, CancellationToken ct)
        => Ok(await conversations.SendManualAsync(id, request, ct));
}
