import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import {
  LeadDetail, LeadListItem, LeadStatus, LeadTemperature,
  PagedResult, PropertyListItem,
} from "../models";
import { ApiService } from "./api.service";

export interface LeadQuery {
  status?: LeadStatus;
  temperature?: LeadTemperature;
  term?: string;
  idleForDays?: number;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: "root" })
export class LeadService extends ApiService {
  list(query: LeadQuery = {}): Observable<PagedResult<LeadListItem>> {
    return this.get<PagedResult<LeadListItem>>("/leads", { ...query });
  }

  detail(id: string): Observable<LeadDetail> {
    return this.get<LeadDetail>(`/leads/${id}`);
  }

  suggestedProperties(id: string): Observable<PropertyListItem[]> {
    return this.get<PropertyListItem[]>(`/leads/${id}/suggested-properties`);
  }
}
