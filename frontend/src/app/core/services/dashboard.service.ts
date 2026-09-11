import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { DashboardSummary } from "../models";
import { ApiService } from "./api.service";

@Injectable({ providedIn: "root" })
export class DashboardService extends ApiService {
  summary(): Observable<DashboardSummary> {
    return this.get<DashboardSummary>("/dashboard/summary");
  }
}
