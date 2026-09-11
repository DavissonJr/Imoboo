using ImobooCRM.Application.Abstractions;
using ImobooCRM.Domain.Common;
using ImobooCRM.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace ImobooCRM.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenantContext)
    : DbContext(options), IAppDbContext
{
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<TenantSettings> TenantSettings => Set<TenantSettings>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Property> Properties => Set<Property>();
    public DbSet<PropertyPhoto> PropertyPhotos => Set<PropertyPhoto>();
    public DbSet<PropertyFeature> PropertyFeatures => Set<PropertyFeature>();
    public DbSet<Lead> Leads => Set<Lead>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<MessageProperty> MessageProperties => Set<MessageProperty>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<InboundWebhookEvent> InboundWebhookEvents => Set<InboundWebhookEvent>();
    public DbSet<AiUsageLog> AiUsageLogs => Set<AiUsageLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Isolamento de tenant no nivel do modelo.
        // Toda consulta a uma entidade ITenantScoped ganha o WHERE automaticamente:
        // esquecer o filtro em um repositorio deixa de ser uma falha de seguranca.
        modelBuilder.Entity<TenantSettings>().HasQueryFilter(e => e.TenantId == tenantContext.TenantId);
        modelBuilder.Entity<User>().HasQueryFilter(e => e.TenantId == tenantContext.TenantId);
        modelBuilder.Entity<Property>().HasQueryFilter(e => e.TenantId == tenantContext.TenantId);
        modelBuilder.Entity<PropertyPhoto>().HasQueryFilter(e => e.TenantId == tenantContext.TenantId);
        modelBuilder.Entity<PropertyFeature>().HasQueryFilter(e => e.TenantId == tenantContext.TenantId);
        modelBuilder.Entity<Lead>().HasQueryFilter(e => e.TenantId == tenantContext.TenantId);
        modelBuilder.Entity<Conversation>().HasQueryFilter(e => e.TenantId == tenantContext.TenantId);
        modelBuilder.Entity<Message>().HasQueryFilter(e => e.TenantId == tenantContext.TenantId);
        modelBuilder.Entity<MessageProperty>().HasQueryFilter(e => e.TenantId == tenantContext.TenantId);
        modelBuilder.Entity<Appointment>().HasQueryFilter(e => e.TenantId == tenantContext.TenantId);
        modelBuilder.Entity<AiUsageLog>().HasQueryFilter(e => e.TenantId == tenantContext.TenantId);

        base.OnModelCreating(modelBuilder);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyTenantAndTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Preenche TenantId no insert e bloqueia insert/update cruzado.
    /// O TenantId nunca vem do payload da requisicao.
    /// </summary>
    private void ApplyTenantAndTimestamps()
    {
        var now = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.Entity is BaseEntity entity)
            {
                if (entry.State == EntityState.Added) entity.CreatedAtUtc = now;
                if (entry.State == EntityState.Modified) entity.UpdatedAtUtc = now;
            }

            if (entry.Entity is not ITenantScoped scoped) continue;

            switch (entry.State)
            {
                case EntityState.Added:
                    if (scoped.TenantId == Guid.Empty) scoped.TenantId = tenantContext.TenantId;
                    else Guard(entry, scoped);
                    break;

                case EntityState.Modified or EntityState.Deleted:
                    Guard(entry, scoped);
                    break;
            }
        }
    }

    private void Guard(EntityEntry entry, ITenantScoped scoped)
    {
        if (tenantContext.HasTenant && scoped.TenantId != tenantContext.TenantId)
            throw new InvalidOperationException(
                $"Tentativa de gravar {entry.Entity.GetType().Name} de outro tenant foi bloqueada.");
    }
}
