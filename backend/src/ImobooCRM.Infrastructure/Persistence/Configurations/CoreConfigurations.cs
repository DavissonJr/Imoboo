using ImobooCRM.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ImobooCRM.Infrastructure.Persistence.Configurations;

public class TenantConfiguration : IEntityTypeConfiguration<Tenant>
{
    public void Configure(EntityTypeBuilder<Tenant> b)
    {
        b.ToTable("Tenants");
        b.Property(t => t.Name).HasMaxLength(200).IsRequired();
        b.Property(t => t.Slug).HasMaxLength(80).IsRequired();
        b.Property(t => t.Document).HasMaxLength(20);
        b.HasIndex(t => t.Slug).IsUnique();

        b.HasOne(t => t.Settings)
            .WithOne(s => s.Tenant)
            .HasForeignKey<TenantSettings>(s => s.TenantId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class TenantSettingsConfiguration : IEntityTypeConfiguration<TenantSettings>
{
    public void Configure(EntityTypeBuilder<TenantSettings> b)
    {
        b.ToTable("TenantSettings");
        b.Property(s => s.EvolutionInstanceName).HasMaxLength(120);
        b.Property(s => s.WebhookToken).HasMaxLength(200);
        b.Property(s => s.WhatsAppNumber).HasMaxLength(20);
        b.Property(s => s.AiPersona).HasMaxLength(2000);

        // Resolucao instancia -> tenant no webhook. Precisa ser indexada.
        b.HasIndex(s => s.EvolutionInstanceName).IsUnique()
            .HasFilter("[EvolutionInstanceName] IS NOT NULL");
    }
}

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> b)
    {
        b.ToTable("Users");
        b.Property(u => u.Name).HasMaxLength(200).IsRequired();
        b.Property(u => u.Email).HasMaxLength(200).IsRequired();
        b.Property(u => u.PasswordHash).HasMaxLength(500).IsRequired();
        b.Property(u => u.Phone).HasMaxLength(20);

        b.HasIndex(u => u.Email).IsUnique();
        b.HasIndex(u => u.TenantId);
    }
}
