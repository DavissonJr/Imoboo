import { DatePipe } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { CreatedUser, TeamMember, USER_ROLE_LABEL, UserRole } from "../../core/models";
import { UserService } from "../../core/services/user.service";

@Component({
  selector: "app-team",
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, DatePipe],
  template: `
    <section class="page">
      <header class="page__head">
        <div>
          <h1>Equipe</h1>
          <p class="page__sub">Corretores com acesso ao sistema. Você cadastra, eles trocam a senha no primeiro acesso.</p>
        </div>
        <button type="button" class="btn btn--primary" (click)="toggleForm()">
          {{ showForm() ? "Cancelar" : "Adicionar corretor" }}
        </button>
      </header>

      @if (revealedUser(); as created) {
        <div class="panel reveal">
          <h2>{{ created.name }} foi cadastrado</h2>
          <p class="page__sub">
            Repasse esses dados por um canal seguro (não por e-mail em texto aberto). Essa senha não aparece de novo depois que você fechar este aviso.
          </p>
          <div class="reveal__row">
            <span class="reveal__label">E-mail</span>
            <code>{{ created.email }}</code>
          </div>
          <div class="reveal__row">
            <span class="reveal__label">Senha provisória</span>
            <code>{{ created.initialPassword }}</code>
            <button type="button" class="btn btn--quiet" (click)="copyPassword(created.initialPassword)">Copiar</button>
          </div>
          <button type="button" class="btn" (click)="revealedUser.set(null)">Entendi, fechar</button>
        </div>
      }

      @if (showForm()) {
        <form class="panel form" (ngSubmit)="submit()" [formGroup]="form">
          <div class="form__grid">
            <div class="field">
              <label for="name">Nome</label>
              <input id="name" formControlName="name" />
            </div>
            <div class="field">
              <label for="email">E-mail</label>
              <input id="email" type="email" formControlName="email" />
            </div>
            <div class="field">
              <label for="role">Perfil</label>
              <select id="role" formControlName="role">
                @for (r of roleOptions; track r.value) {
                  <option [ngValue]="r.value">{{ r.label }}</option>
                }
              </select>
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
        <p class="page__sub">Carregando equipe...</p>
      } @else {
        <div class="panel">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Último acesso</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (member of members(); track member.id) {
                <tr>
                  <td class="cell-title">{{ member.name }}</td>
                  <td>{{ member.email }}</td>
                  <td>
                    <select [ngModel]="member.role" [ngModelOptions]="{standalone: true}" (ngModelChange)="changeRole(member, $event)">
                      @for (r of roleOptions; track r.value) {
                        <option [ngValue]="r.value">{{ r.label }}</option>
                      }
                    </select>
                  </td>
                  <td>
                    @if (member.mustChangePassword) {
                      <span class="state-tag state-tag--wait">Aguardando 1º acesso</span>
                    } @else if (member.isActive) {
                      <span class="state-tag state-tag--auto">Ativo</span>
                    } @else {
                      <span class="state-tag state-tag--closed">Inativo</span>
                    }
                  </td>
                  <td>{{ member.lastLoginAtUtc ? (member.lastLoginAtUtc | date: "dd/MM/yy HH:mm") : "Nunca" }}</td>
                  <td class="cell-actions">
                    <button type="button" class="btn btn--quiet" (click)="toggleActive(member)">
                      {{ member.isActive ? "Desativar" : "Ativar" }}
                    </button>
                    <button type="button" class="btn btn--quiet" (click)="resetPassword(member)">Nova senha</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: [`
    .page { padding: var(--gap-lg); max-width: 1100px; }
    .page__head { display: flex; justify-content: space-between; align-items: flex-end; gap: var(--gap); margin-bottom: var(--gap-lg); }
    .page__sub { color: var(--ink-soft); margin: 0; }

    .reveal { padding: var(--gap-lg); margin-bottom: var(--gap); border-left: 4px solid var(--state-auto); }
    .reveal h2 { margin-bottom: 4px; }
    .reveal__row { display: flex; align-items: center; gap: var(--gap-sm); margin: var(--gap-sm) 0; }
    .reveal__label { font-size: 13px; color: var(--ink-soft); min-width: 130px; }
    .reveal code { padding: 4px 8px; background: var(--surface-sunken); border-radius: 4px; font-family: var(--font-code); }

    .form { padding: var(--gap-lg); margin-bottom: var(--gap); }
    .form__grid { display: grid; grid-template-columns: 1fr 1fr 160px; gap: 0 var(--gap); }

    .cell-title { font-weight: 500; }
    .cell-actions { display: flex; gap: 4px; white-space: nowrap; }

    select { padding: 6px 8px; font-size: 13px; }

    @media (max-width: 700px) {
      .form__grid { grid-template-columns: 1fr; }
    }
  `],
})
export class TeamComponent implements OnInit {
  private readonly service = inject(UserService);

  readonly members = signal<TeamMember[]>([]);
  readonly loading = signal(true);

  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly revealedUser = signal<CreatedUser | null>(null);

  readonly roleOptions = [
    { value: UserRole.Corretor, label: USER_ROLE_LABEL[UserRole.Corretor] },
    { value: UserRole.Gestor, label: USER_ROLE_LABEL[UserRole.Gestor] },
    { value: UserRole.Admin, label: USER_ROLE_LABEL[UserRole.Admin] },
  ];

  readonly form = inject(FormBuilder).nonNullable.group({
    name: ["", Validators.required],
    email: ["", [Validators.required, Validators.email]],
    role: [UserRole.Corretor, Validators.required],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.list().subscribe({
      next: (members) => {
        this.members.set(members);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
    if (!this.showForm()) {
      this.form.reset({ role: UserRole.Corretor });
      this.formError.set(null);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.formError.set(null);

    this.service.create(this.form.getRawValue()).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.showForm.set(false);
        this.revealedUser.set(created);
        this.form.reset({ role: UserRole.Corretor });
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err.status === 422 ? "Já existe uma conta com este e-mail." : "Não foi possível cadastrar.");
      },
    });
  }

  changeRole(member: TeamMember, role: UserRole): void {
    this.service.update(member.id, { name: member.name, role: Number(role) as UserRole, isActive: member.isActive })
      .subscribe({ next: () => this.load() });
  }

  toggleActive(member: TeamMember): void {
    this.service.update(member.id, { name: member.name, role: member.role, isActive: !member.isActive })
      .subscribe({ next: () => this.load() });
  }

  resetPassword(member: TeamMember): void {
    const confirmed = confirm(`Gerar uma nova senha provisória para ${member.name}? A senha atual dele deixa de funcionar.`);
    if (!confirmed) return;

    this.service.resetPassword(member.id).subscribe({
      next: (created) => {
        this.revealedUser.set(created);
        this.load();
      },
    });
  }

  copyPassword(password: string): void {
    void navigator.clipboard.writeText(password);
  }
}
