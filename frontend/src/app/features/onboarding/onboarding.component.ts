import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { SettingsService } from "../../core/services/settings.service";

interface TourCard {
  title: string;
  text: string;
}

const TOUR_CARDS: TourCard[] = [
  { title: "Painel", text: "Assim que você entrar, o painel mostra quantas conversas estão esperando por você — esse é o número que importa." },
  { title: "Conversas", text: "Toda mensagem do WhatsApp cai aqui. A IA responde sozinha usando o catálogo; você assume quando quiser." },
  { title: "Leads e imóveis", text: "Cada contato vira um lead com as preferências que ele foi contando. O catálogo de imóveis é o que a IA usa pra responder — mantenha atualizado." },
  { title: "Agendamentos", text: "Visitas e retornos combinados com os leads ficam organizados numa lista só, sem depender de agenda separada." },
];

@Component({
  selector: "app-onboarding",
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="onboarding">
      <div class="onboarding__card panel">
        <div class="steps">
          @for (n of [1, 2, 3]; track n) {
            <span class="steps__dot" [class.is-active]="step() === n" [class.is-done]="step() > n"></span>
          }
        </div>

        @switch (step()) {
          @case (1) {
            <h1>Vamos trocar sua senha</h1>
            <p class="lede">Você entrou com a senha provisória que o administrador te passou. Escolha uma senha sua para continuar.</p>

            <form [formGroup]="passwordForm" (ngSubmit)="submitPassword()">
              <div class="field">
                <label for="currentPassword">Senha provisória</label>
                <input id="currentPassword" type="password" formControlName="currentPassword" autocomplete="current-password" />
              </div>
              <div class="field">
                <label for="newPassword">Nova senha</label>
                <input id="newPassword" type="password" formControlName="newPassword" autocomplete="new-password" />
                <span class="hint-text">Pelo menos 8 caracteres.</span>
              </div>
              <div class="field">
                <label for="confirmPassword">Confirme a nova senha</label>
                <input id="confirmPassword" type="password" formControlName="confirmPassword" autocomplete="new-password" />
              </div>

              @if (passwordError()) {
                <p class="error-text">{{ passwordError() }}</p>
              }

              <button type="submit" class="btn btn--primary" [disabled]="passwordSaving()">
                {{ passwordSaving() ? "Salvando..." : "Trocar senha e continuar" }}
              </button>
            </form>
          }

          @case (2) {
            <h1>Um resumo rápido</h1>
            <p class="lede">Quatro telas, cada uma com um papel claro.</p>

            <div class="tour">
              @for (card of tourCards; track card.title) {
                <article class="tour__card">
                  <h3>{{ card.title }}</h3>
                  <p>{{ card.text }}</p>
                </article>
              }
            </div>

            <button type="button" class="btn btn--primary" (click)="step.set(3)">Entendi, continuar</button>
          }

          @case (3) {
            <h1>Conectar o WhatsApp</h1>
            <p class="lede">
              Isso conecta o número que vai atender pelo sistema. Se preferir, pode fazer isso depois, na área de Perfil.
            </p>

            @if (qrImage()) {
              <div class="qr">
                <img [src]="qrImage()" alt="QR code de conexão do WhatsApp" />
                <p class="hint-text">Abra o WhatsApp no celular → Aparelhos conectados → Conectar um aparelho, e aponte a câmera aqui.</p>
              </div>
            } @else if (qrError()) {
              <p class="error-text">{{ qrError() }}</p>
            }

            <div class="actions">
              <button type="button" class="btn" (click)="loadQrCode()" [disabled]="qrLoading()">
                {{ qrLoading() ? "Gerando..." : (qrImage() ? "Gerar outro código" : "Gerar QR code") }}
              </button>
              <button type="button" class="btn btn--primary" (click)="finish()">Concluir</button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .onboarding { min-height: 100vh; display: grid; place-items: center; padding: var(--gap); background: var(--canvas); }
    .onboarding__card { width: 100%; max-width: 480px; padding: var(--gap-lg); }

    .steps { display: flex; gap: 6px; margin-bottom: var(--gap-lg); }
    .steps__dot { width: 28px; height: 4px; border-radius: 100px; background: var(--rule); }
    .steps__dot.is-active { background: var(--ink); }
    .steps__dot.is-done { background: var(--state-auto); }

    h1 { margin-bottom: var(--gap-xs); }
    .lede { color: var(--ink-soft); margin-bottom: var(--gap-lg); }

    .hint-text { display: block; font-size: 12px; color: var(--ink-faint); margin-top: 2px; }

    .tour { display: flex; flex-direction: column; gap: var(--gap); margin-bottom: var(--gap-lg); }
    .tour__card { padding: var(--gap); border-radius: var(--radius); background: var(--surface-sunken); }
    .tour__card h3 { margin-bottom: 4px; }
    .tour__card p { margin: 0; color: var(--ink-soft); font-size: 14px; }

    .qr { text-align: center; margin-bottom: var(--gap); }
    .qr img { width: 220px; height: 220px; border: 1px solid var(--rule); border-radius: var(--radius); margin-bottom: var(--gap-sm); }

    .actions { display: flex; gap: var(--gap-sm); }
    .actions .btn { flex: 1; justify-content: center; }
  `],
})
export class OnboardingComponent {
  private readonly auth = inject(AuthService);
  private readonly settingsService = inject(SettingsService);
  private readonly router = inject(Router);

  readonly step = signal(1);
  readonly tourCards = TOUR_CARDS;

  readonly passwordSaving = signal(false);
  readonly passwordError = signal<string | null>(null);

  readonly qrLoading = signal(false);
  readonly qrImage = signal<string | null>(null);
  readonly qrError = signal<string | null>(null);

  readonly passwordForm = inject(FormBuilder).nonNullable.group({
    currentPassword: ["", Validators.required],
    newPassword: ["", [Validators.required, Validators.minLength(8)]],
    confirmPassword: ["", Validators.required],
  });

  submitPassword(): void {
    if (this.passwordForm.invalid || this.passwordSaving()) return;

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();

    if (newPassword !== confirmPassword) {
      this.passwordError.set("As senhas não coincidem.");
      return;
    }

    this.passwordSaving.set(true);
    this.passwordError.set(null);

    this.auth.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.passwordSaving.set(false);
        this.step.set(2);
      },
      error: (err) => {
        this.passwordSaving.set(false);
        this.passwordError.set(
          err.status === 422 ? err.error?.message ?? "Não foi possível trocar a senha." : "Senha provisória incorreta.",
        );
      },
    });
  }

  loadQrCode(): void {
    this.qrLoading.set(true);
    this.qrError.set(null);

    this.settingsService.getWhatsAppQrCode().subscribe({
      next: (result) => {
        this.qrLoading.set(false);
        if (result.alreadyConnected) {
          this.qrError.set(null);
          this.qrImage.set(null);
          this.finish();
          return;
        }
        this.qrImage.set(result.base64Image ? `data:image/png;base64,${result.base64Image}` : null);
        if (!result.base64Image) this.qrError.set("Não foi possível gerar o QR code agora. Tente de novo em instantes.");
      },
      error: () => {
        this.qrLoading.set(false);
        this.qrError.set("Configure o WhatsApp na área de Perfil quando quiser — pode continuar sem isso agora.");
      },
    });
  }

  finish(): void {
    void this.router.navigate(["/painel"]);
  }
}
