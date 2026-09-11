import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

/**
 * Base HTTP compartilhada. Toda chamada de rede do app passa por um service
 * que estende esta classe: nenhum componente injeta HttpClient diretamente.
 */
@Injectable({ providedIn: "root" })
export class ApiService {
  protected readonly http = inject(HttpClient);
  protected readonly base = environment.apiUrl;

  protected get<T>(path: string, query?: Record<string, unknown>): Observable<T> {
    return this.http.get<T>(`${this.base}${path}`, { params: this.toParams(query) });
  }

  protected post<T>(path: string, body?: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body ?? {});
  }

  protected put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}${path}`, body);
  }

  protected delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}${path}`);
  }

  /** Remove null/undefined/"" para nao enviar filtro vazio na query string. */
  private toParams(query?: Record<string, unknown>): HttpParams {
    let params = new HttpParams();
    if (!query) return params;

    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === "") continue;

      if (Array.isArray(value)) {
        for (const item of value) params = params.append(key, String(item));
      } else {
        params = params.set(key, String(value));
      }
    }

    return params;
  }
}
