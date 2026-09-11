namespace ImobooCRM.Infrastructure.Storage;

public sealed class LocalFileStorageOptions
{
    public const string SectionName = "FileStorage";

    /// <summary>Diretório físico no container. Deve ser um volume Docker para sobreviver a rebuilds.</summary>
    public string RootPath { get; set; } = "/app/uploads";

    /// <summary>Prefixo de URL pública, servido como arquivo estático pela própria API.</summary>
    public string PublicBaseUrl { get; set; } = "/api/uploads";
}
