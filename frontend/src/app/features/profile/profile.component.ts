import { Component, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { TenantSettings } from "../../core/models";
import { AuthService } from "../../core/services/auth.service";
import { SettingsService } from "../../core/services/settings.service";

@Component({
  selector: "app-profile",
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule],
  template: `
    <section class="page">
      <header class="page__head">
        <h1>Perfil</h1>
        <p class="page__sub">Seus dados, sua senha e a conexão do WhatsApp.</p>
      </header>

      <div class="grid">
        <section class="panel card">
          <h2>Meus dados</h2>
          <dl class="facts">
            <dt>Nome</dt><dd>{{ auth.user()?.name }}</dd>
            <dt>E-mail</dt><dd>{{ auth.user()?.email }}</dd>
            <dt>Perfil</dt><dd>{{ auth.user()?.role }}</dd>
            <dt>Imobiliária</dt><dd>{{ auth.user()?.tenantName }}</dd>
          </dl>
        </section>

        <section class="panel card">
          <h2>Trocar senha</h2>
          <form [formGroup]="passwordForm" (ngSubmit)="submitPassword()">
            <div class="field">
              <label for="currentPassword">Senha atual</label>
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
            @if (passwordSuccess()) {
              <p class="success-text">Senha alterada.</p>
            }

            <button type="submit" class="btn btn--primary" [disabled]="passwordSaving()">
              {{ passwordSaving() ? "Salvando..." : "Trocar senha" }}
            </button>
          </form>
        </section>

        <section class="panel card card--wide">
          <h2>WhatsApp</h2>

          @if (loadingSettings()) {
            <p class="page__sub">Verificando conexão...</p>
          } @else {
            @if (settings(); as s) {
              <div class="whatsapp-status">
                <span class="state-tag" [class]="s.whatsAppConnected ? 'state-tag--auto' : 'state-tag--wait'">
                  {{ s.whatsAppConnected ? "Conectado" : "Não conectado" }}
                </span>
                @if (s.whatsAppNumber) {
                  <span class="page__sub">{{ s.whatsAppNumber }}</span>
                }
              </div>

              @if (!auth.isAdmin()) {
                <p class="page__sub">Só um administrador pode conectar ou trocar o número do WhatsApp.</p>
              } @else {
                <div class="field">
                  <label for="instanceName">Nome da instância (Evolution API)</label>
                  <input id="instanceName" [(ngModel)]="instanceName" [ngModelOptions]="{standalone: true}" placeholder="minha-imobiliaria" />
                </div>
                <button type="button" class="btn" (click)="saveInstance()" [disabled]="savingInstance()">
                  {{ savingInstance() ? "Salvando..." : "Salvar instância" }}
                </button>

                @if (!s.whatsAppConnected) {
                  <div class="qr-block">
                    <button type="button" class="btn btn--primary" (click)="loadQrCode()" [disabled]="qrLoading()">
                      {{ qrLoading() ? "Gerando..." : "Gerar QR code" }}
                    </button>

                    @if (qrImage()) {
                      <div class="qr">
                        <img [src]="qrImage()" alt="QR code de conexão do WhatsApp" />
                        <p class="hint-text">WhatsApp no celular → Aparelhos conectados → Conectar um aparelho.</p>
                      </div>
                    }
                    @if (qrError()) {
                      <p class="error-text">{{ qrError() }}</p>
                    }
                  </div>
                }
              }
            }
          }
        </section>
      </div>
    </section>
  `,
  styles: [`
    .page { padding: var(--gap-lg); max-width: 900px; }
    .page__head { margin-bottom: var(--gap-lg); }
    .page__sub { color: var(--ink-soft); margin: 0; }

    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap); }
    .card { padding: var(--gap-lg); }
    .card--wide { grid-column: span 2; }
    .card h2 { margin-bottom: var(--gap); }

    .facts { display: grid; grid-template-columns: auto 1fr; gap: 6px var(--gap); margin: 0 0 var(--gap); }
    .facts dt { color: var(--ink-soft); font-size: 13px; }
    .facts dd { margin: 0; font-weight: 500; }

    .hint-text { display: block; font-size: 12px; color: var(--ink-faint); margin-top: 2px; }
    .success-text { color: var(--state-auto); font-size: 13px; }

    .whatsapp-status { display: flex; align-items: center; gap: var(--gap-sm); margin-bottom: var(--gap); }

    .qr-block { margin-top: var(--gap); padding-top: var(--gap); border-top: 1px solid var(--rule); }
    .qr { margin-top: var(--gap); }
    .qr img { width: 200px; height: 200px; border: 1px solid var(--rule); border-radius: var(--radius); display: block; margin-bottom: var(--gap-sm); }

    @media (max-width: 760px) {
      .grid { grid-template-columns: 1fr; }
      .card--wide { grid-column: span 1; }
    }
  `],
})
export class ProfileComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly settingsService = inject(SettingsService);

  readonly settings = signal<TenantSettings | null>(null);
  readonly loadingSettings = signal(true);
  instanceName = "";

  readonly savingInstance = signal(false);
  readonly qrLoading = signal(false);
  readonly qrImage = signal<string | null>(null);
  readonly qrError = signal<string | null>(null);

  readonly passwordSaving = signal(false);
  readonly passwordError = signal<string | null>(null);
  readonly passwordSuccess = signal(false);

  readonly passwordForm = inject(FormBuilder).nonNullable.group({
    currentPassword: ["", Validators.required],
    newPassword: ["", [Validators.required, Validators.minLength(8)]],
    confirmPassword: ["", Validators.required],
  });

  ngOnInit(): void {
    this.settingsService.getSettings().subscribe({
      next: (s) => {
        this.settings.set(s);
        this.instanceName = s.evolutionInstanceName ?? "";
        this.loadingSettings.set(false);
      },
      error: () => this.loadingSettings.set(false),
    });
  }

  submitPassword(): void {
    if (this.passwordForm.invalid || this.passwordSaving()) return;

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();

    if (newPassword !== confirmPassword) {
      this.passwordError.set("As senhas não coincidem.");
      return;
    }

    this.passwordSaving.set(true);
    this.passwordError.set(null);
    this.passwordSuccess.set(false);

    this.auth.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.passwordSaving.set(false);
        this.passwordSuccess.set(true);
        this.passwordForm.reset();
      },
      error: () => {
        this.passwordSaving.set(false);
        this.passwordError.set("Senha atual incorreta.");
      },
    });
  }

  saveInstance(): void {
    this.savingInstance.set(true);

    this.settingsService.updateSettings({
      aiPersona: null,
      evolutionInstanceName: this.instanceName || null,
    }).subscribe({
      next: () => {
        this.savingInstance.set(false);
        this.settings.update((s) => (s ? { ...s, evolutionInstanceName: this.instanceName || null } : s));
      },
      error: () => this.savingInstance.set(false),
    });
  }

  loadQrCode(): void {
    this.qrLoading.set(true);
    this.qrError.set(null);

    this.settingsService.getWhatsAppQrCode().subscribe({
      next: (result) => {
        this.qrLoading.set(false);

        if (result.alreadyConnected) {
          this.settings.update((s) => (s ? { ...s, whatsAppConnected: true } : s));
          this.qrImage.set(null);
          return;
        }

        this.qrImage.set(result.base64Image ? `data:image/png;base64,${result.base64Image}` : null);
        if (!result.base64Image) this.qrError.set(result.error ?? "Não foi possível gerar o QR code agora.");
      },
      error: () => {
        this.qrLoading.set(false);
        this.qrError.set("Configure o nome da instância antes de conectar.");
      },
    });
  }
}
