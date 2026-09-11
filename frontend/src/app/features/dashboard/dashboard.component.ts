import { DecimalPipe } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { DashboardSummary, LEAD_STATUS_LABEL, LeadStatus } from "../../core/models";
import { DashboardService } from "../../core/services/dashboard.service";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  template: `
    <section class="page">
      <header class="page__head">
        <h1>Painel</h1>
        <p class="page__sub">Como está o atendimento agora.</p>
      </header>

      @if (loading()) {
        <p class="page__sub">Carregando indicadores...</p>
      } @else if (error()) {
        <div class="panel empty">
          <h3>Não foi possível carregar o painel</h3>
          <p>Verifique sua conexão e tente novamente.</p>
          <button type="button" class="btn" (click)="load()">Tentar de novo</button>
        </div>
      } @else {
        @if (summary(); as s) {
        <!-- O numero que decide o dia do corretor vem primeiro e sozinho. -->
        <a class="attention panel" routerLink="/conversas">
          <span class="attention__count">{{ s.conversationsWaitingBroker }}</span>
          <span class="attention__label">
            {{ s.conversationsWaitingBroker === 1 ? "conversa esperando você" : "conversas esperando você" }}
          </span>
          <span class="attention__aside">{{ s.automatedConversations }} sendo conduzidas pela IA</span>
        </a>

        <div class="grid">
          <div class="panel stat">
            <span class="stat__label">Leads novos</span>
            <span class="stat__value">{{ s.newLeads | number }}</span>
          </div>
          <div class="panel stat">
            <span class="stat__label">Em atendimento</span>
            <span class="stat__value">{{ s.leadsInProgress | number }}</span>
          </div>
          <div class="panel stat">
            <span class="stat__label">Leads quentes</span>
            <span class="stat__value">{{ s.hotLeads | number }}</span>
          </div>
          <div class="panel stat">
            <span class="stat__label">Sem contato há 3 dias</span>
            <span class="stat__value">{{ s.idleLeads | number }}</span>
          </div>
          <div class="panel stat">
            <span class="stat__label">Imóveis disponíveis</span>
            <span class="stat__value">{{ s.availableProperties | number }}</span>
            <span class="stat__note">de {{ s.totalProperties | number }} cadastrados</span>
          </div>
          <div class="panel stat">
            <span class="stat__label">Visitas e retornos</span>
            <span class="stat__value">{{ s.upcomingAppointments | number }}</span>
          </div>
        </div>

        <div class="split">
          <div class="panel section">
            <h2>Funil</h2>
            <ul class="funnel">
              @for (stage of s.funnel; track stage.status) {
                <li>
                  <span>{{ statusLabel(stage.status) }}</span>
                  <span class="funnel__bar">
                    <span [style.width.%]="barWidth(stage.count, s)"></span>
                  </span>
                  <span class="funnel__count">{{ stage.count }}</span>
                </li>
              } @empty {
                <li class="page__sub">Nenhum lead cadastrado ainda.</li>
              }
            </ul>
          </div>

          <div class="panel section">
            <h2>Hoje</h2>
            <dl class="today">
              <dt>Mensagens enviadas</dt>
              <dd>{{ s.messagesSentToday | number }}</dd>
              <dt>Respondidas pela IA</dt>
              <dd>{{ s.aiRepliesToday | number }}</dd>
              <dt>Resolvidas por cache</dt>
              <dd>{{ s.aiCacheHitsToday | number }}</dd>
            </dl>
            <p class="page__sub">Respostas em cache não geram custo de IA.</p>
          </div>
        </div>
        }
      }
    </section>
  `,
  styles: [`
    .page { padding: var(--gap-lg); max-width: 1100px; }
    .page__head { margin-bottom: var(--gap-lg); }
    .page__sub { color: var(--ink-soft); margin: 0; }

    .attention {
      display: flex;
      align-items: baseline;
      gap: var(--gap);
      flex-wrap: wrap;
      padding: var(--gap-lg);
      margin-bottom: var(--gap-lg);
      color: inherit;
      border-left: 4px solid var(--state-wait);
    }
    .attention:hover { text-decoration: none; background: var(--surface-sunken); }
    .attention__count { font-size: 48px; font-weight: 700; line-height: 1; color: var(--state-wait); }
    .attention__label { font-size: 17px; font-weight: 500; }
    .attention__aside { margin-left: auto; font-size: 14px; color: var(--ink-soft); }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: var(--gap);
      margin-bottom: var(--gap-lg);
    }
    .stat { padding: var(--gap); display: flex; flex-direction: column; gap: 2px; }
    .stat__label { font-size: 13px; color: var(--ink-soft); }
    .stat__value { font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
    .stat__note { font-size: 12px; color: var(--ink-faint); }

    .split { display: grid; grid-template-columns: 1.4fr 1fr; gap: var(--gap); }
    .section { padding: var(--gap-lg); }
    .section h2 { margin-bottom: var(--gap); }

    .funnel { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--gap-sm); }
    .funnel li { display: grid; grid-template-columns: 130px 1fr 40px; align-items: center; gap: var(--gap-sm); font-size: 14px; }
    .funnel__bar { height: 8px; background: var(--surface-sunken); border-radius: 100px; overflow: hidden; }
    .funnel__bar > span { display: block; height: 100%; background: var(--ink-soft); }
    .funnel__count { text-align: right; font-variant-numeric: tabular-nums; }

    .today { display: grid; grid-template-columns: 1fr auto; gap: var(--gap-sm) var(--gap); margin: 0 0 var(--gap); }
    .today dt { color: var(--ink-soft); font-size: 14px; }
    .today dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; }

    @media (max-width: 820px) {
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
