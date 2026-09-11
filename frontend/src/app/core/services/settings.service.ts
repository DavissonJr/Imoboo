import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { TenantSettings, UpdateTenantSettingsRequest, WhatsAppQrCode } from "../models";
import { ApiService } from "./api.service";

@Injectable({ providedIn: "root" })
export class SettingsService extends ApiService {
  getSettings(): Observable<TenantSettings> {
    return this.get<TenantSettings>("/settings");
  }

  updateSettings(request: UpdateTenantSettingsRequest): Observable<void> {
    return this.put<void>("/settings", request);
  }

  getWhatsAppQrCode(): Observable<WhatsAppQrCode> {
    return this.post<WhatsAppQrCode>("/settings/whatsapp/qrcode");
  }
}
