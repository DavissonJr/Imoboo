using System.Text.Json;
using ImobooCRM.Application.Common;

namespace ImobooCRM.Api.Middleware;

/// <summary>
/// Tratamento central de excecoes. Erro esperado vira resposta tipada;
/// erro inesperado vira 500 generico e o detalhe fica no log.
/// </summary>
public sealed class ExceptionHandlingMiddleware(
    RequestDelegate next,
    ILogger<ExceptionHandlingMiddleware> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (AppException ex)
        {
            logger.LogWarning(
                "Erro de aplicacao. Code={Code} Path={Path} Message={Message}",
                ex.Code, context.Request.Path, ex.Message);

            await WriteAsync(context, ex.StatusCode, ex.Code, ex.Message);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // Cliente desistiu da requisicao. Nao e erro.
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Erro nao tratado. Path={Path} TraceId={TraceId}",
                context.Request.Path, context.TraceIdentifier);

            await WriteAsync(context, 500, "internal_error",
                "Nao foi possivel concluir a operacao. Tente novamente.");
        }
    }

    private static async Task WriteAsync(HttpContext context, int status, string code, string message)
    {
        if (context.Response.HasStarted) return;

        context.Response.Clear();
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/json";

        await context.Response.WriteAsync(JsonSerializer.Serialize(
            new { code, message, traceId = context.TraceIdentifier }, JsonOptions));
    }
}
