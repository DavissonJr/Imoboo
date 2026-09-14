import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="login">
      <aside class="login__brand">
        <div class="login__brand-glow" aria-hidden="true"></div>
        <a routerLink="/" class="login__wordmark">Imoboo</a>

        <div class="login__pitch">
          <p class="login__quote">
            "O cliente que espera resposta é o cliente que fecha com outro."
          </p>
          <p class="login__sub">
            Enquanto você mostra um imóvel, o Imoboo já respondeu o próximo.
          </p>
        </div>

        <a routerLink="/" class="login__back">← Voltar para o início</a>
      </aside>

      <main class="login__main">
        <form class="login__card" [formGroup]="form" (ngSubmit)="submit()">
          <h1>Entrar</h1>
          <p class="login__lede">Acesse o painel da sua conta.</p>

          <div class="field">
            <label for="email">E-mail</label>
            <input id="email" type="email" formControlName="email" autocomplete="username" placeholder="voce@suaimobiliaria.com" />
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

          <p class="login__hint">
            Ainda não tem acesso? <a href="https://wa.me/5581996533458" target="_blank" rel="noopener">Fale com a gente</a>.
          </p>
        </form>
      </main>
    </div>
  `,
  styles: [`
    :host {
      --lg-ink: #171A21;
      --lg-paper: #EFEAE0;
      --lg-brass: #A87830;
      --lg-brass-bright: #C79A52;
      --lg-ink-soft: #8B93A0;
      --font-serif: "Fraunces", Georgia, serif;
      display: block;
    }

    .login { display: grid; grid-template-columns: 1fr 1fr; min-height: 100vh; }

    /* --- painel de marca --- */
    .login__brand {
      position: relative; overflow: hidden; background: var(--lg-ink); color: var(--lg-paper);
      padding: 48px; display: flex; flex-direction: column; justify-content: space-between;
    }
    .login__brand-glow {
      position: absolute; inset: -20% -20% auto -10%; height: 60%;
      background: radial-gradient(closest-side, rgba(168,120,48,0.3), transparent 70%);
      filter: blur(10px); pointer-events: none;
    }
    .login__wordmark {
      position: relative; font-family: var(--font-serif); font-size: 22px; font-weight: 600;
      color: var(--lg-paper); text-decoration: none;
    }
    .login__pitch { position: relative; max-width: 40ch; }
    .login__quote {
      font-family: var(--font-serif); font-size: 28px; line-height: 1.4; margin: 0 0 16px;
      border-left: 3px solid var(--lg-brass); padding-left: 20px;
    }
    .login__sub { color: var(--lg-ink-soft); font-size: 15px; line-height: 1.6; margin: 0; }
    .login__back {
      position: relative; color: var(--lg-ink-soft); font-size: 14px; text-decoration: none; width: fit-content;
    }
    .login__back:hover { color: var(--lg-paper); }

    /* --- painel do formulario --- */
    .login__main { display: grid; place-items: center; padding: var(--gap); background: var(--canvas); }
    .login__card { width: 100%; max-width: 360px; }
    .login__card h1 { font-family: var(--font-serif); font-size: 28px; margin-bottom: 4px; }
    .login__lede { color: var(--ink-soft); margin-bottom: var(--gap-lg); }
    .login__hint { text-align: center; font-size: 13px; color: var(--ink-soft); margin-top: var(--gap); }
    .login__hint a { color: var(--lg-brass); font-weight: 600; }

    .btn { width: 100%; justify-content: center; }
    .btn--primary { background: var(--lg-ink); }
    .btn--primary:hover:not(:disabled) { background: #0d1017; }

    @media (max-width: 820px) {
      .login { grid-template-columns: 1fr; }
      .login__brand { padding: 32px 24px; min-height: 260px; }
      .login__quote { font-size: 22px; }
    }
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
