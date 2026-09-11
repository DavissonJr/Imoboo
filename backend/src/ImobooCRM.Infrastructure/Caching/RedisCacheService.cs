using System.Text.Json;
using ImobooCRM.Application.Abstractions;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace ImobooCRM.Infrastructure.Caching;

/// <summary>
/// Cache no Redis. Falha de Redis nunca derruba o fluxo: cache indisponivel
/// significa custo maior, nao atendimento parado.
/// </summary>
public sealed class RedisCacheService(
    IConnectionMultiplexer redis,
    ILogger<RedisCacheService> logger) : ICacheService
{
    private static readonly TimeSpan DefaultTtl = TimeSpan.FromMinutes(10);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private IDatabase Db => redis.GetDatabase();

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        try
        {
            var value = await Db.StringGetAsync(key);
            return value.IsNullOrEmpty ? default : JsonSerializer.Deserialize<T>(value!, JsonOptions);
        }
        catch (Exception ex) when (ex is RedisException or JsonException)
        {
            logger.LogWarning(ex, "Falha ao ler cache. Key={Key}", key);
            return default;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? ttl = null, CancellationToken ct = default)
    {
        try
        {
            var json = JsonSerializer.Serialize(value, JsonOptions);
            await Db.StringSetAsync(key, json, ttl ?? DefaultTtl);
        }
        catch (Exception ex) when (ex is RedisException or JsonException)
        {
            logger.LogWarning(ex, "Falha ao gravar cache. Key={Key}", key);
        }
    }

    public async Task RemoveAsync(string key, CancellationToken ct = default)
    {
        try
        {
            await Db.KeyDeleteAsync(key);
        }
        catch (RedisException ex)
        {
            logger.LogWarning(ex, "Falha ao remover cache. Key={Key}", key);
        }
    }

    /// <summary>
    /// SCAN em vez de KEYS: KEYS bloqueia o Redis inteiro.
    /// Usado na invalidacao do catalogo, que e pouco frequente.
    /// </summary>
    public async Task RemoveByPrefixAsync(string prefix, CancellationToken ct = default)
    {
        try
        {
            foreach (var endpoint in redis.GetEndPoints())
            {
                var server = redis.GetServer(endpoint);
                if (!server.IsConnected || server.IsReplica) continue;

                await foreach (var key in server.KeysAsync(pattern: $"{prefix}*", pageSize: 250).WithCancellation(ct))
                    await Db.KeyDeleteAsync(key);
            }
        }
        catch (RedisException ex)
        {
            logger.LogWarning(ex, "Falha ao invalidar prefixo. Prefix={Prefix}", prefix);
        }
    }

    /// <summary>
    /// Lock via SET NX. O token aleatorio garante que so quem adquiriu o lock o libera.
    /// </summary>
    public async Task<IAsyncDisposable?> AcquireLockAsync(string key, TimeSpan ttl, CancellationToken ct = default)
    {
        var token = Guid.NewGuid().ToString("N");

        try
        {
            var acquired = await Db.StringSetAsync(key, token, ttl, When.NotExists);
            return acquired ? new RedisLock(Db, key, token) : null;
        }
        catch (RedisException ex)
        {
            // Redis fora do ar: seguir sem lock e melhor que travar o atendimento.
            logger.LogWarning(ex, "Redis indisponivel para lock. Key={Key}", key);
            return new NoOpLock();
        }
    }

    private sealed class RedisLock(IDatabase db, string key, string token) : IAsyncDisposable
    {
        private const string ReleaseScript =
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

        public async ValueTask DisposeAsync()
        {
            try
            {
                await db.ScriptEvaluateAsync(ReleaseScript, [key], [token]);
            }
            catch (RedisException)
            {
                // TTL expira o lock de qualquer forma.
            }
        }
    }

    private sealed class NoOpLock : IAsyncDisposable
    {
        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}
