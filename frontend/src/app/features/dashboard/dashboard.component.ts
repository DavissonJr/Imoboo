import { DecimalPipe } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { ProgressBarModule } from "primeng/progressbar";
import { SkeletonModule } from "primeng/skeleton";
import { TagModule } from "primeng/tag";
import { DashboardSummary, LEAD_STATUS_LABEL, LeadStatus } from "../../core/models";
import { DashboardService } from "../../core/services/dashboard.service";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [DecimalPipe, RouterLink, CardModule, ButtonModule, TagModule, ProgressBarModule, SkeletonModule],
  template: `
    <section class="page">
      <header class="page-head">
        <h1>Painel</h1>
        <p class="page-sub">Como está o atendimento agora.</p>
      </header>

      @if (loading()) {
        <div class="skeleton-block">
          <p-skeleton height="110px" styleClass="mb-3" />
          <div class="skeleton-grid">
            @for (i of [1,2,3,4,5,6]; track i) { <p-skeleton height="88px" /> }
          </div>
        </div>
      } @else if (error()) {
        <p-card styleClass="empty-card">
          <h3>Não foi possível carregar o painel</h3>
          <p>Verifique sua conexão e tente novamente.</p>
          <p-button label="Tentar de novo" icon="pi pi-refresh" (onClick)="load()" />
        </p-card>
      } @else {
        @if (summary(); as s) {
        <!-- O numero que decide o dia do corretor vem primeiro e sozinho. -->
        <a class="attention" routerLink="/conversas">
          <span class="attention__count">{{ s.conversationsWaitingBroker }}</span>
          <span class="attention__label">
            {{ s.conversationsWaitingBroker === 1 ? "conversa esperando você" : "conversas esperando você" }}
          </span>
          <span class="attention__aside">
            <i class="pi pi-bolt"></i> {{ s.automatedConversations }} sendo conduzidas pela IA
          </span>
        </a>

        <div class="stat-grid">
          <p-card styleClass="stat-card">
            <span class="stat__label">Leads novos</span>
            <span class="stat__value">{{ s.newLeads | number }}</span>
          </p-card>
          <p-card styleClass="stat-card">
            <span class="stat__label">Em atendimento</span>
            <span class="stat__value">{{ s.leadsInProgress | number }}</span>
          </p-card>
          <p-card styleClass="stat-card">
            <span class="stat__label">Leads quentes</span>
            <span class="stat__value stat__value--hot">{{ s.hotLeads | number }}</span>
          </p-card>
          <p-card styleClass="stat-card">
            <span class="stat__label">Sem contato há 3 dias</span>
            <span class="stat__value">{{ s.idleLeads | number }}</span>
          </p-card>
          <p-card styleClass="stat-card">
            <span class="stat__label">Imóveis disponíveis</span>
            <span class="stat__value">{{ s.availableProperties | number }}</span>
            <span class="stat__note">de {{ s.totalProperties | number }} cadastrados</span>
          </p-card>
          <p-card styleClass="stat-card">
            <span class="stat__label">Visitas e retornos</span>
            <span class="stat__value">{{ s.upcomingAppointments | number }}</span>
          </p-card>
        </div>

        <div class="split">
          <p-card styleClass="section-card" header="Funil">
            <ul class="funnel">
              @for (stage of s.funnel; track stage.status) {
                <li>
                  <span class="funnel__label">{{ statusLabel(stage.status) }}</span>
                  <p-progressBar [value]="barWidth(stage.count, s)" [showValue]="false" styleClass="funnel__bar" />
                  <span class="funnel__count">{{ stage.count }}</span>
                </li>
              } @empty {
                <li class="page-sub">Nenhum lead cadastrado ainda.</li>
              }
            </ul>
          </p-card>

          <p-card styleClass="section-card" header="Hoje">
            <dl class="today">
              <dt>Mensagens enviadas</dt>
              <dd>{{ s.messagesSentToday | number }}</dd>
              <dt>Respondidas pela IA</dt>
              <dd>{{ s.aiRepliesToday | number }}</dd>
              <dt>Resolvidas por cache</dt>
              <dd><p-tag value="{{ s.aiCacheHitsToday }}" severity="success" [rounded]="true" /></dd>
            </dl>
            <p class="page-sub">Respostas em cache não geram custo de IA.</p>
          </p-card>
        </div>
        }
      }
    </section>
  `,
  styles: [`
    .page { padding: 28px; max-width: 1120px; }
    .page-head { margin-bottom: 24px; }
    .page-head h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 4px; }
    .page-sub { color: var(--p-text-muted-color); margin: 0; font-size: 14px; }

    .skeleton-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 16px; }

    .attention {
      display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap;
      padding: 22px 26px; margin-bottom: 24px; text-decoration: none; color: inherit;
      background: var(--p-content-background); border-radius: 12px;
      border: 1px solid var(--p-content-border-color); border-left: 4px solid var(--p-orange-500);
      transition: box-shadow 0.2s ease, transform 0.2s ease;
    }
    .attention:hover { box-shadow: 0 8px 24px -12px rgba(0,0,0,0.18); transform: translateY(-1px); }
    .attention__count { font-size: 46px; font-weight: 800; line-height: 1; color: var(--p-orange-500); }
    .attention__label { font-size: 16px; font-weight: 600; }
    .attention__aside {
      margin-left: auto; font-size: 13px; color: var(--p-text-muted-color);
      display: flex; align-items: center; gap: 6px;
    }

    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 16px; margin-bottom: 24px; }
    :host ::ng-deep .stat-card .p-card-body { padding: 16px; }
    :host ::ng-deep .stat-card .p-card-content { display: flex; flex-direction: column; gap: 2px; padding: 0; }
    .stat__label { font-size: 12.5px; color: var(--p-text-muted-color); }
    .stat__value { font-size: 27px; font-weight: 700; letter-spacing: -0.02em; }
    .stat__value--hot { color: var(--p-orange-500); }
    .stat__note { font-size: 11.5px; color: var(--p-text-muted-color); }

    .split { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
    :host ::ng-deep .section-card .p-card-title { font-size: 16px; font-weight: 700; }

    .funnel { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
    .funnel li { display: grid; grid-template-columns: 130px 1fr 34px; align-items: center; gap: 10px; font-size: 13.5px; }
    .funnel__label { color: var(--p-text-color); }
    :host ::ng-deep .funnel__bar.p-progressbar { height: 8px; border-radius: 100px; }
    .funnel__count { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }

    .today { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px 16px; margin: 0 0 12px; }
    .today dt { color: var(--p-text-muted-color); font-size: 13.5px; }
    .today dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; }

    :host ::ng-deep .empty-card { text-align: center; }
    :host ::ng-deep .empty-card .p-card-body { padding: 40px 24px; }

    @media (max-width: 820px) {
      .page { padding: 18px; }
      .split { grid-template-columns: 1fr; }
      .attention__aside { margin-left: 0; width: 100%; }
    }
  `],
})
export class DashboardComponent implements OnInit {
  private readonly service = inject(DashboardService);

  readonly summary = signal<DashboardSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);

    this.service.summary().subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  statusLabel(status: LeadStatus): string {
    return LEAD_STATUS_LABEL[status];
  }

  barWidth(count: number, summary: DashboardSummary): number {
    const max = Math.max(...summary.funnel.map((f) => f.count), 1);
    return (count / max) * 100;
  }
}
