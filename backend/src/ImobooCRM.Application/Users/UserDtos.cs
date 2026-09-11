using ImobooCRM.Domain.Entities;

namespace ImobooCRM.Application.Users;

public sealed record UserListItemDto(
    Guid Id,
    string Name,
    string Email,
    UserRole Role,
    bool IsActive,
    bool MustChangePassword,
    DateTime? LastLoginAtUtc,
    DateTime CreatedAtUtc);

public sealed record CreateUserRequest(string Name, string Email, UserRole Role);

/// <summary>
/// Devolvida uma única vez, na resposta do cadastro. A senha não fica recuperável
/// depois disso — nem em texto claro em lugar nenhum do sistema.
/// </summary>
public sealed record CreatedUserDto(Guid Id, string Name, string Email, string InitialPassword);

public sealed record UpdateUserRequest(string Name, UserRole Role, bool IsActive);
