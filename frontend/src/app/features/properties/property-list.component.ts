import { CurrencyPipe } from "@angular/common";
import { Component, OnDestroy, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from "rxjs";
import { ButtonModule } from "primeng/button";
import { CheckboxModule } from "primeng/checkbox";
import { IconFieldModule } from "primeng/iconfield";
import { InputIconModule } from "primeng/inputicon";
import { InputTextModule } from "primeng/inputtext";
import { SkeletonModule } from "primeng/skeleton";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import {
  PROPERTY_PURPOSE_LABEL, PROPERTY_STATUS_LABEL, PROPERTY_TYPE_LABEL,
  PropertyListItem, PropertyPurpose, PropertyStatus, PropertyType,
} from "../../core/models";
import { PropertyService } from "../../core/services/property.service";

@Component({
  selector: "app-property-list",
  standalone: true,
  imports: [
    FormsModule, CurrencyPipe, RouterLink, TableModule, TagModule, ButtonModule,
    InputTextModule, CheckboxModule, IconFieldModule, InputIconModule, SkeletonModule,
  ],
  template: `
    <section class="page">
      <header class="page-head">
        <div>
          <h1>Imóveis</h1>
          <p class="page-sub">O que a IA pode oferecer aos clientes vem daqui.</p>
        </div>
        <p-button label="Cadastrar imóvel" icon="pi pi-plus" routerLink="/imoveis/novo" />
      </header>

      <div class="filters">
        <p-iconfield>
          <p-inputicon class="pi pi-search" />
          <input
            pInputText type="search" placeholder="Buscar por código, título ou bairro"
            [ngModel]="term()" (ngModelChange)="term$.next($event)" />
        </p-iconfield>

        <label class="filters__check">
          <p-checkbox [(ngModel)]="onlyAvailable" (ngModelChange)="load()" [binary]="true" inputId="avail" />
          <span (click)="onlyAvailable = !onlyAvailable; load()">Só disponíveis</span>
        </label>
      </div>

      @if (loading()) {
        <p-skeleton height="320px" />
      } @else if (properties().length === 0) {
        <div class="empty">
          <h3>Nenhum imóvel encontrado</h3>
          <p>Cadastre imóveis para que a IA possa apresentá-los aos clientes.</p>
        </div>
      } @else {
        <p-table [value]="properties()" styleClass="p-datatable-sm" [rowHover]="true">
          <ng-template #header>
            <tr>
              <th>Código</th>
              <th>Imóvel</th>
              <th>Local</th>
              <th>Configuração</th>
              <th>Preço</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </ng-template>
          <ng-template #body let-p>
            <tr>
              <td><span class="code">{{ p.code }}</span></td>
              <td>
                <span class="cell-title">{{ p.title }}</span>
                <span class="cell-note">{{ typeLabel(p.type) }} · {{ purposeLabel(p.purpose) }}</span>
              </td>
              <td>{{ p.neighborhood }}, {{ p.city }}/{{ p.state }}</td>
              <td>
                {{ p.bedrooms }} q · {{ p.bathrooms }} b · {{ p.parkingSpots }} vg
                @if (p.usableArea) { <span class="cell-note">{{ p.usableArea }} m²</span> }
              </td>
              <td class="cell-price">
                {{ (p.salePrice ?? p.rentPrice) | currency: "BRL" : "symbol" : "1.0-0" }}
                @if (p.acceptsFinancing) { <span class="cell-note">aceita financiamento</span> }
              </td>
              <td><p-tag [value]="statusLabel(p.status)" [severity]="statusSeverity(p.status)" /></td>
              <td class="cell-actions">
                <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" [routerLink]="['/imoveis', p.id, 'editar']" />
                <p-button icon="pi pi-trash" [text]="true" [rounded]="true" severity="danger" (onClick)="remove(p)" />
              </td>
            </tr>
          </ng-template>
        </p-table>

        <p class="count">{{ total() }} imóveis</p>
      }
    </section>
  `,
  styles: [`
    .page { padding: 28px; max-width: 1200px; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .page-head h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 4px; }
    .page-sub { color: var(--p-text-muted-color); margin: 0; font-size: 14px; }

    .filters {
      display: flex; gap: 16px; align-items: center; flex-wrap: wrap;
      padding: 14px 16px; margin-bottom: 16px;
      background: var(--p-content-background); border: 1px solid var(--p-content-border-color); border-radius: 12px;
    }
    .filters p-iconfield { max-width: 380px; width: 100%; }
    .filters p-iconfield input { width: 100%; }
    .filters__check { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--p-text-muted-color); cursor: pointer; }

    .empty {
      text-align: center; padding: 60px 24px; color: var(--p-text-muted-color);
      background: var(--p-content-background); border: 1px solid var(--p-content-border-color); border-radius: 12px;
    }
    .empty h3 { color: var(--p-text-color); margin-bottom: 6px; }
    .empty p { margin: 0; }

    .code { font-family: var(--font-code); font-size: 12px; color: var(--p-text-muted-color); }
    .cell-title { display: block; font-weight: 600; }
    .cell-note { display: block; font-size: 12px; color: var(--p-text-muted-color); }
    .cell-price { font-variant-numeric: tabular-nums; font-weight: 600; }
    .cell-actions { display: flex; gap: 2px; white-space: nowrap; }

    .count { margin-top: 10px; font-size: 13px; color: var(--p-text-muted-color); }

    @media (max-width: 820px) {
      .page { padding: 18px; }
    }
  `],
})
export class PropertyListComponent implements OnInit, OnDestroy {
  private readonly service = inject(PropertyService);
  private readonly destroy$ = new Subject<void>();

  readonly properties = signal<PropertyListItem[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly term = signal("");

  readonly term$ = new Subject<string>();
  onlyAvailable = true;

  ngOnInit(): void {
    this.load();

    // Debounce evita uma requisicao por tecla digitada.
    this.term$
      .pipe(
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((term) => {
          this.term.set(term);
          this.loading.set(true);
          return this.service.list({ term, onlyAvailable: this.onlyAvailable, pageSize: 50 });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (result) => {
          this.properties.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading.set(true);

    this.service.list({ term: this.term(), onlyAvailable: this.onlyAvailable, pageSize: 50 }).subscribe({
      next: (result) => {
        this.properties.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  typeLabel(type: PropertyType): string { return PROPERTY_TYPE_LABEL[type]; }
  purposeLabel(purpose: PropertyPurpose): string { return PROPERTY_PURPOSE_LABEL[purpose]; }
  statusLabel(status: PropertyStatus): string { return PROPERTY_STATUS_LABEL[status]; }

  statusSeverity(status: PropertyStatus): "success" | "warn" | "secondary" | "danger" {
    switch (status) {
      case PropertyStatus.Disponivel: return "success";
      case PropertyStatus.Reservado: return "warn";
      case PropertyStatus.Vendido:
      case PropertyStatus.Alugado: return "secondary";
      default: return "danger";
    }
  }

  remove(property: PropertyListItem): void {
    const confirmed = confirm(`Excluir o imóvel ${property.code}? Essa ação não pode ser desfeita.`);
    if (!confirmed) return;

    this.service.remove(property.id).subscribe({
      next: () => this.load(),
    });
  }
}
