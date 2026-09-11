using ImobooCRM.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ImobooCRM.Infrastructure.Persistence.Configurations;

public class PropertyConfiguration : IEntityTypeConfiguration<Property>
{
    public void Configure(EntityTypeBuilder<Property> b)
    {
        b.ToTable("Properties");
        b.Property(p => p.Code).HasMaxLength(40).IsRequired();
        b.Property(p => p.Title).HasMaxLength(250).IsRequired();
        b.Property(p => p.Description).HasMaxLength(4000);

        b.Property(p => p.SalePrice).HasPrecision(18, 2);
        b.Property(p => p.RentPrice).HasPrecision(18, 2);
        b.Property(p => p.CondoFee).HasPrecision(18, 2);
        b.Property(p => p.PropertyTax).HasPrecision(18, 2);
        b.Property(p => p.TotalArea).HasPrecision(10, 2);
        b.Property(p => p.UsableArea).HasPrecision(10, 2);

        b.OwnsOne(p => p.Location, loc =>
        {
            loc.Property(l => l.Street).HasColumnName("Street").HasMaxLength(250);
            loc.Property(l => l.Number).HasColumnName("Number").HasMaxLength(20);
            loc.Property(l => l.Complement).HasColumnName("Complement").HasMaxLength(100);
            loc.Property(l => l.Neighborhood).HasColumnName("Neighborhood").HasMaxLength(120).IsRequired();
            loc.Property(l => l.City).HasColumnName("City").HasMaxLength(120).IsRequired();
            loc.Property(l => l.State).HasColumnName("State").HasMaxLength(2).IsRequired();
            loc.Property(l => l.ZipCode).HasColumnName("ZipCode").HasMaxLength(9);

            loc.HasIndex(l => new { l.City, l.Neighborhood });
        });

        // Codigo unico dentro do tenant, nao globalmente.
        b.HasIndex(p => new { p.TenantId, p.Code }).IsUnique();

        // Indice de cobertura da busca principal do catalogo.
        b.HasIndex(p => new { p.TenantId, p.Status, p.Purpose, p.Type, p.Bedrooms })
            .HasDatabaseName("IX_Properties_Search");

        b.HasIndex(p => new { p.TenantId, p.SalePrice });
        b.HasIndex(p => new { p.TenantId, p.RentPrice });

        b.HasOne(p => p.AssignedUser)
            .WithMany()
            .HasForeignKey(p => p.AssignedUserId)
            .OnDelete(DeleteBehavior.SetNull);

        b.HasMany(p => p.Photos).WithOne(x => x.Property!)
            .HasForeignKey(x => x.PropertyId).OnDelete(DeleteBehavior.Cascade);

        b.HasMany(p => p.Features).WithOne(x => x.Property!)
            .HasForeignKey(x => x.PropertyId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class PropertyPhotoConfiguration : IEntityTypeConfiguration<PropertyPhoto>
{
    public void Configure(EntityTypeBuilder<PropertyPhoto> b)
    {
        b.ToTable("PropertyPhotos");
        b.Property(p => p.Url).HasMaxLength(1000).IsRequired();
        b.Property(p => p.Caption).HasMaxLength(250);
        b.HasIndex(p => new { p.PropertyId, p.SortOrder });
    }
}

public class PropertyFeatureConfiguration : IEntityTypeConfiguration<PropertyFeature>
{
    public void Configure(EntityTypeBuilder<PropertyFeature> b)
    {
        b.ToTable("PropertyFeatures");
        b.Property(f => f.Name).HasMaxLength(120).IsRequired();
        b.HasIndex(f => new { f.PropertyId, f.Name }).IsUnique();
    }
}
