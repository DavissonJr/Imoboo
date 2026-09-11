import { CurrencyPipe } from "@angular/common";
import { Component, OnDestroy, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from "rxjs";
import {
  PROPERTY_PURPOSE_LABEL, PROPERTY_STATUS_LABEL, PROPERTY_TYPE_LABEL,
  PropertyListItem, PropertyPurpose, PropertyStatus, PropertyType,
} from "../../core/models";
import { PropertyService } from "../../core/services/property.service";

@Component({
  selector: "app-property-list",
  standalone: true,
  imports: [FormsModule, CurrencyPipe, RouterLink],
  template: `
    <section class="page">
      <header class="page__head">
        <div>
          <h1>Imóveis</h1>
          <p class="page__sub">O que a IA pode oferecer aos clientes vem daqui.</p>
        </div>
        <a routerLink="/imoveis/novo" class="btn btn--primary">Cadastrar imóvel</a>
      </header>

      <div class="filters panel">
        <input
          type="search"
          placeholder="Buscar por código, título ou bairro"
          [ngModel]="term()"
          (ngModelChange)="term$.next($event)" />

        <label class="filters__check">
          <input type="checkbox" [(ngModel)]="onlyAvailable" (ngModelChange)="load()" />
          Só disponíveis
        </label>
      </div>

      @if (loading()) {
        <p class="page__sub">Carregando imóveis...</p>
      } @else if (properties().length === 0) {
        <div class="panel empty">
          <h3>Nenhum imóvel encontrado</h3>
          <p>Cadastre imóveis para que a IA possa apresentá-los aos clientes.</p>
        </div>
      } @else {
        <div class="panel">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Imóvel</th>
                <th>Local</th>
                <th>Configuração</th>
                <th>Preço</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (p of properties(); track p.id) {
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
                  <td>{{ statusLabel(p.status) }}</td>
                  <td class="cell-actions">
                    <a [routerLink]="['/imoveis', p.id, 'editar']" class="btn btn--quiet">Editar</a>
                    <button type="button" class="btn btn--quiet" (click)="remove(p)">Excluir</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <p class="page__sub count">{{ total() }} imóveis</p>
      }
    </section>
  `,
  styles: [`
    .page { padding: var(--gap-lg); max-width: 1200px; }
    .page__head { display: flex; justify-content: space-between; align-items: flex-end; gap: var(--gap); margin-bottom: var(--gap-lg); }
    .page__sub { color: var(--ink-soft); margin: 0; }

    .filters { display: flex; gap: var(--gap); align-items: center; padding: var(--gap); margin-bottom: var(--gap); }
    .filters input[type="search"] { max-width: 380px; }
    .filters__check { display: flex; align-items: center; gap: var(--gap-sm); font-size: 14px; color: var(--ink-soft); white-space: nowrap; }
    .filters__check input { width: auto; }

    .cell-title { display: block; font-weight: 500; }
    .cell-note { display: block; font-size: 12px; color: var(--ink-faint); }
    .cell-price { font-variant-numeric: tabular-nums; font-weight: 500; }
    .cell-actions { display: flex; gap: 4px; white-space: nowrap; }

    .count { margin-top: var(--gap-sm); font-size: 13px; }
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

  remove(property: PropertyListItem): void {
    const confirmed = confirm(`Excluir o imóvel ${property.code}? Essa ação não pode ser desfeita.`);
    if (!confirmed) return;

    this.service.remove(property.id).subscribe({
      next: () => this.load(),
    });
  }
}
