import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import {
  AppointmentListItem, AppointmentStatus, PagedResult, UpsertAppointmentRequest,
} from "../models";
import { ApiService } from "./api.service";

export interface AppointmentQuery {
  leadId?: string;
  status?: AppointmentStatus;
  onlyUpcoming?: boolean;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: "root" })
export class AppointmentService extends ApiService {
  list(query: AppointmentQuery = {}): Observable<PagedResult<AppointmentListItem>> {
    return this.get<PagedResult<AppointmentListItem>>("/appointments", { ...query });
  }

  create(request: UpsertAppointmentRequest): Observable<{ id: string }> {
    return this.post<{ id: string }>("/appointments", request);
  }

  update(id: string, request: UpsertAppointmentRequest): Observable<void> {
    return this.put<void>(`/appointments/${id}`, request);
  }

  updateStatus(id: string, status: AppointmentStatus): Observable<void> {
    return this.http.patch<void>(`${this.base}/appointments/${id}/status`, { status });
  }

  remove(id: string): Observable<void> {
    return this.delete<void>(`/appointments/${id}`);
  }
}
