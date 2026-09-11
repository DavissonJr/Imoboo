import { DatePipe } from "@angular/common";
import { Component, OnDestroy, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from "rxjs";
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
  imports: [ReactiveFormsModule, FormsModule, DatePipe],
  template: `
    <section class="page">
      <header class="page__head">
        <div>
          <h1>Agendamentos</h1>
          <p class="page__sub">Visitas, retornos e ligações combinados com os leads.</p>
        </div>
        <button type="button" class="btn btn--primary" (click)="toggleForm()">
          {{ showForm() ? "Cancelar" : "Novo agendamento" }}
        </button>
      </header>

      @if (showForm()) {
        <form class="panel form" (ngSubmit)="submit()" [formGroup]="form">
          <div class="form__grid">
            <div class="field">
              <label for="leadSearch">Lead</label>
              @if (selectedLead()) {
                <div class="picked">
                  <span>{{ selectedLead()!.name }} · {{ selectedLead()!.phone }}</span>
                  <button type="button" class="btn btn--quiet" (click)="clearLead()">Trocar</button>
                </div>
              } @else {
                <input id="leadSearch" placeholder="Buscar por nome ou telefone" (input)="leadTerm$.next($any($event.target).value)" />
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
                  <button type="button" class="btn btn--quiet" (click)="clearProperty()">Trocar</button>
                </div>
              } @else {
                <input id="propertySearch" placeholder="Buscar por código ou título" (input)="propertyTerm$.next($any($event.target).value)" />
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

          <div class="form__grid form__grid--3">
            <div class="field">
              <label for="type">Tipo</label>
              <select id="type" formControlName="type">
                @for (t of typeOptions; track t.value) {
                  <option [ngValue]="t.value">{{ t.label }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label for="scheduledAt">Data e hora</label>
              <input id="scheduledAt" type="datetime-local" formControlName="scheduledAt" />
            </div>
          </div>

          <div class="field">
            <label for="notes">Observações</label>
            <textarea id="notes" formControlName="notes" rows="2"></textarea>
          </div>

          @if (formError()) {
            <p class="error-text">{{ formError() }}</p>
          }

          <button type="submit" class="btn btn--primary" [disabled]="form.invalid || !selectedLead() || saving()">
            {{ saving() ? "Salvando..." : "Criar agendamento" }}
          </button>
        </form>
      }

      <div class="filters panel">
        <label class="filters__check">
          <input type="checkbox" [(ngModel)]="onlyUpcoming" [ngModelOptions]="{standalone: true}" (ngModelChange)="load()" />
          Só os que ainda vão acontecer
        </label>
      </div>

      @if (loading()) {
        <p class="page__sub">Carregando agendamentos...</p>
      } @else if (appointments().length === 0) {
        <div class="panel empty">
          <h3>Nenhum agendamento aqui</h3>
          <p>Crie um agendamento para acompanhar visitas e retornos com os leads.</p>
        </div>
      } @else {
        <div class="panel">
          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Lead</th>
                <th>Imóvel</th>
                <th>Tipo</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (a of appointments(); track a.id) {
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
                    <select [ngModel]="a.status" [ngModelOptions]="{standalone: true}" (ngModelChange)="changeStatus(a, $event)">
                      @for (s of statusOptions; track s.value) {
                        <option [ngValue]="s.value">{{ s.label }}</option>
                      }
                    </select>
                  </td>
                  <td>
                    <button type="button" class="btn btn--quiet" (click)="remove(a)">Excluir</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <p class="page__sub count">{{ total() }} agendamentos</p>
      }
    </section>
  `,
  styles: [`
    .page { padding: var(--gap-lg); max-width: 1100px; }
    .page__head { display: flex; justify-content: space-between; align-items: flex-end; gap: var(--gap); margin-bottom: var(--gap-lg); }
    .page__sub { color: var(--ink-soft); margin: 0; }

    .form { padding: var(--gap-lg); margin-bottom: var(--gap); }
    .form__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 var(--gap); }
    .form__grid--3 { grid-template-columns: repeat(3, 1fr); }

    .picked { display: flex; align-items: center; justify-content: space-between; gap: var(--gap-sm); padding: 9px 11px; border: 1px solid var(--rule-strong); border-radius: var(--radius); background: var(--surface-sunken); font-size: 14px; }
    .results { list-style: none; margin: 4px 0 0; padding: 0; border: 1px solid var(--rule); border-radius: var(--radius); overflow: hidden; max-height: 180px; overflow-y: auto; }
    .results button { display: block; width: 100%; text-align: left; padding: 8px 11px; border: none; background: var(--surface); font: inherit; font-size: 14px; cursor: pointer; }
    .results button:hover { background: var(--surface-sunken); }

    .filters { display: flex; gap: var(--gap); align-items: center; padding: var(--gap); margin-bottom: var(--gap); }
    .filters__check { display: flex; align-items: center; gap: var(--gap-sm); font-size: 14px; color: var(--ink-soft); white-space: nowrap; }
    .filters__check input { width: auto; }

    .cell-title { display: block; font-weight: 500; }
    .cell-note { display: block; font-size: 12px; color: var(--ink-faint); }
    .count { margin-top: var(--gap-sm); font-size: 13px; }

    select { padding: 6px 8px; font-size: 13px; }

    @media (max-width: 700px) {
      .form__grid, .form__grid--3 { grid-template-columns: 1fr; }
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
  readonly onlyUpcoming = true;

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
