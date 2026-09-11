import { HttpClient } from "@angular/common/http";
import { Component, OnDestroy, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { catchError, concatMap, from, map, of } from "rxjs";
import {
  PROPERTY_PURPOSE_LABEL, PROPERTY_STATUS_LABEL, PROPERTY_TYPE_LABEL,
  PropertyPhoto, PropertyPurpose, PropertyStatus, PropertyType, UpsertPropertyRequest,
} from "../../core/models";
import { PropertyService } from "../../core/services/property.service";
import { CurrencyMaskDirective } from "../../shared/directives/currency-mask.directive";

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

interface StagedPhoto {
  tempId: string;
  file: File;
  previewUrl: string;
  isCover: boolean;
}

/** Formato de resposta do ViaCEP — não é a API dos Correios (que não tem uma pública
 *  gratuita), mas o serviço padrão usado no Brasil para exatamente esse fim. */
interface ViaCepResponse {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

/** Campos obrigatórios e o rótulo usado tanto no "*" quanto na mensagem de erro. */
const REQUIRED_FIELDS: Record<string, string> = {
  code: "Código",
  title: "Título",
  neighborhood: "Bairro",
  city: "Cidade",
  state: "Estado (UF)",
};

@Component({
  selector: "app-property-form",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CurrencyMaskDirective],
  template: `
    <section class="page">
      <header class="page__head">
        <div>
          <h1>{{ isEdit() ? "Editar imóvel" : "Cadastrar imóvel" }}</h1>
          <p class="page__sub">Esses dados são o que a IA usa para responder aos clientes — mantenha atualizados.</p>
        </div>
        <a routerLink="/imoveis" class="btn btn--quiet">Voltar</a>
      </header>

      @if (loadingDetail()) {
        <p class="page__sub">Carregando imóvel...</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" class="panel form">
          <div class="form__grid">
            <div class="field">
              <label for="code">Código *</label>
              <input id="code" formControlName="code" placeholder="AP-0101" />
              @if (isInvalid("code")) { <span class="error-text">Campo obrigatório.</span> }
            </div>
            <div class="field field--wide">
              <label for="title">Título *</label>
              <input id="title" formControlName="title" placeholder="Apartamento 2 quartos em Boa Viagem" />
              @if (isInvalid("title")) { <span class="error-text">Campo obrigatório.</span> }
            </div>
          </div>

          <div class="field">
            <label for="description">Descrição</label>
            <textarea id="description" formControlName="description" rows="3"></textarea>
          </div>

          <div class="form__grid form__grid--4">
            <div class="field">
              <label for="type">Tipo</label>
              <select id="type" formControlName="type">
                @for (t of typeOptions; track t.value) {
                  <option [ngValue]="t.value">{{ t.label }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label for="purpose">Finalidade</label>
              <select id="purpose" formControlName="purpose">
                @for (p of purposeOptions; track p.value) {
                  <option [ngValue]="p.value">{{ p.label }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label for="status">Situação</label>
              <select id="status" formControlName="status">
                @for (s of statusOptions; track s.value) {
                  <option [ngValue]="s.value">{{ s.label }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label class="field__check">
                <input type="checkbox" formControlName="acceptsFinancing" />
                Aceita financiamento
              </label>
            </div>
          </div>

          <h3 class="form__section">Preço</h3>
          <div class="form__grid form__grid--4">
            <div class="field">
              <label for="salePrice">Venda (R$)</label>
              <input id="salePrice" type="text" inputmode="numeric" appCurrencyMask formControlName="salePrice" placeholder="0,00" />
            </div>
            <div class="field">
              <label for="rentPrice">Aluguel (R$)</label>
              <input id="rentPrice" type="text" inputmode="numeric" appCurrencyMask formControlName="rentPrice" placeholder="0,00" />
            </div>
            <div class="field">
              <label for="condoFee">Condomínio (R$)</label>
              <input id="condoFee" type="text" inputmode="numeric" appCurrencyMask formControlName="condoFee" placeholder="0,00" />
            </div>
            <div class="field">
              <label for="propertyTax">IPTU (R$)</label>
              <input id="propertyTax" type="text" inputmode="numeric" appCurrencyMask formControlName="propertyTax" placeholder="0,00" />
            </div>
          </div>

          <h3 class="form__section">Localização</h3>
          <div class="form__grid form__grid--4">
            <div class="field">
              <label for="zipCode">CEP</label>
              <input
                id="zipCode"
                formControlName="zipCode"
                maxlength="9"
                placeholder="00000-000"
                (input)="onCepInput($event)"
                (blur)="lookupCep()" />
              @if (cepLoading()) { <span class="hint-text">Consultando CEP...</span> }
              @if (cepError()) { <span class="error-text">{{ cepError() }}</span> }
            </div>
          </div>
          <div class="form__grid form__grid--4">
            <div class="field">
              <label for="street">Rua</label>
              <input id="street" formControlName="street" />
            </div>
            <div class="field">
              <label for="number">Número</label>
              <input id="number" formControlName="number" />
            </div>
            <div class="field">
              <label for="neighborhood">Bairro *</label>
              <input id="neighborhood" formControlName="neighborhood" />
              @if (isInvalid("neighborhood")) { <span class="error-text">Campo obrigatório.</span> }
            </div>
            <div class="field">
              <label for="city">Cidade *</label>
              <input id="city" formControlName="city" />
              @if (isInvalid("city")) { <span class="error-text">Campo obrigatório.</span> }
            </div>
          </div>
          <div class="form__grid form__grid--4">
            <div class="field">
              <label for="state">Estado (UF) *</label>
              <input id="state" formControlName="state" maxlength="2" placeholder="PE" />
              @if (isInvalid("state")) { <span class="error-text">Informe a sigla com 2 letras.</span> }
            </div>
          </div>

          <h3 class="form__section">Características</h3>
          <div class="form__grid form__grid--4">
            <div class="field">
              <label for="bedrooms">Quartos</label>
              <input id="bedrooms" type="number" min="0" formControlName="bedrooms" />
            </div>
            <div class="field">
              <label for="suites">Suítes</label>
              <input id="suites" type="number" min="0" formControlName="suites" />
            </div>
            <div class="field">
              <label for="bathrooms">Banheiros</label>
              <input id="bathrooms" type="number" min="0" formControlName="bathrooms" />
            </div>
            <div class="field">
              <label for="parkingSpots">Vagas</label>
              <input id="parkingSpots" type="number" min="0" formControlName="parkingSpots" />
            </div>
          </div>
          <div class="form__grid form__grid--3">
            <div class="field">
              <label for="usableArea">Área útil (m²)</label>
              <input id="usableArea" type="number" min="0" formControlName="usableArea" />
            </div>
            <div class="field">
              <label for="totalArea">Área total (m²)</label>
              <input id="totalArea" type="number" min="0" formControlName="totalArea" />
            </div>
            <div class="field">
              <label for="features">Diferenciais (separados por vírgula)</label>
              <input id="features" formControlName="featuresText" placeholder="piscina, mobiliado, portaria 24h" />
            </div>
          </div>

          @if (error()) {
            <p class="error-text error-text--banner">{{ error() }}</p>
          }

          <div class="form__actions">
            <button type="submit" class="btn btn--primary" [disabled]="saving()">
              {{ saving() ? "Salvando..." : (isEdit() ? "Salvar alterações" : "Cadastrar imóvel") }}
            </button>
          </div>
        </form>

        <section class="panel photos">
          <h2>Fotos</h2>
          <p class="page__sub">
            @if (isEdit()) {
              As fotos são enviadas assim que você escolhe o arquivo.
            } @else {
              Pode escolher fotos agora — elas são enviadas junto quando o imóvel for cadastrado.
            }
          </p>

          <label class="photos__upload btn" [class.is-disabled]="uploading() || saving()">
            {{ uploading() ? "Enviando..." : "Adicionar foto" }}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              (change)="onFileSelected($event)"
              [disabled]="uploading() || saving()"
              hidden />
          </label>

          @if (photoError()) {
            <p class="error-text">{{ photoError() }}</p>
          }

          @if (photos().length === 0 && stagedPhotos().length === 0) {
            <p class="page__sub">Nenhuma foto ainda.</p>
          } @else {
            <ul class="photos__grid">
              @for (photo of photos(); track photo.id; let i = $index) {
                <li class="photo" [class.is-cover]="photo.isCover">
                  <img [src]="photo.url" [alt]="'Foto ' + (i + 1)" />
                  <div class="photo__actions">
                    @if (photo.isCover) {
                      <span class="state-tag state-tag--auto">Capa</span>
                    } @else {
                      <button type="button" class="btn btn--quiet" (click)="setCover(photo.id)">Definir capa</button>
                    }
                    <button type="button" class="btn btn--quiet" (click)="removePhoto(photo.id)">Remover</button>
                  </div>
                </li>
              }
              @for (staged of stagedPhotos(); track staged.tempId) {
                <li class="photo photo--staged" [class.is-cover]="staged.isCover">
                  <img [src]="staged.previewUrl" alt="Nova foto" />
                  <span class="photo__pending">Será enviada ao salvar</span>
                  <div class="photo__actions">
                    @if (staged.isCover) {
                      <span class="state-tag state-tag--auto">Capa</span>
                    } @else {
                      <button type="button" class="btn btn--quiet" (click)="setStagedCover(staged.tempId)">Definir capa</button>
                    }
                    <button type="button" class="btn btn--quiet" (click)="removeStagedPhoto(staged.tempId)">Remover</button>
                  </div>
                </li>
              }
            </ul>
          }
        </section>
      }
    </section>
  `,
  styles: [`
    .page { padding: var(--gap-lg); max-width: 900px; }
    .page__head { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--gap); margin-bottom: var(--gap-lg); }
    .page__sub { color: var(--ink-soft); margin: 0 0 var(--gap-sm); }

    .form { padding: var(--gap-lg); margin-bottom: var(--gap-lg); }
    .form__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 var(--gap); }
    .form__grid--3 { grid-template-columns: repeat(3, 1fr); }
    .form__grid--4 { grid-template-columns: repeat(4, 1fr); }
    .field--wide { grid-column: span 2; }
    .field__check { display: flex; align-items: center; gap: var(--gap-sm); font-size: 14px; margin-top: 22px; }
    .field__check input { width: auto; }

    .hint-text { font-size: 12px; color: var(--ink-soft); }
    .error-text--banner { margin-top: var(--gap-sm); }

    .form__section { margin: var(--gap) 0 var(--gap-sm); padding-top: var(--gap-sm); border-top: 1px solid var(--rule); }
    .form__actions { margin-top: var(--gap); }

    .photos { padding: var(--gap-lg); }
    .photos h2 { margin-bottom: 4px; }
    .photos__upload { display: inline-flex; margin-bottom: var(--gap); cursor: pointer; }
    .photos__upload.is-disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }

    .photos__grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--gap); }
    .photo { position: relative; border: 1px solid var(--rule); border-radius: var(--radius); overflow: hidden; }
    .photo.is-cover { border-color: var(--state-auto); }
    .photo--staged { border-style: dashed; }
    .photo img { width: 100%; height: 120px; object-fit: cover; display: block; }
    .photo__actions { display: flex; justify-content: space-between; align-items: center; gap: 4px; padding: 6px; font-size: 12px; }
    .photo__pending { position: absolute; top: 6px; left: 6px; padding: 2px 6px; border-radius: 100px; background: var(--state-wait-bg); color: var(--state-wait); font-size: 11px; font-weight: 500; }

    @media (max-width: 700px) {
      .form__grid, .form__grid--3, .form__grid--4 { grid-template-columns: 1fr; }
      .field--wide { grid-column: span 1; }
    }
  `],
})
export class PropertyFormComponent implements OnInit, OnDestroy {
  private readonly service = inject(PropertyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  readonly propertyId = signal<string | null>(null);
  readonly isEdit = signal(false);
  readonly loadingDetail = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly photos = signal<PropertyPhoto[]>([]);
  readonly stagedPhotos = signal<StagedPhoto[]>([]);
  readonly uploading = signal(false);
  readonly photoError = signal<string | null>(null);

  readonly cepLoading = signal(false);
  readonly cepError = signal<string | null>(null);

  // Sem campo na UI ainda para estes; preservados do que já existia ao editar,
  // para o formulário não zerar dado que outra via (Swagger, futura tela) tenha definido.
  private floorNumber: number | null = null;
  private yearBuilt: number | null = null;
  private assignedUserId: string | null = null;
  private acceptsExchange = false;

  readonly typeOptions = Object.entries(PROPERTY_TYPE_LABEL).map(([value, label]) => ({ value: Number(value) as PropertyType, label }));
  readonly purposeOptions = Object.entries(PROPERTY_PURPOSE_LABEL).map(([value, label]) => ({ value: Number(value) as PropertyPurpose, label }));
  readonly statusOptions = Object.entries(PROPERTY_STATUS_LABEL).map(([value, label]) => ({ value: Number(value) as PropertyStatus, label }));

  readonly form = inject(FormBuilder).nonNullable.group({
    code: ["", [Validators.required, Validators.maxLength(40)]],
    title: ["", [Validators.required, Validators.maxLength(250)]],
    description: [""],
    type: [PropertyType.Apartamento, Validators.required],
    purpose: [PropertyPurpose.Venda, Validators.required],
    status: [PropertyStatus.Disponivel, Validators.required],
    acceptsFinancing: [false],
    salePrice: [null as number | null],
    rentPrice: [null as number | null],
    condoFee: [null as number | null],
    propertyTax: [null as number | null],
    street: [""],
    number: [""],
    neighborhood: ["", Validators.required],
    city: ["", Validators.required],
    state: ["", [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
    zipCode: [""],
    bedrooms: [0],
    suites: [0],
    bathrooms: [0],
    parkingSpots: [0],
    usableArea: [null as number | null],
    totalArea: [null as number | null],
    featuresText: [""],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) return;

    this.propertyId.set(id);
    this.isEdit.set(true);
    this.loadingDetail.set(true);

    this.service.detail(id).subscribe({
      next: (property) => {
        this.form.patchValue({
          code: property.code,
          title: property.title,
          description: property.description ?? "",
          type: property.type,
          purpose: property.purpose,
          status: property.status,
          acceptsFinancing: property.acceptsFinancing,
          salePrice: property.salePrice,
          rentPrice: property.rentPrice,
          condoFee: property.condoFee,
          propertyTax: property.propertyTax,
          street: property.street ?? "",
          number: property.number ?? "",
          neighborhood: property.neighborhood,
          city: property.city,
          state: property.state,
          zipCode: property.zipCode ?? "",
          bedrooms: property.bedrooms,
          suites: property.suites,
          bathrooms: property.bathrooms,
          parkingSpots: property.parkingSpots,
          usableArea: property.usableArea,
          totalArea: property.totalArea,
          featuresText: property.features.join(", "),
        });
        this.floorNumber = property.floorNumber;
        this.yearBuilt = property.yearBuilt;
        this.assignedUserId = property.assignedUserId;
        this.acceptsExchange = property.acceptsExchange;
        this.photos.set(property.photos);
        this.loadingDetail.set(false);
      },
      error: () => this.loadingDetail.set(false),
    });
  }

  ngOnDestroy(): void {
    // Evita vazar memória com os object URLs das prévias de foto ainda não salvas.
    for (const staged of this.stagedPhotos()) URL.revokeObjectURL(staged.previewUrl);
  }

  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName)!;
    return control.invalid && (control.touched || control.dirty);
  }

  submit(): void {
    if (this.saving()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const missing = Object.entries(REQUIRED_FIELDS)
        .filter(([key]) => this.form.get(key)!.invalid)
        .map(([, label]) => label);

      this.error.set(
        missing.length > 0
          ? `Preencha os campos obrigatórios: ${missing.join(", ")}.`
          : "Confira os campos destacados antes de salvar.",
      );
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const { featuresText, ...rest } = this.form.getRawValue();
    const request: UpsertPropertyRequest = {
      ...rest,
      state: rest.state.toUpperCase(),
      features: featuresText
        ? featuresText.split(",").map((f) => f.trim()).filter((f) => f.length > 0)
        : [],
      // Sem campo na UI ainda para andar/ano/corretor/permuta — preserva o que
      // já existia (edição) ou fica no valor padrão (cadastro novo).
      floorNumber: this.floorNumber,
      yearBuilt: this.yearBuilt,
      assignedUserId: this.assignedUserId,
      acceptsExchange: this.acceptsExchange,
    };

    const existingId = this.propertyId();

    if (existingId) {
      this.service.update(existingId, request).subscribe({
        next: () => {
          this.saving.set(false);
          void this.router.navigate(["/imoveis"]);
        },
        error: () => this.onSaveError(),
      });
      return;
    }

    this.service.create(request).subscribe({
      next: ({ id }) => this.afterCreate(id),
      error: () => this.onSaveError(),
    });
  }

  private afterCreate(id: string): void {
    const staged = this.stagedPhotos();

    if (staged.length === 0) {
      this.saving.set(false);
      // Sem fotos escolhidas no cadastro: vai para a edição, onde dá para adicionar depois.
      void this.router.navigate(["/imoveis", id, "editar"]);
      return;
    }

    this.uploadStagedPhotos(id, staged);
  }

  /** Envia as fotos escolhidas durante o cadastro, na ordem em que foram adicionadas. */
  private uploadStagedPhotos(propertyId: string, staged: StagedPhoto[]): void {
    const coverTempId = staged.find((p) => p.isCover)?.tempId ?? staged[0].tempId;
    let coverPhotoId: string | null = null;
    let failureCount = 0;

    from(staged)
      .pipe(
        concatMap((item) =>
          this.service.uploadPhoto(propertyId, item.file).pipe(
            map((photo) => ({ item, photo, ok: true as const })),
            catchError(() => of({ item, photo: null, ok: false as const })),
          ),
        ),
      )
      .subscribe({
        next: ({ item, photo, ok }) => {
          if (ok && photo && item.tempId === coverTempId) coverPhotoId = photo.id;
          if (!ok) failureCount++;
          URL.revokeObjectURL(item.previewUrl);
        },
        complete: () => {
          this.stagedPhotos.set([]);
          const finish = () => {
            this.saving.set(false);
            if (failureCount > 0) {
              this.error.set(
                `Imóvel salvo, mas ${failureCount} foto(s) não puderam ser enviadas. Tente novamente aqui na edição.`,
              );
              void this.router.navigate(["/imoveis", propertyId, "editar"]);
            } else {
              void this.router.navigate(["/imoveis"]);
            }
          };

          if (coverPhotoId) {
            this.service.setCoverPhoto(propertyId, coverPhotoId).subscribe({ next: finish, error: finish });
          } else {
            finish();
          }
        },
      });
  }

  private onSaveError(): void {
    this.saving.set(false);
    this.error.set("Não foi possível salvar o imóvel. Confira os campos obrigatórios.");
  }

  // --- CEP ---

  onCepInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, "").slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;

    this.form.get("zipCode")!.setValue(formatted, { emitEvent: false });
    input.value = formatted;
    this.cepError.set(null);

    if (digits.length === 8) this.lookupCep(digits);
  }

  lookupCep(digitsParam?: string): void {
    const raw = digitsParam ?? (this.form.get("zipCode")!.value ?? "").replace(/\D/g, "");
    if (raw.length !== 8) return;

    this.cepLoading.set(true);
    this.cepError.set(null);

    this.http.get<ViaCepResponse>(`https://viacep.com.br/ws/${raw}/json/`).subscribe({
      next: (result) => {
        this.cepLoading.set(false);

        if (result.erro) {
          this.cepError.set("CEP não encontrado. Preencha o endereço manualmente.");
          return;
        }

        this.form.patchValue({
          street: result.logradouro || this.form.get("street")!.value,
          neighborhood: result.bairro || this.form.get("neighborhood")!.value,
          city: result.localidade || this.form.get("city")!.value,
          state: result.uf || this.form.get("state")!.value,
        });
      },
      error: () => {
        this.cepLoading.set(false);
        this.cepError.set("Não foi possível consultar o CEP agora. Preencha manualmente.");
      },
    });
  }

  // --- fotos ---

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      this.photoError.set("Formato não aceito. Use JPEG, PNG ou WebP.");
      input.value = "";
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      this.photoError.set("A imagem deve ter no máximo 8 MB.");
      input.value = "";
      return;
    }

    this.photoError.set(null);
    const propertyId = this.propertyId();

    if (propertyId) {
      this.uploading.set(true);

      this.service.uploadPhoto(propertyId, file).subscribe({
        next: (photo) => {
          this.photos.update((list) => [...list, photo]);
          this.uploading.set(false);
          input.value = "";
        },
        error: () => {
          this.uploading.set(false);
          this.photoError.set("Não foi possível enviar a foto. Tente novamente.");
          input.value = "";
        },
      });
      return;
    }

    // Ainda cadastrando: guarda localmente e envia junto quando o imóvel for salvo.
    const isFirst = this.stagedPhotos().length === 0 && this.photos().length === 0;
    this.stagedPhotos.update((list) => [
      ...list,
      { tempId: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file), isCover: isFirst },
    ]);
    input.value = "";
  }

  setCover(photoId: string): void {
    const id = this.propertyId();
    if (!id) return;

    this.service.setCoverPhoto(id, photoId).subscribe({
      next: () => this.photos.update((list) => list.map((p) => ({ ...p, isCover: p.id === photoId }))),
    });
  }

  removePhoto(photoId: string): void {
    const id = this.propertyId();
    if (!id) return;

    this.service.removePhoto(id, photoId).subscribe({
      next: () => this.photos.update((list) => list.filter((p) => p.id !== photoId)),
    });
  }

  setStagedCover(tempId: string): void {
    this.stagedPhotos.update((list) => list.map((p) => ({ ...p, isCover: p.tempId === tempId })));
  }

  removeStagedPhoto(tempId: string): void {
    const removed = this.stagedPhotos().find((p) => p.tempId === tempId);
    if (!removed) return;

    URL.revokeObjectURL(removed.previewUrl);

    this.stagedPhotos.update((list) => {
      const remaining = list.filter((p) => p.tempId !== tempId);
      // A capa removida passa para a próxima da fila, para nunca ficar sem nenhuma marcada.
      if (removed.isCover && remaining.length > 0) {
        return remaining.map((p, i) => ({ ...p, isCover: i === 0 }));
      }
      return remaining;
    });
  }
}
