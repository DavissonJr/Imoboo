import { Component, inject, signal } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { InputTextModule } from "primeng/inputtext";
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
  imports: [ReactiveFormsModule, ButtonModule, CardModule, InputTextModule],
  template: `
    <div class="onboarding">
      <p-card styleClass="onboarding-card">
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
                <input pInputText id="currentPassword" type="password" formControlName="currentPassword" autocomplete="current-password" />
              </div>
              <div class="field">
                <label for="newPassword">Nova senha</label>
                <input pInputText id="newPassword" type="password" formControlName="newPassword" autocomplete="new-password" />
                <span class="hint-text">Pelo menos 8 caracteres.</span>
              </div>
              <div class="field">
                <label for="confirmPassword">Confirme a nova senha</label>
                <input pInputText id="confirmPassword" type="password" formControlName="confirmPassword" autocomplete="new-password" />
              </div>

              @if (passwordError()) {
                <p class="error-text">{{ passwordError() }}</p>
              }

              <p-button type="submit" label="Trocar senha e continuar" icon="pi pi-arrow-right" iconPos="right"
                [disabled]="passwordSaving()" [loading]="passwordSaving()" styleClass="full-width" />
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

            <p-button label="Entendi, continuar" icon="pi pi-arrow-right" iconPos="right" (onClick)="step.set(3)" styleClass="full-width" />
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
              <p-button [label]="qrLoading() ? 'Gerando...' : (qrImage() ? 'Gerar outro código' : 'Gerar QR code')"
                icon="pi pi-qrcode" [severity]="'secondary'" [outlined]="true"
                (onClick)="loadQrCode()" [disabled]="qrLoading()" [loading]="qrLoading()" styleClass="full-width" />
              <p-button label="Concluir" icon="pi pi-check" (onClick)="finish()" styleClass="full-width" />
            </div>
          }
        }
      </p-card>
    </div>
  `,
  styles: [`
    .onboarding { min-height: 100vh; display: grid; place-items: center; padding: 20px; background: var(--p-surface-50); }
    :host ::ng-deep .onboarding-card { width: 100%; max-width: 480px; }
    :host ::ng-deep .onboarding-card .p-card-body { padding: 28px; }
    :host ::ng-deep .full-width { width: 100%; justify-content: center; }

    .steps { display: flex; gap: 6px; margin-bottom: 24px; }
    .steps__dot { width: 28px; height: 4px; border-radius: 100px; background: var(--p-content-border-color); }
    .steps__dot.is-active { background: var(--p-primary-color); }
    .steps__dot.is-done { background: var(--p-green-500); }

    h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
    .lede { color: var(--p-text-muted-color); margin: 0 0 24px; font-size: 14px; }

    .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
    .field label { font-size: 13px; font-weight: 600; color: var(--p-text-muted-color); }
    .field input { width: 100%; }

    .hint-text { display: block; font-size: 12px; color: var(--p-text-muted-color); margin-top: 2px; }
    .error-text { color: var(--p-red-500); font-size: 13px; margin: 0 0 12px; }

    .tour { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
    .tour__card { padding: 14px 16px; border-radius: 10px; background: var(--p-surface-100); }
    .tour__card h3 { margin: 0 0 4px; font-size: 15px; font-weight: 700; }
    .tour__card p { margin: 0; color: var(--p-text-muted-color); font-size: 13.5px; }

    .qr { text-align: center; margin-bottom: 16px; }
    .qr img { width: 220px; height: 220px; border: 1px solid var(--p-content-border-color); border-radius: 8px; margin-bottom: 10px; }

    .actions { display: flex; gap: 8px; }
    .actions p-button { flex: 1; }
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
        this.qrImage.set(result.base64Image ? this.toDataUri(result.base64Image) : null);
        if (!result.base64Image) {
          this.qrError.set(result.error ?? "Não foi possível gerar o QR code agora. Tente de novo em instantes.");
        }
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

  /** A Evolution às vezes já manda o base64 com o prefixo "data:image/..." embutido. */
  private toDataUri(base64: string): string {
    return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
  }
}
