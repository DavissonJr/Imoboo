import { DatePipe } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { CreatedAccount, PlatformAccount } from "../../core/models";
import { PlatformAdminService } from "../../core/services/platform-admin.service";

@Component({
  selector: "app-platform-accounts",
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <section class="page">
      <header class="page__head">
        <div>
          <h1>Contas</h1>
          <p class="page__sub">
            Cada linha é um corretor autônomo com WhatsApp e catálogo próprios — não uma pessoa
            dentro do seu negócio. Você cadastra, ele configura o WhatsApp dele sozinho.
          </p>
        </div>
        <button type="button" class="btn btn--primary" (click)="toggleForm()">
          {{ showForm() ? "Cancelar" : "Cadastrar corretor" }}
        </button>
      </header>

      @if (revealed(); as created) {
        <div class="panel reveal">
          <h2>Conta criada</h2>
          <p class="page__sub">
            Repasse por um canal seguro — essa senha não aparece de novo depois que você fechar este aviso.
          </p>
          <div class="reveal__row">
            <span class="reveal__label">E-mail</span>
            <code>{{ created.ownerEmail }}</code>
          </div>
          <div class="reveal__row">
            <span class="reveal__label">Senha provisória</span>
            <code>{{ created.initialPassword }}</code>
            <button type="button" class="btn btn--quiet" (click)="copy(created.initialPassword)">Copiar</button>
          </div>
          <button type="button" class="btn" (click)="revealed.set(null)">Entendi, fechar</button>
        </div>
      }

      @if (showForm()) {
        <form class="panel form" (ngSubmit)="submit()" [formGroup]="form">
          <div class="form__grid">
            <div class="field">
              <label for="tenantName">Nome do negócio</label>
              <input id="tenantName" formControlName="tenantName" placeholder="Silva Imóveis" />
            </div>
            <div class="field">
              <label for="ownerName">Nome do corretor</label>
              <input id="ownerName" formControlName="ownerName" placeholder="João Silva" />
            </div>
            <div class="field">
              <label for="ownerEmail">E-mail</label>
              <input id="ownerEmail" type="email" formControlName="ownerEmail" />
            </div>
          </div>

          @if (formError()) {
            <p class="error-text">{{ formError() }}</p>
          }

          <button type="submit" class="btn btn--primary" [disabled]="form.invalid || saving()">
            {{ saving() ? "Cadastrando..." : "Cadastrar" }}
          </button>
        </form>
      }

      @if (loading()) {
        <p class="page__sub">Carregando contas...</p>
      } @else if (accounts().length === 0) {
        <div class="panel empty">
          <h3>Nenhuma conta cadastrada ainda</h3>
          <p>Cadastre o primeiro corretor autônomo para ele começar a atender pelo sistema.</p>
        </div>
      } @else {
        <div class="panel">
          <table>
            <thead>
              <tr>
                <th>Negócio</th>
                <th>Corretor</th>
                <th>WhatsApp</th>
                <th>Imóveis</th>
                <th>Situação</th>
                <th>Último acesso</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (a of accounts(); track a.tenantId) {
                <tr>
                  <td class="cell-title">{{ a.tenantName }}</td>
                  <td>
                    <span class="cell-title">{{ a.ownerName }}</span>
                    <span class="cell-note">{{ a.ownerEmail }}</span>
                  </td>
                  <td>
                    <span class="state-tag" [class]="a.whatsAppConnected ? 'state-tag--auto' : 'state-tag--wait'">
                      {{ a.whatsAppConnected ? "Conectado" : "Não conectado" }}
                    </span>
                  </td>
                  <td>{{ a.propertiesCount }}</td>
                  <td>
                    @if (a.mustChangePassword) {
                      <span class="state-tag state-tag--wait">Aguardando 1º acesso</span>
                    } @else if (a.tenantIsActive) {
                      <span class="state-tag state-tag--auto">Ativa</span>
                    } @else {
                      <span class="state-tag state-tag--closed">Inativa</span>
                    }
                  </td>
                  <td>{{ a.lastLoginAtUtc ? (a.lastLoginAtUtc | date: "dd/MM/yy HH:mm") : "Nunca" }}</td>
                  <td class="cell-actions">
                    <button type="button" class="btn btn--quiet" (click)="toggleActive(a)">
                      {{ a.tenantIsActive ? "Desativar" : "Ativar" }}
                    </button>
                    <button type="button" class="btn btn--quiet" (click)="resetPassword(a)">Nova senha</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <p class="page__sub count">{{ accounts().length }} contas</p>
      }
    </section>
  `,
  styles: [`
    .page { padding: var(--gap-lg); max-width: 1200px; }
    .page__head { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--gap); margin-bottom: var(--gap-lg); }
    .page__sub { color: var(--ink-soft); margin: 0; max-width: 60ch; }

    .reveal { padding: var(--gap-lg); margin-bottom: var(--gap); border-left: 4px solid var(--state-auto); }
    .reveal h2 { margin-bottom: 4px; }
    .reveal__row { display: flex; align-items: center; gap: var(--gap-sm); margin: var(--gap-sm) 0; }
    .reveal__label { font-size: 13px; color: var(--ink-soft); min-width: 130px; }
    .reveal code { padding: 4px 8px; background: var(--surface-sunken); border-radius: 4px; font-family: var(--font-code); }

    .form { padding: var(--gap-lg); margin-bottom: var(--gap); }
    .form__grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 var(--gap); }

    .cell-title { display: block; font-weight: 500; }
    .cell-note { display: block; font-size: 12px; color: var(--ink-faint); }
    .cell-actions { display: flex; gap: 4px; white-space: nowrap; }
    .count { margin-top: var(--gap-sm); font-size: 13px; }

    @media (max-width: 760px) {
      .form__grid { grid-template-columns: 1fr; }
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
