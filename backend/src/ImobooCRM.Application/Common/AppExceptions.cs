namespace ImobooCRM.Application.Common;

public class AppException : Exception
{
    public int StatusCode { get; }
    public string Code { get; }

    public AppException(string message, string code = "app_error", int statusCode = 400)
        : base(message)
    {
        Code = code;
        StatusCode = statusCode;
    }
}

public sealed class NotFoundException(string resource)
    : AppException($"{resource} nao encontrado.", "not_found", 404);

public sealed class ValidationAppException(string message)
    : AppException(message, "validation_error", 422);

public sealed class ForbiddenException(string message = "Acesso negado.")
    : AppException(message, "forbidden", 403);
