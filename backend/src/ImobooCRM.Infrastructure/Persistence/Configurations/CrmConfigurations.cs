using ImobooCRM.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ImobooCRM.Infrastructure.Persistence.Configurations;

public class LeadConfiguration : IEntityTypeConfiguration<Lead>
{
    public void Configure(EntityTypeBuilder<Lead> b)
    {
        b.ToTable("Leads");
        b.Property(l => l.Name).HasMaxLength(200).IsRequired();
        b.Property(l => l.Phone).HasMaxLength(20).IsRequired();
        b.Property(l => l.Email).HasMaxLength(200);
        b.Property(l => l.Notes).HasMaxLength(4000);
        b.Property(l => l.AiSummary).HasMaxLength(2000);

        // Telefone e a chave natural do lead dentro do tenant.
        b.HasIndex(l => new { l.TenantId, l.Phone }).IsUnique();
        b.HasIndex(l => new { l.TenantId, l.Status });
        b.HasIndex(l => new { l.TenantId, l.LastContactAtUtc });

        b.OwnsOne(l => l.Preference, pref =>
        {
            pref.Property(p => p.Purpose).HasColumnName("PrefPurpose");
            pref.Property(p => p.PropertyType).HasColumnName("PrefPropertyType");
            pref.Property(p => p.MinPrice).HasColumnName("PrefMinPrice").HasPrecision(18, 2);
            pref.Property(p => p.MaxPrice).HasColumnName("PrefMaxPrice").HasPrecision(18, 2);
            pref.Property(p => p.MinBedrooms).HasColumnName("PrefMinBedrooms");
            pref.Property(p => p.MinBathrooms).HasColumnName("PrefMinBathrooms");
            pref.Property(p => p.MinParkingSpots).HasColumnName("PrefMinParkingSpots");
            pref.Property(p => p.MinArea).HasColumnName("PrefMinArea").HasPrecision(10, 2);
            pref.Property(p => p.City).HasColumnName("PrefCity").HasMaxLength(120);
            pref.Property(p => p.Neighborhoods).HasColumnName("PrefNeighborhoods").HasMaxLength(500);
            pref.Property(p => p.NeedsFinancing).HasColumnName("PrefNeedsFinancing");
        });

        b.HasOne(l => l.AssignedUser).WithMany()
            .HasForeignKey(l => l.AssignedUserId).OnDelete(DeleteBehavior.SetNull);
    }
}

public class ConversationConfiguration : IEntityTypeConfiguration<Conversation>
{
    public void Configure(EntityTypeBuilder<Conversation> b)
    {
        b.ToTable("Conversations");
        b.Property(c => c.ExternalChatId).HasMaxLength(120).IsRequired();
        b.Property(c => c.Channel).HasMaxLength(30).IsRequired();
        b.Property(c => c.LastMessagePreview).HasMaxLength(140);

        b.HasIndex(c => new { c.TenantId, c.LastMessageAtUtc });
        b.HasIndex(c => new { c.TenantId, c.Status, c.Mode });
        b.HasIndex(c => new { c.TenantId, c.LeadId });

        b.HasOne(c => c.Lead).WithMany(l => l.Conversations)
            .HasForeignKey(c => c.LeadId).OnDelete(DeleteBehavior.Cascade);

        b.HasOne(c => c.AssignedUser).WithMany()
            .HasForeignKey(c => c.AssignedUserId).OnDelete(DeleteBehavior.SetNull);
    }
}

public class MessageConfiguration : IEntityTypeConfiguration<Message>
{
    public void Configure(EntityTypeBuilder<Message> b)
    {
        b.ToTable("Messages");
        b.Property(m => m.Content).HasMaxLength(4000).IsRequired();
        b.Property(m => m.ExternalMessageId).HasMaxLength(150);
        b.Property(m => m.MediaUrl).HasMaxLength(1000);
        b.Property(m => m.MediaType).HasMaxLength(50);
        b.Property(m => m.FailureReason).HasMaxLength(500);

        b.HasIndex(m => new { m.ConversationId, m.SentAtUtc });

        // Idempotencia de webhook no nivel do banco: a mesma mensagem do provedor
        // nao pode ser gravada duas vezes, mesmo com corrida entre replicas.
        b.HasIndex(m => new { m.TenantId, m.ExternalMessageId })
            .IsUnique()
            .HasFilter("[ExternalMessageId] IS NOT NULL");

        b.HasOne(m => m.Conversation).WithMany(c => c.Messages)
            .HasForeignKey(m => m.ConversationId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class MessagePropertyConfiguration : IEntityTypeConfiguration<MessageProperty>
{
    public void Configure(EntityTypeBuilder<MessageProperty> b)
    {
        b.ToTable("MessageProperties");
        b.HasIndex(mp => new { mp.MessageId, mp.PropertyId }).IsUnique();

        b.HasOne(mp => mp.Message).WithMany(m => m.RelatedProperties)
            .HasForeignKey(mp => mp.MessageId).OnDelete(DeleteBehavior.Cascade);

        b.HasOne(mp => mp.Property).WithMany()
            .HasForeignKey(mp => mp.PropertyId).OnDelete(DeleteBehavior.NoAction);
    }
}

public class AppointmentConfiguration : IEntityTypeConfiguration<Appointment>
{
    public void Configure(EntityTypeBuilder<Appointment> b)
    {
        b.ToTable("Appointments");
        b.Property(a => a.Notes).HasMaxLength(1000);
        b.HasIndex(a => new { a.TenantId, a.ScheduledAtUtc });

        b.HasOne(a => a.Lead).WithMany(l => l.Appointments)
            .HasForeignKey(a => a.LeadId).OnDelete(DeleteBehavior.Cascade);

        b.HasOne(a => a.Property).WithMany()
            .HasForeignKey(a => a.PropertyId).OnDelete(DeleteBehavior.SetNull);

        b.HasOne(a => a.AssignedUser).WithMany()
            .HasForeignKey(a => a.AssignedUserId).OnDelete(DeleteBehavior.SetNull);
    }
}

public class InboundWebhookEventConfiguration : IEntityTypeConfiguration<InboundWebhookEvent>
{
    public void Configure(EntityTypeBuilder<InboundWebhookEvent> b)
    {
        b.ToTable("InboundWebhookEvents");
        b.Property(e => e.Provider).HasMaxLength(40).IsRequired();
        b.Property(e => e.ExternalEventId).HasMaxLength(200).IsRequired();
        b.Property(e => e.EventType).HasMaxLength(80).IsRequired();
        b.Property(e => e.Error).HasMaxLength(1000);

        // Barreira de idempotencia: insert duplicado falha e o evento e descartado.
        b.HasIndex(e => new { e.Provider, e.ExternalEventId }).IsUnique();
        b.HasIndex(e => e.ReceivedAtUtc);
    }
}

public class AiUsageLogConfiguration : IEntityTypeConfiguration<AiUsageLog>
{
    public void Configure(EntityTypeBuilder<AiUsageLog> b)
    {
        b.ToTable("AiUsageLogs");
        b.Property(a => a.Operation).HasMaxLength(40).IsRequired();
        b.Property(a => a.Model).HasMaxLength(80).IsRequired();
        b.Property(a => a.ErrorCode).HasMaxLength(80);
        b.HasIndex(a => new { a.TenantId, a.CreatedAtUtc });
    }
}
