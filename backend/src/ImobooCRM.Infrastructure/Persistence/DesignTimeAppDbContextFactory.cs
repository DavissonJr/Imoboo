using ImobooCRM.Application.Abstractions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ImobooCRM.Infrastructure.Persistence;

/// <summary>
/// Usada só pela ferramenta `dotnet ef` ao gerar/aplicar migrations pela linha de comando.
/// Sem isso, o `dotnet ef` tenta inicializar o Program.cs inteiro (JWT, autenticação,
/// validação de configuração) só para descobrir o DbContext — e falha fora do Docker,
/// onde as variáveis de ambiente reais não existem.
///
/// A connection string aqui não precisa ser válida: o EF só usa o provider (SqlServer)
/// para calcular o SQL da migration, nunca chega a abrir conexão nesse fluxo.
/// </summary>
public sealed class DesignTimeAppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=localhost;Database=ImobooCRM;User Id=sa;Password=DesignTimeOnly;TrustServerCertificate=True");

        return new AppDbContext(optionsBuilder.Options, new DesignTimeTenantContext());
    }

    /// <summary>Tenant vazio: os global query filters não importam para gerar a migration.</summary>
    private sealed class DesignTimeTenantContext : ITenantContext
    {
        public Guid TenantId => Guid.Empty;
        public Guid? UserId => null;
        public bool HasTenant => false;
        public void SetTenant(Guid tenantId, Guid? userId = null) { }
    }
}
