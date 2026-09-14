import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { PropertySearchFilter, PublicCatalogResponse } from "../models";
import { ApiService } from "./api.service";

@Injectable({ providedIn: "root" })
export class PublicCatalogService extends ApiService {
  search(tenantSlug: string, filter: PropertySearchFilter = {}): Observable<PublicCatalogResponse> {
    return this.get<PublicCatalogResponse>(`/public/catalog/${tenantSlug}`, { ...filter });
  }
}
