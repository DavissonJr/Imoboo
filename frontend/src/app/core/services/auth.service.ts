import { HttpClient } from "@angular/common/http";
import { Injectable, computed, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, tap } from "rxjs";
import { environment } from "../../../environments/environment";
import { ChangePasswordRequest, LoginResponse } from "../models";

const STORAGE_KEY = "imoboo.session";

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly session = signal<LoginResponse | null>(this.restore());

  readonly user = computed(() => this.session());
  readonly isAuthenticated = computed(() => {
    const s = this.session();
    return !!s && new Date(s.expiresAtUtc) > new Date();
  });

  // O role do login vem como string ("Admin"/"Gestor"/"Corretor") — diferente do
  // enum numérico usado nas outras respostas, porque a API devolve user.Role.ToString().
  readonly isAdmin = computed(() => this.session()?.role === "Admin");
  readonly isPlatformAdmin = computed(() => this.session()?.isPlatformAdmin ?? false);
  readonly mustChangePassword = computed(() => this.session()?.mustChangePassword ?? false);

  get token(): string | null {
    return this.session()?.token ?? null;
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((response) => {
          this.session.set(response);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(response));
        }),
      );
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/users/me/change-password`, request).pipe(
      tap(() => {
        // A senha provisória deixou de valer: limpa a flag local sem precisar de novo login.
        const current = this.session();
        if (!current) return;
        const updated = { ...current, mustChangePassword: false };
        this.session.set(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }),
    );
  }

  logout(): void {
    this.session.set(null);
    localStorage.removeItem(STORAGE_KEY);
    void this.router.navigate(["/entrar"]);
  }

  private restore(): LoginResponse | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as LoginResponse;
      return new Date(parsed.expiresAtUtc) > new Date() ? parsed : null;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }
}
