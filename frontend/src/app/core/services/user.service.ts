import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { CreatedUser, CreateUserRequest, TeamMember, UpdateUserRequest } from "../models";
import { ApiService } from "./api.service";

@Injectable({ providedIn: "root" })
export class UserService extends ApiService {
  list(): Observable<TeamMember[]> {
    return this.get<TeamMember[]>("/users");
  }

  create(request: CreateUserRequest): Observable<CreatedUser> {
    return this.post<CreatedUser>("/users", request);
  }

  update(id: string, request: UpdateUserRequest): Observable<void> {
    return this.put<void>(`/users/${id}`, request);
  }

  resetPassword(id: string): Observable<CreatedUser> {
    return this.post<CreatedUser>(`/users/${id}/reset-password`);
  }
}
