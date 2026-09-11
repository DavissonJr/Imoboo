import { DatePipe } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  LEAD_STATUS_LABEL, LeadListItem, LeadStatus, LeadTemperature, TEMPERATURE_LABEL,
} from "../../core/models";
import { LeadService } from "../../core/services/lead.service";

@Component({
  selector: "app-lead-list",
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <section class="page">
      <header class="page__head">
        <div>
          <h1>Leads</h1>
          <p class="page__sub">Quem procurou você e o que cada um está buscando.</p>
        </div>
      </header>

      <div class="filters panel">
        <input type="search" placeholder="Buscar por nome ou telefone" [(ngModel)]="term" (ngModelChange)="load()" />

        <label class="filters__check">
          <input type="checkbox" [(ngModel)]="onlyIdle" (ngModelChange)="load()" />
          Sem contato há 3 dias
        </label>
      </div>

      @if (loading()) {
        <p class="page__sub">Carregando leads...</p>
      } @else if (leads().length === 0) {
        <div class="panel empty">
          <h3>Nenhum lead por aqui</h3>
          <p>Os contatos que chegarem pelo WhatsApp entram automaticamente nesta lista.</p>
        </div>
      } @else {
        <div class="panel">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Procura por</th>
                <th>Etapa</th>
                <th>Interesse</th>
                <th>Último contato</th>
              </tr>
            </thead>
            <tbody>
              @for (l of leads(); track l.id) {
                <tr>
                  <td class="cell-name">{{ l.name }}</td>
                  <td>{{ l.phone }}</td>
                  <td>{{ l.preferenceSummary || "—" }}</td>
                  <td>{{ statusLabel(l.status) }}</td>
                  <td>
                    <span class="state-tag" [class]="temperatureClass(l.temperature)">
                      {{ temperatureLabel(l.temperature) }}
                    </span>
                  </td>
                  <td>{{ l.lastContactAtUtc ? (l.lastContactAtUtc | date: "dd/MM/yy HH:mm") : "—" }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <p class="page__sub count">{{ total() }} leads</p>
      }
    </section>
  `,
  styles: [`
    .page { padding: var(--gap-lg); max-width: 1200px; }
    .page__head { margin-bottom: var(--gap-lg); }
    .page__sub { color: var(--ink-soft); margin: 0; }

    .filters { display: flex; gap: var(--gap); align-items: center; padding: var(--gap); margin-bottom: var(--gap); }
    .filters input[type="search"] { max-width: 340px; }
    .filters__check { display: flex; align-items: center; gap: var(--gap-sm); font-size: 14px; color: var(--ink-soft); white-space: nowrap; }
    .filters__check input { width: auto; }

    .cell-name { font-weight: 500; }
    .count { margin-top: var(--gap-sm); font-size: 13px; }
  `],
})
export class LeadListComponent implements OnInit {
  private readonly service = inject(LeadService);

  readonly leads = signal<LeadListItem[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);

  term = "";
  onlyIdle = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);

    this.service.list({
      term: this.term || undefined,
      idleForDays: this.onlyIdle ? 3 : undefined,
      pageSize: 50,
    }).subscribe({
      next: (result) => {
        this.leads.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  statusLabel(status: LeadStatus): string { return LEAD_STATUS_LABEL[status]; }
  temperatureLabel(t: LeadTemperature): string { return TEMPERATURE_LABEL[t]; }

  temperatureClass(t: LeadTemperature): string {
    return {
      [LeadTemperature.Frio]: "state-tag--closed",
      [LeadTemperature.Morno]: "state-tag--human",
      [LeadTemperature.Quente]: "state-tag--wait",
    }[t];
  }
}
