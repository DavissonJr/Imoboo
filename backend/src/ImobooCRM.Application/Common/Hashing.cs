using System.Security.Cryptography;
using System.Text;

namespace ImobooCRM.Application.Common;

public static class Hashing
{
    /// <summary>Hash curto e estavel para compor chaves de cache.</summary>
    public static string Sha256Short(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes)[..24].ToLowerInvariant();
    }
}
