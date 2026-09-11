import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { CreateAccountRequest, CreatedAccount, PlatformAccount } from "../models";
import { ApiService } from "./api.service";

@Injectable({ providedIn: "root" })
export class PlatformAdminService extends ApiService {
  listAccounts(): Observable<PlatformAccount[]> {
    return this.get<PlatformAccount[]>("/platform/accounts");
  }

  createAccount(request: CreateAccountRequest): Observable<CreatedAccount> {
    return this.post<CreatedAccount>("/platform/accounts", request);
  }

  setActive(tenantId: string, isActive: boolean): Observable<void> {
    return this.post<void>(`/platform/accounts/${tenantId}/toggle-active`, isActive);
  }

  resetOwnerPassword(tenantId: string): Observable<CreatedAccount> {
    return this.post<CreatedAccount>(`/platform/accounts/${tenantId}/reset-password`);
  }
}
