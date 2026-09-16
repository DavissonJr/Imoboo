import { CurrencyPipe } from "@angular/common";
import { Component, OnDestroy, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from "rxjs";
import { ButtonModule } from "primeng/button";
import { CheckboxModule } from "primeng/checkbox";
import { IconFieldModule } from "primeng/iconfield";
import { InputIconModule } from "primeng/inputicon";
import { InputTextModule } from "primeng/inputtext";
import { PaginatorModule, PaginatorState } from "primeng/paginator";
import { SkeletonModule } from "primeng/skeleton";
import { TagModule } from "primeng/tag";
import {
  PROPERTY_PURPOSE_LABEL, PROPERTY_STATUS_LABEL, PROPERTY_TYPE_LABEL,
  PropertyListItem, PropertyPurpose, PropertyStatus, PropertyType,
} from "../../core/models";
import { PropertyService } from "../../core/services/property.service";

const PAGE_SIZE = 12;

@Component({
  selector: "app-property-list",
  standalone: true,
  imports: [
    FormsModule, CurrencyPipe, RouterLink, ButtonModule, TagModule,
    InputTextModule, CheckboxModule, IconFieldModule, InputIconModule, SkeletonModule, PaginatorModule,
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
        <div class="card-grid">
          @for (i of skeletonRows; track i) { <p-skeleton height="320px" borderRadius="14px" /> }
        </div>
      } @else if (properties().length === 0) {
        <div class="empty">
          <h3>Nenhum imóvel encontrado</h3>
          <p>Cadastre imóveis para que a IA possa apresentá-los aos clientes.</p>
        </div>
      } @else {
        <div class="card-grid">
          @for (p of properties(); track p.id) {
            <article class="pcard">
              <div class="pcard__photo">
                @if (p.coverPhotoUrl) {
                  <img [src]="p.coverPhotoUrl" [alt]="p.title" loading="lazy" />
                } @else {
                  <div class="pcard__placeholder"><i class="pi pi-image"></i></div>
                }
                <div class="pcard__photo-fade"></div>
                <span class="pcard__badge">{{ purposeLabel(p.purpose) }}</span>
                <p-tag class="pcard__status" [value]="statusLabel(p.status)" [severity]="statusSeverity(p.status)" />
              </div>

              <div class="pcard__body">
                <span class="pcard__price">{{ (p.salePrice ?? p.rentPrice) | currency: "BRL" : "symbol" : "1.0-0" }}</span>
                <span class="pcard__code">{{ p.code }}</span>
                <h3 class="pcard__title">{{ p.title }}</h3>
                <span class="pcard__location"><i class="pi pi-map-marker"></i> {{ p.neighborhood }}, {{ p.city }}/{{ p.state }}</span>

                <div class="pcard__facts">
                  <span><i class="pi pi-home"></i> {{ p.bedrooms }}</span>
                  <span><i class="pi pi-circle-fill pcard__dot"></i>{{ p.bathrooms }} banh.</span>
                  <span><i class="pi pi-circle-fill pcard__dot"></i>{{ p.parkingSpots }} vg.</span>
                  @if (p.usableArea) { <span><i class="pi pi-circle-fill pcard__dot"></i>{{ p.usableArea }} m²</span> }
                </div>

                @if (p.acceptsFinancing) {
                  <span class="pcard__financing"><i class="pi pi-check-circle"></i> Aceita financiamento</span>
                }
              </div>

              <div class="pcard__footer">
                <p-button label="Editar" icon="pi pi-pencil" [text]="true" size="small" [routerLink]="['/imoveis', p.id, 'editar']" />
                <p-button icon="pi pi-trash" [text]="true" [rounded]="true" size="small" severity="danger" (onClick)="remove(p)" />
              </div>
            </article>
          }
        </div>

        <p-paginator
          [rows]="pageSize" [totalRecords]="total()" [first]="first()"
          (onPageChange)="onPageChange($event)" styleClass="pager" />
      }
    </section>
  `,
  styles: [`
    .page { padding: 28px; max-width: 1280px; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .page-head h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 4px; }
    .page-sub { color: var(--p-text-muted-color); margin: 0; font-size: 14px; }

    .filters {
      display: flex; gap: 16px; align-items: center; flex-wrap: wrap;
      padding: 14px 16px; margin-bottom: 20px;
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

    .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 18px; margin-bottom: 20px; }

    .pcard {
      display: flex; flex-direction: column;
      background: var(--p-content-background); border: 1px solid var(--p-content-border-color);
      border-radius: 14px; overflow: hidden;
      transition: box-shadow 0.2s ease, transform 0.2s ease;
    }
    .pcard:hover { box-shadow: 0 16px 32px -18px rgba(0,0,0,0.25); transform: translateY(-2px); }

    .pcard__photo { position: relative; aspect-ratio: 4 / 3; background: var(--p-surface-100); }
    .pcard__photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .pcard__placeholder { width: 100%; height: 100%; display: grid; place-items: center; color: var(--p-surface-400); font-size: 32px; }
    .pcard__photo-fade {
      position: absolute; inset: auto 0 0 0; height: 60%;
      background: linear-gradient(to top, rgba(0,0,0,0.55), transparent);
      pointer-events: none;
    }
    .pcard__badge {
      position: absolute; top: 10px; left: 10px; padding: 3px 10px; border-radius: 100px;
      background: rgba(255,255,255,0.92); color: var(--p-text-color); font-size: 11px; font-weight: 700;
    }
    :host ::ng-deep .pcard__status { position: absolute; top: 10px; right: 10px; }

    .pcard__body { padding: 16px; display: flex; flex-direction: column; gap: 3px; flex: 1; }
    .pcard__price { font-size: 19px; font-weight: 800; letter-spacing: -0.02em; }
    .pcard__code { font-family: var(--font-code); font-size: 11px; color: var(--p-text-muted-color); }
    .pcard__title { margin: 4px 0 0; font-size: 14.5px; font-weight: 600; line-height: 1.3; }
    .pcard__location {
      font-size: 12.5px; color: var(--p-text-muted-color); display: flex; align-items: center; gap: 4px; margin-top: 2px;
    }

    .pcard__facts {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      margin-top: 10px; font-size: 12.5px; color: var(--p-text-color);
    }
    .pcard__facts span { display: flex; align-items: center; gap: 4px; }
    .pcard__dot { font-size: 3px !important; color: var(--p-surface-400); }

    .pcard__financing {
      margin-top: 8px; font-size: 12px; font-weight: 600; color: var(--p-green-600);
      display: flex; align-items: center; gap: 5px;
    }

    .pcard__footer {
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 10px; border-top: 1px solid var(--p-content-border-color);
    }

    :host ::ng-deep .pager .p-paginator { background: transparent; padding: 0; justify-content: center; }

    @media (max-width: 820px) {
      .page { padding: 18px; }
      .card-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
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
  readonly first = signal(0);

  readonly pageSize = PAGE_SIZE;
  readonly skeletonRows = Array.from({ length: PAGE_SIZE }, (_, i) => i);

  readonly term$ = new Subject<string>();
  onlyAvailable = true;

  ngOnInit(): void {
    this.load();

    // Debounce evita uma requisicao por tecla digitada.
    this.term$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => {
        this.term.set(term);
        this.first.set(0);
        this.load();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading.set(true);

    const page = Math.floor(this.first() / this.pageSize) + 1;

    this.service.list({
      term: this.term(), onlyAvailable: this.onlyAvailable, page, pageSize: this.pageSize,
    }).subscribe({
      next: (result) => {
        this.properties.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPageChange(event: PaginatorState): void {
    this.first.set(event.first ?? 0);
    this.load();
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
