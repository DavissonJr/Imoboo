import { CurrencyPipe } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import {
  PROPERTY_PURPOSE_LABEL, PROPERTY_TYPE_LABEL, PropertyListItem,
  PropertyPurpose, PropertyType,
} from "../../core/models";
import { PublicCatalogService } from "../../core/services/public-catalog.service";

@Component({
  selector: "app-public-catalog",
  standalone: true,
  imports: [FormsModule, CurrencyPipe],
  template: `
    <div class="pc">
      <header class="pc-head">
        <span class="pc-brand">Imoboo</span>
        @if (tenantName()) {
          <h1>{{ tenantName() }}</h1>
          <p>Imóveis disponíveis agora.</p>
        }
      </header>

      @if (notFound()) {
        <div class="pc-empty">
          <h2>Catálogo não encontrado</h2>
          <p>O link pode estar incorreto ou a conta não está mais ativa.</p>
        </div>
      } @else {
        <div class="pc-filters">
          <select [(ngModel)]="purpose" (ngModelChange)="applyFilters()">
            <option [ngValue]="undefined">Comprar ou alugar</option>
            <option [ngValue]="PurposeEnum.Venda">Comprar</option>
            <option [ngValue]="PurposeEnum.Locacao">Alugar</option>
          </select>
          <select [(ngModel)]="type" (ngModelChange)="applyFilters()">
            <option [ngValue]="undefined">Qualquer tipo</option>
            @for (t of typeOptions; track t.value) {
              <option [ngValue]="t.value">{{ t.label }}</option>
            }
          </select>
          <input type="text" placeholder="Bairro ou cidade" [(ngModel)]="term" (change)="applyFilters()" />
          <select [(ngModel)]="minBedrooms" (ngModelChange)="applyFilters()">
            <option [ngValue]="undefined">Quartos</option>
            <option [ngValue]="1">1+</option>
            <option [ngValue]="2">2+</option>
            <option [ngValue]="3">3+</option>
            <option [ngValue]="4">4+</option>
          </select>
        </div>

        @if (loading() && properties().length === 0) {
          <p class="pc-status">Carregando imóveis...</p>
        } @else if (properties().length === 0) {
          <div class="pc-empty">
            <h2>Nenhum imóvel com esses filtros</h2>
            <p>Tente ajustar a busca — pode ser que um novo imóvel se encaixe em breve.</p>
          </div>
        } @else {
          <div class="pc-grid">
            @for (p of properties(); track p.id) {
              <article class="pc-card">
                <div class="pc-card__photo">
                  @if (p.coverPhotoUrl) {
                    <img [src]="p.coverPhotoUrl" [alt]="p.title" loading="lazy" />
                  } @else {
                    <div class="pc-card__placeholder"></div>
                  }
                  <span class="pc-card__purpose">{{ purposeLabel(p.purpose) }}</span>
                </div>
                <div class="pc-card__body">
                  <span class="pc-card__price">
                    {{ (p.salePrice ?? p.rentPrice) | currency: "BRL" : "symbol" : "1.0-0" }}
                  </span>
                  <span class="pc-card__title">{{ p.title }}</span>
                  <span class="pc-card__location">{{ p.neighborhood }}, {{ p.city }}/{{ p.state }}</span>
                  <span class="pc-card__facts">
                    {{ p.bedrooms }} quarto{{ p.bedrooms === 1 ? "" : "s" }} ·
                    {{ p.bathrooms }} banheiro{{ p.bathrooms === 1 ? "" : "s" }} ·
                    {{ p.parkingSpots }} vaga{{ p.parkingSpots === 1 ? "" : "s" }}
                    @if (p.usableArea) { · {{ p.usableArea }} m² }
                  </span>
                  @if (p.acceptsFinancing) {
                    <span class="pc-card__tag">Aceita financiamento</span>
                  }
                </div>
              </article>
            }
          </div>

          @if (hasMore()) {
            <div class="pc-more">
              <button type="button" class="pc-btn" (click)="loadMore()" [disabled]="loading()">
                {{ loading() ? "Carregando..." : "Ver mais imóveis" }}
              </button>
            </div>
          }
        }
      }

      <footer class="pc-footer">Catálogo gerado automaticamente pelo Imoboo.</footer>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--canvas); }
    .pc { max-width: 1080px; margin: 0 auto; padding: 24px 20px 60px; }

    .pc-head { padding: 8px 0 24px; }
    .pc-brand { font-size: 13px; font-weight: 600; color: var(--ink-faint); letter-spacing: 0.02em; }
    .pc-head h1 { margin: 6px 0 4px; font-size: 24px; }
    .pc-head p { margin: 0; color: var(--ink-soft); }

    .pc-filters {
      display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px;
      padding: 12px; background: var(--surface); border: 1px solid var(--rule); border-radius: var(--radius-lg);
    }
    .pc-filters select, .pc-filters input {
      flex: 1; min-width: 130px; padding: 9px 10px; border: 1px solid var(--rule-strong);
      border-radius: var(--radius); background: var(--surface); font: inherit; font-size: 13px;
    }

    .pc-status, .pc-empty { text-align: center; padding: 60px 20px; color: var(--ink-soft); }
    .pc-empty h2 { color: var(--ink); margin-bottom: 6px; font-size: 18px; }
    .pc-empty p { margin: 0; }

    .pc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px; }

    .pc-card {
      background: var(--surface); border: 1px solid var(--rule); border-radius: var(--radius-lg);
      overflow: hidden; display: flex; flex-direction: column;
    }
    .pc-card__photo { position: relative; aspect-ratio: 4 / 3; background: var(--surface-sunken); }
    .pc-card__photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .pc-card__placeholder { width: 100%; height: 100%; background: var(--surface-sunken); }
    .pc-card__purpose {
      position: absolute; top: 10px; left: 10px; padding: 3px 9px; border-radius: 100px;
      background: rgba(22,33,44,0.78); color: #fff; font-size: 11px; font-weight: 600;
    }

    .pc-card__body { padding: 14px; display: flex; flex-direction: column; gap: 4px; }
    .pc-card__price { font-size: 17px; font-weight: 700; letter-spacing: -0.01em; }
    .pc-card__title { font-size: 14px; font-weight: 500; }
    .pc-card__location { font-size: 13px; color: var(--ink-soft); }
    .pc-card__facts { font-size: 12.5px; color: var(--ink-faint); margin-top: 2px; }
    .pc-card__tag {
      margin-top: 6px; align-self: flex-start; padding: 2px 8px; border-radius: 100px;
      background: var(--state-auto-bg); color: var(--state-auto); font-size: 11px; font-weight: 500;
    }

    .pc-more { display: flex; justify-content: center; margin-top: 28px; }
    .pc-btn {
      padding: 11px 26px; border-radius: var(--radius); border: 1px solid var(--rule-strong);
      background: var(--surface); font: inherit; font-weight: 500; cursor: pointer;
    }
    .pc-btn:hover { background: var(--surface-sunken); }
    .pc-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .pc-footer { text-align: center; margin-top: 48px; font-size: 12px; color: var(--ink-faint); }

    @media (max-width: 480px) {
      .pc-grid { grid-template-columns: 1fr 1fr; }
      .pc-filters select, .pc-filters input { min-width: 100%; }
    }
  `],
})
export class PublicCatalogComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(PublicCatalogService);

  protected readonly PurposeEnum = PropertyPurpose;
  readonly typeOptions = Object.entries(PROPERTY_TYPE_LABEL).map(([value, label]) => ({ value: Number(value) as PropertyType, label }));

  readonly tenantName = signal<string | null>(null);
  readonly properties = signal<PropertyListItem[]>([]);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly hasMore = signal(false);

  private slug = "";
  private page = 1;

  purpose: PropertyPurpose | undefined;
  type: PropertyType | undefined;
  term = "";
  minBedrooms: number | undefined;

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get("tenantSlug") ?? "";
    this.applyFilters();
  }

  applyFilters(): void {
    this.page = 1;
    this.properties.set([]);
    this.fetch(false);
  }

  loadMore(): void {
    this.page++;
    this.fetch(true);
  }

  purposeLabel(purpose: PropertyPurpose): string {
    return PROPERTY_PURPOSE_LABEL[purpose];
  }

  private fetch(append: boolean): void {
    this.loading.set(true);

    this.service.search(this.slug, {
      purpose: this.purpose,
      type: this.type,
      term: this.term || undefined,
      minBedrooms: this.minBedrooms,
      page: this.page,
      pageSize: 12,
    }).subscribe({
      next: (response) => {
        this.tenantName.set(response.tenantName);
        this.properties.update((list) => (append ? [...list, ...response.properties.items] : response.properties.items));
        this.hasMore.set(this.page < response.properties.totalPages);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 404) this.notFound.set(true);
      },
    });
  }
}
