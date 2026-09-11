using ImobooCRM.Application.Abstractions;
using ImobooCRM.Domain.Entities;
using ImobooCRM.Domain.Enums;
using ImobooCRM.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ImobooCRM.Infrastructure.Persistence;

/// <summary>
/// Dados minimos para subir o ambiente local: um tenant, um usuario e alguns imoveis.
/// Roda apenas em Development.
/// </summary>
public static class DatabaseSeeder
{
    public static async Task SeedAsync(AppDbContext db, IPasswordHasher hasher, ILogger logger, CancellationToken ct = default)
    {
        if (await db.Tenants.AnyAsync(ct)) return;

        logger.LogInformation("Populando dados iniciais de desenvolvimento.");

        var tenantId = Guid.NewGuid();

        var tenant = new Tenant
        {
            Id = tenantId,
            Name = "Imobiliaria Demonstracao",
            Slug = "demo",
            Settings = new TenantSettings
            {
                TenantId = tenantId,
                EvolutionInstanceName = "demo-instance",
                WebhookToken = Guid.NewGuid().ToString("N"),
                AiEnabled = true,
                AiPersona = "Atendemos Recife e Regiao Metropolitana. Tom cordial e objetivo, tratamento por voce."
            }
        };

        db.Tenants.Add(tenant);

        db.Users.Add(new User
        {
            TenantId = tenantId,
            Name = "Corretor Demo",
            Email = "corretor@demo.com",
            PasswordHash = hasher.Hash("Demo@123"),
            Role = UserRole.Admin,
            IsPlatformAdmin = true
        });

        db.Properties.AddRange(
            new Property
            {
                TenantId = tenantId,
                Code = "AP-0101",
                Title = "Apartamento 2 quartos em Boa Viagem",
                Description = "Proximo a orla, andar alto, nascente.",
                Type = PropertyType.Apartamento,
                Purpose = PropertyPurpose.Venda,
                SalePrice = 285_000m,
                CondoFee = 480m,
                AcceptsFinancing = true,
                Bedrooms = 2, Suites = 1, Bathrooms = 2, ParkingSpots = 1,
                UsableArea = 62m, FloorNumber = 8,
                Location = new PropertyLocation { Neighborhood = "Boa Viagem", City = "Recife", State = "PE" }
            },
            new Property
            {
                TenantId = tenantId,
                Code = "AP-0102",
                Title = "Apartamento 2 quartos em Casa Amarela",
                Type = PropertyType.Apartamento,
                Purpose = PropertyPurpose.Venda,
                SalePrice = 240_000m,
                AcceptsFinancing = true,
                Bedrooms = 2, Bathrooms = 1, ParkingSpots = 1, UsableArea = 55m,
                Location = new PropertyLocation { Neighborhood = "Casa Amarela", City = "Recife", State = "PE" }
            },
            new Property
            {
                TenantId = tenantId,
                Code = "CA-0044",
                Title = "Casa 3 quartos em Vitoria de Santo Antao",
                Type = PropertyType.Casa,
                Purpose = PropertyPurpose.Venda,
                SalePrice = 430_000m,
                AcceptsFinancing = true,
                Bedrooms = 3, Suites = 1, Bathrooms = 2, ParkingSpots = 2,
                TotalArea = 220m, UsableArea = 140m,
                Location = new PropertyLocation { Neighborhood = "Centro", City = "Vitoria de Santo Antao", State = "PE" }
            },
            new Property
            {
                TenantId = tenantId,
                Code = "AP-0210",
                Title = "Apartamento para alugar em Espinheiro",
                Type = PropertyType.Apartamento,
                Purpose = PropertyPurpose.Locacao,
                RentPrice = 2_100m,
                CondoFee = 620m,
                Bedrooms = 2, Bathrooms = 2, ParkingSpots = 1, UsableArea = 70m,
                Location = new PropertyLocation { Neighborhood = "Espinheiro", City = "Recife", State = "PE" }
            });

        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "Seed concluido. TenantId={TenantId} Login=corretor@demo.com", tenantId);
    }
}
