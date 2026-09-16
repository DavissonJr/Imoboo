import { DatePipe } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { InputTextModule } from "primeng/inputtext";
import { SkeletonModule } from "primeng/skeleton";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { CreatedAccount, PlatformAccount } from "../../core/models";
import { PlatformAdminService } from "../../core/services/platform-admin.service";

@Component({
  selector: "app-platform-accounts",
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, ButtonModule, CardModule, InputTextModule, TableModule, TagModule, SkeletonModule],
  template: `
    <section class="page">
      <header class="page-head">
        <div>
          <h1>Contas</h1>
          <p class="page-sub">
            Cada linha é um corretor autônomo com WhatsApp e catálogo próprios — não uma pessoa
            dentro do seu negócio. Você cadastra, ele configura o WhatsApp dele sozinho.
          </p>
        </div>
        <p-button
          [label]="showForm() ? 'Cancelar' : 'Cadastrar corretor'"
          [icon]="showForm() ? 'pi pi-times' : 'pi pi-plus'"
          [severity]="showForm() ? 'secondary' : undefined"
          (onClick)="toggleForm()" />
      </header>

      @if (revealed(); as created) {
        <p-card styleClass="reveal-card">
          <h2>Conta criada</h2>
          <p class="page-sub">
            Repasse por um canal seguro — essa senha não aparece de novo depois que você fechar este aviso.
          </p>
          <div class="reveal__row">
            <span class="reveal__label">E-mail</span>
            <code>{{ created.ownerEmail }}</code>
          </div>
          <div class="reveal__row">
            <span class="reveal__label">Senha provisória</span>
            <code>{{ created.initialPassword }}</code>
            <p-button label="Copiar" icon="pi pi-copy" [text]="true" size="small" (onClick)="copy(created.initialPassword)" />
          </div>
          <p-button label="Entendi, fechar" [outlined]="true" (onClick)="revealed.set(null)" />
        </p-card>
      }

      @if (showForm()) {
        <p-card styleClass="form-card">
          <form (ngSubmit)="submit()" [formGroup]="form">
            <div class="form-grid">
              <div class="field">
                <label for="tenantName">Nome do negócio</label>
                <input pInputText id="tenantName" formControlName="tenantName" placeholder="Silva Imóveis" />
              </div>
              <div class="field">
                <label for="ownerName">Nome do corretor</label>
                <input pInputText id="ownerName" formControlName="ownerName" placeholder="João Silva" />
              </div>
              <div class="field">
                <label for="ownerEmail">E-mail</label>
                <input pInputText id="ownerEmail" type="email" formControlName="ownerEmail" />
              </div>
            </div>

            @if (formError()) {
              <p class="error-text">{{ formError() }}</p>
            }

            <p-button type="submit" label="Cadastrar" icon="pi pi-check" [disabled]="form.invalid || saving()" [loading]="saving()" />
          </form>
        </p-card>
      }

      @if (loading()) {
        <p-skeleton height="280px" />
      } @else if (accounts().length === 0) {
        <div class="empty">
          <h3>Nenhuma conta cadastrada ainda</h3>
          <p>Cadastre o primeiro corretor autônomo para ele começar a atender pelo sistema.</p>
        </div>
      } @else {
        <p-table [value]="accounts()" styleClass="p-datatable-sm" [rowHover]="true">
          <ng-template #header>
            <tr>
              <th>Negócio</th>
              <th>Corretor</th>
              <th>WhatsApp</th>
              <th>Imóveis</th>
              <th>Situação</th>
              <th>Último acesso</th>
              <th></th>
            </tr>
          </ng-template>
          <ng-template #body let-a>
            <tr>
              <td class="cell-title">{{ a.tenantName }}</td>
              <td>
                <span class="cell-title">{{ a.ownerName }}</span>
                <span class="cell-note">{{ a.ownerEmail }}</span>
              </td>
              <td><p-tag [value]="a.whatsAppConnected ? 'Conectado' : 'Não conectado'" [severity]="a.whatsAppConnected ? 'success' : 'warn'" /></td>
              <td>{{ a.propertiesCount }}</td>
              <td>
                @if (a.mustChangePassword) {
                  <p-tag value="Aguardando 1º acesso" severity="warn" />
                } @else if (a.tenantIsActive) {
                  <p-tag value="Ativa" severity="success" />
                } @else {
                  <p-tag value="Inativa" severity="secondary" />
                }
              </td>
              <td>{{ a.lastLoginAtUtc ? (a.lastLoginAtUtc | date: "dd/MM/yy HH:mm") : "Nunca" }}</td>
              <td class="cell-actions">
                <p-button [label]="a.tenantIsActive ? 'Desativar' : 'Ativar'" [text]="true" size="small" (onClick)="toggleActive(a)" />
                <p-button label="Nova senha" [text]="true" size="small" (onClick)="resetPassword(a)" />
              </td>
            </tr>
          </ng-template>
        </p-table>

        <p class="count">{{ accounts().length }} contas</p>
      }
    </section>
  `,
  styles: [`
    .page { padding: 28px; max-width: 1200px; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .page-head h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 4px; }
    .page-sub { color: var(--p-text-muted-color); margin: 0; max-width: 60ch; font-size: 14px; }

    :host ::ng-deep .reveal-card { margin-bottom: 16px; border-left: 4px solid var(--p-green-500); }
    :host ::ng-deep .reveal-card .p-card-body { padding: 20px; }
    .reveal-card h2 { margin: 0 0 4px; font-size: 18px; }
    .reveal__row { display: flex; align-items: center; gap: 8px; margin: 10px 0; }
    .reveal__label { font-size: 13px; color: var(--p-text-muted-color); min-width: 130px; }
    .reveal__row code { padding: 4px 8px; background: var(--p-surface-100); border-radius: 4px; font-family: var(--font-code); }

    :host ::ng-deep .form-card { margin-bottom: 16px; }
    :host ::ng-deep .form-card .p-card-body { padding: 20px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 16px; }
    .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
    .field label { font-size: 13px; font-weight: 600; color: var(--p-text-muted-color); }
    .field input { width: 100%; }

    .empty {
      text-align: center; padding: 60px 24px; color: var(--p-text-muted-color);
      background: var(--p-content-background); border: 1px solid var(--p-content-border-color); border-radius: 12px;
    }
    .empty h3 { color: var(--p-text-color); margin-bottom: 6px; }
    .empty p { margin: 0; }

    .cell-title { display: block; font-weight: 600; }
    .cell-note { display: block; font-size: 12px; color: var(--p-text-muted-color); }
    .cell-actions { display: flex; gap: 2px; white-space: nowrap; }
    .count { margin-top: 10px; font-size: 13px; color: var(--p-text-muted-color); }
    .error-text { color: var(--p-red-500); font-size: 13px; margin: 0 0 12px; }

    @media (max-width: 760px) {
      .page { padding: 18px; }
      .form-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class PlatformAccountsComponent implements OnInit {
  private readonly service = inject(PlatformAdminService);

  readonly accounts = signal<PlatformAccount[]>([]);
  readonly loading = signal(true);

  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly revealed = signal<CreatedAccount | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group({
    tenantName: ["", Validators.required],
    ownerName: ["", Validators.required],
    ownerEmail: ["", [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.listAccounts().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
    if (!this.showForm()) {
      this.form.reset();
      this.formError.set(null);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.formError.set(null);

    this.service.createAccount(this.form.getRawValue()).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.showForm.set(false);
        this.revealed.set(created);
        this.form.reset();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err.status === 422 ? "Já existe uma conta com este e-mail." : "Não foi possível cadastrar.");
      },
    });
  }

  toggleActive(account: PlatformAccount): void {
    this.service.setActive(account.tenantId, !account.tenantIsActive).subscribe({
      next: () => this.load(),
    });
  }

  resetPassword(account: PlatformAccount): void {
    const confirmed = confirm(`Gerar uma nova senha provisória para ${account.ownerName}? A senha atual dele deixa de funcionar.`);
    if (!confirmed) return;

    this.service.resetOwnerPassword(account.tenantId).subscribe({
      next: (created) => {
        this.revealed.set(created);
        this.load();
      },
    });
  }

  copy(password: string): void {
    void navigator.clipboard.writeText(password);
  }
}
