import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import {
  PagedResult, PropertyDetail, PropertyListItem, PropertyPhoto,
  PropertySearchFilter, UpsertPropertyRequest,
} from "../models";
import { ApiService } from "./api.service";

@Injectable({ providedIn: "root" })
export class PropertyService extends ApiService {
  list(filter: PropertySearchFilter = {}): Observable<PagedResult<PropertyListItem>> {
    return this.get<PagedResult<PropertyListItem>>("/properties", { ...filter });
  }

  detail(id: string): Observable<PropertyDetail> {
    return this.get<PropertyDetail>(`/properties/${id}`);
  }

  create(request: UpsertPropertyRequest): Observable<{ id: string }> {
    return this.post<{ id: string }>("/properties", request);
  }

  update(id: string, request: UpsertPropertyRequest): Observable<void> {
    return this.put<void>(`/properties/${id}`, request);
  }

  remove(id: string): Observable<void> {
    return this.delete<void>(`/properties/${id}`);
  }

  uploadPhoto(propertyId: string, file: File): Observable<PropertyPhoto> {
    const form = new FormData();
    form.append("file", file);
    // Não usa o helper post() genérico: FormData não pode ir com Content-Type
    // "application/json" forçado, então a chamada HTTP é feita direto aqui.
    return this.http.post<PropertyPhoto>(`${this.base}/properties/${propertyId}/photos`, form);
  }

  removePhoto(propertyId: string, photoId: string): Observable<void> {
    return this.delete<void>(`/properties/${propertyId}/photos/${photoId}`);
  }

  setCoverPhoto(propertyId: string, photoId: string): Observable<void> {
    return this.post<void>(`/properties/${propertyId}/photos/${photoId}/cover`);
  }

  reorderPhotos(propertyId: string, orderedPhotoIds: string[]): Observable<void> {
    return this.put<void>(`/properties/${propertyId}/photos/order`, orderedPhotoIds);
  }
}
