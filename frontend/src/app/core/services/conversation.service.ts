import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import {
  ConversationDetail, ConversationListItem, ConversationMode,
  ConversationStatus, Message, PagedResult,
} from "../models";
import { ApiService } from "./api.service";

export interface ConversationQuery {
  mode?: ConversationMode;
  status?: ConversationStatus;
  onlyNeedingAttention?: boolean;
  term?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: "root" })
export class ConversationService extends ApiService {
  list(query: ConversationQuery = {}): Observable<PagedResult<ConversationListItem>> {
    return this.get<PagedResult<ConversationListItem>>("/conversations", { ...query });
  }

  detail(id: string): Observable<ConversationDetail> {
    return this.get<ConversationDetail>(`/conversations/${id}`);
  }

  send(id: string, text: string): Observable<Message> {
    return this.post<Message>(`/conversations/${id}/messages`, { text });
  }

  takeOver(id: string): Observable<void> {
    return this.post<void>(`/conversations/${id}/take-over`);
  }

  resumeAutomation(id: string): Observable<void> {
    return this.post<void>(`/conversations/${id}/resume-automation`);
  }

  close(id: string): Observable<void> {
    return this.post<void>(`/conversations/${id}/close`);
  }

  markAsRead(id: string): Observable<void> {
    return this.post<void>(`/conversations/${id}/read`);
  }
}
