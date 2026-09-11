using ImobooCRM.Application.Auth;
using ImobooCRM.Application.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ImobooCRM.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/users")]
public sealed class UsersController(IUserService users, IAuthService auth) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IReadOnlyList<UserListItemDto>>> List(CancellationToken ct)
        => Ok(await users.ListAsync(ct));

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<CreatedUserDto>> Create(CreateUserRequest request, CancellationToken ct)
        => Ok(await users.CreateAsync(request, ct));

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, UpdateUserRequest request, CancellationToken ct)
    {
        await users.UpdateAsync(id, request, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/reset-password")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<CreatedUserDto>> ResetPassword(Guid id, CancellationToken ct)
        => Ok(await users.ResetPasswordAsync(id, ct));

    /// <summary>Qualquer usuário autenticado troca a própria senha — inclusive no primeiro acesso.</summary>
    [HttpPost("me/change-password")]
    public async Task<IActionResult> ChangeOwnPassword(ChangePasswordRequest request, CancellationToken ct)
    {
        await auth.ChangeOwnPasswordAsync(request, ct);
        return NoContent();
    }
}
