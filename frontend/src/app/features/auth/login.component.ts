import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="login">
      <form class="login__card panel" [formGroup]="form" (ngSubmit)="submit()">
        <h1>Entrar no ImobooCRM</h1>
        <p class="login__lede">Acompanhe as conversas do WhatsApp em um só lugar.</p>

        <div class="field">
          <label for="email">E-mail</label>
          <input id="email" type="email" formControlName="email" autocomplete="username" />
        </div>

        <div class="field">
          <label for="password">Senha</label>
          <input id="password" type="password" formControlName="password" autocomplete="current-password" />
        </div>

        @if (error()) {
          <p class="error-text">{{ error() }}</p>
        }

        <button type="submit" class="btn btn--primary" [disabled]="form.invalid || loading()">
          {{ loading() ? "Entrando..." : "Entrar" }}
        </button>
      </form>
    </div>
  `,
  styles: [`
    .login { display: grid; place-items: center; min-height: 100vh; padding: var(--gap); }
    .login__card { width: 100%; max-width: 380px; padding: var(--gap-lg); }
    .login__lede { color: var(--ink-soft); margin-bottom: var(--gap-lg); }
    h1 { margin-bottom: var(--gap-xs); }
    .btn { width: 100%; justify-content: center; }
  `],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(6)]],
  });

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.form.getRawValue();

    this.auth.login(email, password).subscribe({
      next: () => void this.router.navigate(["/painel"]),
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          err.status === 401
            ? "E-mail ou senha incorretos."
            : "Não foi possível entrar agora. Tente de novo em instantes.",
        );
      },
    });
  }
}
