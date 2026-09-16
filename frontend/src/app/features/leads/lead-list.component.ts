import { DatePipe } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { CheckboxModule } from "primeng/checkbox";
import { IconFieldModule } from "primeng/iconfield";
import { InputIconModule } from "primeng/inputicon";
import { InputTextModule } from "primeng/inputtext";
import { SkeletonModule } from "primeng/skeleton";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import {
  LEAD_STATUS_LABEL, LeadListItem, LeadStatus, LeadTemperature, TEMPERATURE_LABEL,
} from "../../core/models";
import { LeadService } from "../../core/services/lead.service";

@Component({
  selector: "app-lead-list",
  standalone: true,
  imports: [
    FormsModule, DatePipe, TableModule, TagModule, ButtonModule,
    InputTextModule, CheckboxModule, IconFieldModule, InputIconModule, SkeletonModule,
  ],
  template: `
    <section class="page">
      <header class="page-head">
        <div>
          <h1>Leads</h1>
          <p class="page-sub">Quem procurou você e o que cada um está buscando.</p>
        </div>
      </header>

      <div class="filters">
        <p-iconfield>
          <p-inputicon class="pi pi-search" />
          <input
            pInputText type="search" placeholder="Buscar por nome ou telefone"
            [(ngModel)]="term" (ngModelChange)="load()" />
        </p-iconfield>

        <label class="filters__check">
          <p-checkbox [(ngModel)]="onlyIdle" (ngModelChange)="load()" [binary]="true" inputId="idle" />
          <span (click)="onlyIdle = !onlyIdle; load()">Sem contato há 3 dias</span>
        </label>
      </div>

      @if (loading()) {
        <p-skeleton height="320px" />
      } @else if (leads().length === 0) {
        <div class="empty">
          <h3>Nenhum lead por aqui</h3>
          <p>Os contatos que chegarem pelo WhatsApp entram automaticamente nesta lista.</p>
        </div>
      } @else {
        <p-table [value]="leads()" styleClass="p-datatable-sm" [rowHover]="true">
          <ng-template #header>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Procura por</th>
              <th>Etapa</th>
              <th>Interesse</th>
              <th>Último contato</th>
            </tr>
          </ng-template>
          <ng-template #body let-l>
            <tr>
              <td class="cell-name">{{ l.name }}</td>
              <td>{{ l.phone }}</td>
              <td>{{ l.preferenceSummary || "—" }}</td>
              <td>{{ statusLabel(l.status) }}</td>
              <td><p-tag [value]="temperatureLabel(l.temperature)" [severity]="temperatureSeverity(l.temperature)" /></td>
              <td>{{ l.lastContactAtUtc ? (l.lastContactAtUtc | date: "dd/MM/yy HH:mm") : "—" }}</td>
            </tr>
          </ng-template>
        </p-table>

        <p class="count">{{ total() }} leads</p>
      }
    </section>
  `,
  styles: [`
    .page { padding: 28px; max-width: 1200px; }
    .page-head { margin-bottom: 24px; }
    .page-head h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 4px; }
    .page-sub { color: var(--p-text-muted-color); margin: 0; font-size: 14px; }

    .filters {
      display: flex; gap: 16px; align-items: center; flex-wrap: wrap;
      padding: 14px 16px; margin-bottom: 16px;
      background: var(--p-content-background); border: 1px solid var(--p-content-border-color); border-radius: 12px;
    }
    .filters p-iconfield { max-width: 320px; width: 100%; }
    .filters p-iconfield input { width: 100%; }
    .filters__check { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--p-text-muted-color); cursor: pointer; }

    .empty {
      text-align: center; padding: 60px 24px; color: var(--p-text-muted-color);
      background: var(--p-content-background); border: 1px solid var(--p-content-border-color); border-radius: 12px;
    }
    .empty h3 { color: var(--p-text-color); margin-bottom: 6px; }
    .empty p { margin: 0; }

    .cell-name { font-weight: 600; }
    .count { margin-top: 10px; font-size: 13px; color: var(--p-text-muted-color); }

    @media (max-width: 820px) {
      .page { padding: 18px; }
    }
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

  temperatureSeverity(t: LeadTemperature): "secondary" | "info" | "warn" {
    return {
      [LeadTemperature.Frio]: "secondary" as const,
      [LeadTemperature.Morno]: "info" as const,
      [LeadTemperature.Quente]: "warn" as const,
    }[t];
  }
}
