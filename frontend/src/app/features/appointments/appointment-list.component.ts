import { DatePipe } from "@angular/common";
import { Component, OnDestroy, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from "rxjs";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { CheckboxModule } from "primeng/checkbox";
import { InputTextModule } from "primeng/inputtext";
import { SelectModule } from "primeng/select";
import { SkeletonModule } from "primeng/skeleton";
import { TableModule } from "primeng/table";
import { TextareaModule } from "primeng/textarea";
import {
  APPOINTMENT_STATUS_LABEL, APPOINTMENT_TYPE_LABEL, AppointmentListItem,
  AppointmentStatus, AppointmentType, LeadListItem, PropertyListItem,
} from "../../core/models";
import { AppointmentService } from "../../core/services/appointment.service";
import { LeadService } from "../../core/services/lead.service";
import { PropertyService } from "../../core/services/property.service";

@Component({
  selector: "app-appointment-list",
  standalone: true,
  imports: [
    ReactiveFormsModule, FormsModule, DatePipe, ButtonModule, CardModule,
    SelectModule, InputTextModule, TextareaModule, CheckboxModule, TableModule, SkeletonModule,
  ],
  template: `
    <section class="page">
      <header class="page-head">
        <div>
          <h1>Agendamentos</h1>
          <p class="page-sub">Visitas, retornos e ligações combinados com os leads.</p>
        </div>
        <p-button
          [label]="showForm() ? 'Cancelar' : 'Novo agendamento'"
          [icon]="showForm() ? 'pi pi-times' : 'pi pi-plus'"
          [severity]="showForm() ? 'secondary' : undefined"
          (onClick)="toggleForm()" />
      </header>

      @if (showForm()) {
        <p-card styleClass="form-card">
          <form (ngSubmit)="submit()" [formGroup]="form">
            <div class="form-grid">
              <div class="field">
                <label for="leadSearch">Lead</label>
                @if (selectedLead()) {
                  <div class="picked">
                    <span>{{ selectedLead()!.name }} · {{ selectedLead()!.phone }}</span>
                    <p-button label="Trocar" [text]="true" size="small" (onClick)="clearLead()" />
                  </div>
                } @else {
                  <input pInputText id="leadSearch" placeholder="Buscar por nome ou telefone"
                    (input)="leadTerm$.next($any($event.target).value)" />
                  @if (leadResults().length > 0) {
                    <ul class="results">
                      @for (l of leadResults(); track l.id) {
                        <li><button type="button" (click)="pickLead(l)">{{ l.name }} · {{ l.phone }}</button></li>
                      }
                    </ul>
                  }
                }
              </div>

              <div class="field">
                <label for="propertySearch">Imóvel (opcional)</label>
                @if (selectedProperty()) {
                  <div class="picked">
                    <span class="code">{{ selectedProperty()!.code }}</span> {{ selectedProperty()!.title }}
                    <p-button label="Trocar" [text]="true" size="small" (onClick)="clearProperty()" />
                  </div>
                } @else {
                  <input pInputText id="propertySearch" placeholder="Buscar por código ou título"
                    (input)="propertyTerm$.next($any($event.target).value)" />
                  @if (propertyResults().length > 0) {
                    <ul class="results">
                      @for (p of propertyResults(); track p.id) {
                        <li><button type="button" (click)="pickProperty(p)"><span class="code">{{ p.code }}</span> {{ p.title }}</button></li>
                      }
                    </ul>
                  }
                }
              </div>
            </div>

            <div class="form-grid form-grid--3">
              <div class="field">
                <label for="type">Tipo</label>
                <p-select id="type" formControlName="type" [options]="typeOptions" optionLabel="label" optionValue="value" />
              </div>
              <div class="field">
                <label for="scheduledAt">Data e hora</label>
                <input pInputText id="scheduledAt" type="datetime-local" formControlName="scheduledAt" />
              </div>
            </div>

            <div class="field">
              <label for="notes">Observações</label>
              <textarea pTextarea id="notes" formControlName="notes" rows="2"></textarea>
            </div>

            @if (formError()) {
              <p class="error-text">{{ formError() }}</p>
            }

            <p-button
              type="submit" label="Criar agendamento" icon="pi pi-check"
              [disabled]="form.invalid || !selectedLead() || saving()" [loading]="saving()" />
          </form>
        </p-card>
      }

      <div class="filters">
        <label class="filters__check">
          <p-checkbox [(ngModel)]="onlyUpcoming" [ngModelOptions]="{standalone: true}" (ngModelChange)="load()" [binary]="true" inputId="upcoming" />
          <span (click)="onlyUpcoming = !onlyUpcoming; load()">Só os que ainda vão acontecer</span>
        </label>
      </div>

      @if (loading()) {
        <p-skeleton height="280px" />
      } @else if (appointments().length === 0) {
        <div class="empty">
          <h3>Nenhum agendamento aqui</h3>
          <p>Crie um agendamento para acompanhar visitas e retornos com os leads.</p>
        </div>
      } @else {
        <p-table [value]="appointments()" styleClass="p-datatable-sm" [rowHover]="true">
          <ng-template #header>
            <tr>
              <th>Quando</th>
              <th>Lead</th>
              <th>Imóvel</th>
              <th>Tipo</th>
              <th>Situação</th>
              <th></th>
            </tr>
          </ng-template>
          <ng-template #body let-a>
            <tr>
              <td>{{ a.scheduledAtUtc | date: "dd/MM/yy HH:mm" }}</td>
              <td>
                <span class="cell-title">{{ a.leadName }}</span>
                <span class="cell-note">{{ a.leadPhone }}</span>
              </td>
              <td>
                @if (a.propertyCode) {
                  <span class="code">{{ a.propertyCode }}</span> {{ a.propertyTitle }}
                } @else { — }
              </td>
              <td>{{ typeLabel(a.type) }}</td>
              <td>
                <p-select
                  [ngModel]="a.status" [ngModelOptions]="{standalone: true}" (ngModelChange)="changeStatus(a, $event)"
                  [options]="statusOptions" optionLabel="label" optionValue="value" styleClass="status-select" />
              </td>
              <td>
                <p-button icon="pi pi-trash" [text]="true" [rounded]="true" severity="danger" (onClick)="remove(a)" />
              </td>
            </tr>
          </ng-template>
        </p-table>

        <p class="count">{{ total() }} agendamentos</p>
      }
    </section>
  `,
  styles: [`
    .page { padding: 28px; max-width: 1100px; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .page-head h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 4px; }
    .page-sub { color: var(--p-text-muted-color); margin: 0; font-size: 14px; }

    :host ::ng-deep .form-card { margin-bottom: 16px; }
    :host ::ng-deep .form-card .p-card-body { padding: 20px; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
    .form-grid--3 { grid-template-columns: repeat(3, 1fr); }
    .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
    .field label { font-size: 13px; font-weight: 600; color: var(--p-text-muted-color); }
    .field input, .field textarea, .field p-select { width: 100%; }

    .picked {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 9px 11px; border: 1px solid var(--p-content-border-color); border-radius: 8px;
      background: var(--p-surface-100); font-size: 14px;
    }
    .results {
      list-style: none; margin: 4px 0 0; padding: 0;
      border: 1px solid var(--p-content-border-color); border-radius: 8px; overflow: hidden; max-height: 180px; overflow-y: auto;
    }
    .results button {
      display: block; width: 100%; text-align: left; padding: 8px 11px; border: none;
      background: var(--p-content-background); font: inherit; font-size: 14px; cursor: pointer;
    }
    .results button:hover { background: var(--p-surface-100); }

    .filters {
      display: flex; gap: 16px; align-items: center;
      padding: 14px 16px; margin-bottom: 16px;
      background: var(--p-content-background); border: 1px solid var(--p-content-border-color); border-radius: 12px;
    }
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
    .count { margin-top: 10px; font-size: 13px; color: var(--p-text-muted-color); }

    :host ::ng-deep .status-select { min-width: 160px; }
    .error-text { color: var(--p-red-500); font-size: 13px; margin: 0 0 12px; }

    @media (max-width: 700px) {
      .page { padding: 18px; }
      .form-grid, .form-grid--3 { grid-template-columns: 1fr; }
    }
  `],
})
export class AppointmentListComponent implements OnInit, OnDestroy {
  private readonly service = inject(AppointmentService);
  private readonly leadService = inject(LeadService);
  private readonly propertyService = inject(PropertyService);
  private readonly destroy$ = new Subject<void>();

  readonly appointments = signal<AppointmentListItem[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  onlyUpcoming = true;

  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  readonly leadResults = signal<LeadListItem[]>([]);
  readonly selectedLead = signal<LeadListItem | null>(null);
  readonly leadTerm$ = new Subject<string>();

  readonly propertyResults = signal<PropertyListItem[]>([]);
  readonly selectedProperty = signal<PropertyListItem | null>(null);
  readonly propertyTerm$ = new Subject<string>();

  readonly typeOptions = Object.entries(APPOINTMENT_TYPE_LABEL).map(([value, label]) => ({ value: Number(value) as AppointmentType, label }));
  readonly statusOptions = Object.entries(APPOINTMENT_STATUS_LABEL).map(([value, label]) => ({ value: Number(value) as AppointmentStatus, label }));

  readonly form = inject(FormBuilder).nonNullable.group({
    type: [AppointmentType.Visita, Validators.required],
    scheduledAt: ["", Validators.required],
    notes: [""],
  });

  ngOnInit(): void {
    this.load();

    this.leadTerm$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => term.trim().length < 2 ? [] : this.leadService.list({ term, pageSize: 6 })),
        takeUntil(this.destroy$),
      )
      .subscribe((result) => this.leadResults.set(result.items));

    this.propertyTerm$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => term.trim().length < 2 ? [] : this.propertyService.list({ term, onlyAvailable: false, pageSize: 6 })),
        takeUntil(this.destroy$),
      )
      .subscribe((result) => this.propertyResults.set(result.items));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading.set(true);

    this.service.list({ onlyUpcoming: this.onlyUpcoming, pageSize: 50 }).subscribe({
      next: (result) => {
        this.appointments.set(result.items);
        this.total.set(result.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
    if (!this.showForm()) this.resetForm();
  }

  pickLead(lead: LeadListItem): void {
    this.selectedLead.set(lead);
    this.leadResults.set([]);
  }

  clearLead(): void {
    this.selectedLead.set(null);
  }

  pickProperty(property: PropertyListItem): void {
    this.selectedProperty.set(property);
    this.propertyResults.set([]);
  }

  clearProperty(): void {
    this.selectedProperty.set(null);
  }

  submit(): void {
    const lead = this.selectedLead();
    if (this.form.invalid || !lead || this.saving()) return;

    this.saving.set(true);
    this.formError.set(null);

    const { type, scheduledAt, notes } = this.form.getRawValue();

    this.service.create({
      leadId: lead.id,
      propertyId: this.selectedProperty()?.id ?? null,
      assignedUserId: null,
      type,
      scheduledAtUtc: new Date(scheduledAt).toISOString(),
      notes: notes || null,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm.set(false);
        this.resetForm();
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.formError.set("Não foi possível criar o agendamento. Confira os dados.");
      },
    });
  }

  changeStatus(appointment: AppointmentListItem, status: AppointmentStatus): void {
    this.service.updateStatus(appointment.id, Number(status) as AppointmentStatus).subscribe({
      next: () => this.load(),
    });
  }

  remove(appointment: AppointmentListItem): void {
    const confirmed = confirm(`Excluir o agendamento com ${appointment.leadName}?`);
    if (!confirmed) return;

    this.service.remove(appointment.id).subscribe({
      next: () => this.load(),
    });
  }

  typeLabel(type: AppointmentType): string { return APPOINTMENT_TYPE_LABEL[type]; }

  private resetForm(): void {
    this.form.reset({ type: AppointmentType.Visita, scheduledAt: "", notes: "" });
    this.selectedLead.set(null);
    this.selectedProperty.set(null);
    this.leadResults.set([]);
    this.propertyResults.set([]);
    this.formError.set(null);
  }
}
