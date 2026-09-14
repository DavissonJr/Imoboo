using System.Globalization;
using System.Text;

namespace ImobooCRM.Application.Common;

public static class TextNormalization
{
    /// <summary>Minúsculo e sem acento — usado nos parsers determinísticos (menu, handoff).</summary>
    public static string RemoveDiacritics(string text)
    {
        var normalized = text.Normalize(NormalizationForm.FormD);
        return string.Concat(normalized.Where(c =>
                CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark))
            .Normalize(NormalizationForm.FormC);
    }
}
