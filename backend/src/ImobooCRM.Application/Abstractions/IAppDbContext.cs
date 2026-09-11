using ImobooCRM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ImobooCRM.Application.Abstractions;

public interface IAppDbContext
{
    DbSet<Tenant> Tenants { get; }
    DbSet<TenantSettings> TenantSettings { get; }
    DbSet<User> Users { get; }
    DbSet<Property> Properties { get; }
    DbSet<PropertyPhoto> PropertyPhotos { get; }
    DbSet<PropertyFeature> PropertyFeatures { get; }
    DbSet<Lead> Leads { get; }
    DbSet<Conversation> Conversations { get; }
    DbSet<Message> Messages { get; }
    DbSet<MessageProperty> MessageProperties { get; }
    DbSet<Appointment> Appointments { get; }
    DbSet<InboundWebhookEvent> InboundWebhookEvents { get; }
    DbSet<AiUsageLog> AiUsageLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
