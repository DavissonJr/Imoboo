using System.Text.RegularExpressions;

namespace ImobooCRM.Application.Common;

public static partial class PhoneNumber
{
    [GeneratedRegex(@"\D")]
    private static partial Regex NonDigits();

    /// <summary>
    /// Normaliza para somente digitos com DDI. E a chave natural do lead,
    /// entao precisa ser deterministica: 5581999999999.
    /// </summary>
    public static string Normalize(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;

        var digits = NonDigits().Replace(raw.Split("@")[0], string.Empty);

        // numero brasileiro sem DDI (10 ou 11 digitos) -> prefixa 55
        if (digits.Length is 10 or 11 && !digits.StartsWith("55"))
            digits = "55" + digits;

        return digits;
    }
}
