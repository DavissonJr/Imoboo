import { Component, OnInit, inject, signal } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { InputTextModule } from "primeng/inputtext";
import { TagModule } from "primeng/tag";
import { TenantSettings } from "../../core/models";
import { AuthService } from "../../core/services/auth.service";
import { SettingsService } from "../../core/services/settings.service";

@Component({
  selector: "app-profile",
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, ButtonModule, CardModule, InputTextModule, TagModule],
  template: `
    <section class="page">
      <header class="page-head">
        <h1>Perfil</h1>
        <p class="page-sub">Seus dados, sua senha e a conexão do WhatsApp.</p>
      </header>

      <div class="grid">
        <p-card styleClass="card" header="Meus dados">
          <dl class="facts">
            <dt>Nome</dt><dd>{{ auth.user()?.name }}</dd>
            <dt>E-mail</dt><dd>{{ auth.user()?.email }}</dd>
            <dt>Perfil</dt><dd>{{ auth.user()?.role }}</dd>
            <dt>Imobiliária</dt><dd>{{ auth.user()?.tenantName }}</dd>
          </dl>
        </p-card>

        <p-card styleClass="card" header="Trocar senha">
          <form [formGroup]="passwordForm" (ngSubmit)="submitPassword()">
            <div class="field">
              <label for="currentPassword">Senha atual</label>
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
            @if (passwordSuccess()) {
              <p class="success-text"><i class="pi pi-check-circle"></i> Senha alterada.</p>
            }

            <p-button type="submit" label="Trocar senha" icon="pi pi-lock" [disabled]="passwordSaving()" [loading]="passwordSaving()" />
          </form>
        </p-card>

        <p-card styleClass="card card--wide" header="WhatsApp">
          @if (loadingSettings()) {
            <p class="page-sub">Verificando conexão...</p>
          } @else {
            @if (settings(); as s) {
              <div class="whatsapp-status">
                <p-tag [value]="s.whatsAppConnected ? 'Conectado' : 'Não conectado'" [severity]="s.whatsAppConnected ? 'success' : 'warn'" />
                @if (s.whatsAppNumber) {
                  <span class="page-sub">{{ s.whatsAppNumber }}</span>
                }
              </div>

              @if (!auth.isAdmin()) {
                <p class="page-sub">Só um administrador pode conectar ou trocar o número do WhatsApp.</p>
              } @else {
                <div class="field">
                  <label for="instanceName">Nome da instância (Evolution API)</label>
                  <input pInputText id="instanceName" [(ngModel)]="instanceName" [ngModelOptions]="{standalone: true}" placeholder="minha-imobiliaria" />
                </div>
                <p-button label="Salvar instância" icon="pi pi-save" [text]="true" (onClick)="saveInstance()" [disabled]="savingInstance()" [loading]="savingInstance()" />

                @if (!s.whatsAppConnected) {
                  <div class="qr-block">
                    <p-button label="Gerar QR code" icon="pi pi-qrcode" (onClick)="loadQrCode()" [disabled]="qrLoading()" [loading]="qrLoading()" />

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
        </p-card>
      </div>
    </section>
  `,
  styles: [`
    .page { padding: 28px; max-width: 900px; }
    .page-head { margin-bottom: 24px; }
    .page-head h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 4px; }
    .page-sub { color: var(--p-text-muted-color); margin: 0; font-size: 14px; }

    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    :host ::ng-deep .card--wide { grid-column: span 2; }
    :host ::ng-deep .card .p-card-body { padding: 20px; }
    :host ::ng-deep .card .p-card-title { font-size: 16px; font-weight: 700; }

    .facts { display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; margin: 0; }
    .facts dt { color: var(--p-text-muted-color); font-size: 13px; }
    .facts dd { margin: 0; font-weight: 600; }

    .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
    .field label { font-size: 13px; font-weight: 600; color: var(--p-text-muted-color); }
    .field input { width: 100%; }

    .hint-text { display: block; font-size: 12px; color: var(--p-text-muted-color); margin-top: 2px; }
    .success-text { color: var(--p-green-500); font-size: 13px; display: flex; align-items: center; gap: 6px; }
    .error-text { color: var(--p-red-500); font-size: 13px; margin: 0 0 12px; }

    .whatsapp-status { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }

    .qr-block { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--p-content-border-color); }
    .qr { margin-top: 16px; }
    .qr img { width: 200px; height: 200px; border: 1px solid var(--p-content-border-color); border-radius: 8px; display: block; margin-bottom: 10px; }

    @media (max-width: 760px) {
      .page { padding: 18px; }
      .grid { grid-template-columns: 1fr; }
      :host ::ng-deep .card--wide { grid-column: span 1; }
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

        this.qrImage.set(result.base64Image ? this.toDataUri(result.base64Image) : null);
        if (!result.base64Image) this.qrError.set(result.error ?? "Não foi possível gerar o QR code agora.");
      },
      error: () => {
        this.qrLoading.set(false);
        this.qrError.set("Configure o nome da instância antes de conectar.");
      },
    });
  }

  /** A Evolution às vezes já manda o base64 com o prefixo "data:image/..." embutido. */
  private toDataUri(base64: string): string {
    return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
  }
}
