import { DatePipe } from "@angular/common";
import { Component, OnDestroy, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Subject, interval, switchMap, takeUntil } from "rxjs";
import {
  ConversationDetail, ConversationListItem, ConversationMode, ConversationStatus,
  HANDOFF_LABEL, HandoffReason, MessageAuthor,
} from "../../core/models";
import { ConversationService } from "../../core/services/conversation.service";

@Component({
  selector: "app-inbox",
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="inbox">
      <!-- coluna 1: fila -->
      <aside class="queue">
        <header class="queue__head">
          <h1>Conversas</h1>
          <label class="queue__toggle">
            <input type="checkbox" [(ngModel)]="onlyAttention" (ngModelChange)="loadList()" />
            Só as que esperam por mim
          </label>
        </header>

        @if (listLoading()) {
          <p class="hint">Carregando conversas...</p>
        } @else if (conversations().length === 0) {
          <div class="empty">
            <h3>Nenhuma conversa aqui</h3>
            <p>Quando um cliente mandar mensagem no WhatsApp, ela aparece nesta lista.</p>
          </div>
        } @else {
          <ul class="queue__list">
            @for (c of conversations(); track c.id) {
              <li>
                <button
                  type="button"
                  class="row"
                  [class.is-selected]="c.id === selectedId()"
                  (click)="select(c.id)">
                  <span class="row__top">
                    <span class="row__name">{{ c.leadName }}</span>
                    <span class="row__time">{{ c.lastMessageAtUtc | date: "dd/MM HH:mm" }}</span>
                  </span>
                  <span class="row__preview">{{ c.lastMessagePreview || "Sem mensagens" }}</span>
                  <span class="row__foot">
                    <span class="state-tag" [class]="stateClass(c)">{{ stateLabel(c) }}</span>
                    @if (c.handoffReason !== 0) {
                      <span class="row__reason">{{ handoffLabel(c.handoffReason) }}</span>
                    }
                    @if (c.unreadCount > 0) {
                      <span class="row__unread">{{ c.unreadCount }}</span>
                    }
                  </span>
                </button>
              </li>
            }
          </ul>
        }
      </aside>

      <!-- coluna 2: conversa -->
      <section class="thread">
        @if (!selectedId()) {
          <div class="empty">
            <h3>Escolha uma conversa</h3>
            <p>Selecione um contato à esquerda para ver o histórico e responder.</p>
          </div>
        } @else {
          @if (detail(); as d) {
          <header class="thread__head">
            <div>
              <h2>{{ d.leadName }}</h2>
              <span class="hint">{{ d.leadPhone }}</span>
            </div>

            <div class="thread__actions">
              <span class="state-tag" [class]="detailStateClass(d)">{{ detailStateLabel(d) }}</span>
              @if (d.mode === Mode.Automatica) {
                <button type="button" class="btn" (click)="takeOver(d.id)">Assumir conversa</button>
              } @else {
                <button type="button" class="btn" (click)="resume(d.id)">Devolver para a IA</button>
              }
            </div>
          </header>

          @if (d.handoffReason !== 0) {
            <p class="banner">{{ handoffLabel(d.handoffReason) }} — a automação está pausada.</p>
          }

          <div class="messages">
            @for (m of d.messages; track m.id) {
              <article class="bubble" [class]="bubbleClass(m.author)">
                <span class="bubble__author">{{ authorLabel(m.author) }}</span>
                <p class="bubble__text">{{ m.content }}</p>
                @if (m.properties.length) {
                  <p class="bubble__props">
                    Imóveis citados:
                    @for (p of m.properties; track p.id) {
                      <span class="code">{{ p.code }}</span>
                    }
                  </p>
                }
                <span class="bubble__time">{{ m.sentAtUtc | date: "dd/MM HH:mm" }}</span>
              </article>
            } @empty {
              <p class="hint">Nenhuma mensagem nesta conversa ainda.</p>
            }
          </div>

          <form class="composer" (ngSubmit)="send()">
            <textarea
              rows="2"
              placeholder="Escreva uma resposta"
              [(ngModel)]="draft"
              name="draft"
              [disabled]="sending()"></textarea>
            <button type="submit" class="btn btn--primary" [disabled]="!draft.trim() || sending()">
              {{ sending() ? "Enviando..." : "Enviar" }}
            </button>
          </form>
          <p class="hint composer__note">Ao responder você assume a conversa e a IA para de responder.</p>
          } @else {
            <p class="hint">Carregando conversa...</p>
          }
        }
      </section>
    </div>
  `,
  styles: [`
    .inbox { display: grid; grid-template-columns: 340px 1fr; height: 100dvh; }

    .queue { border-right: 1px solid var(--rule); background: var(--surface); overflow-y: auto; min-height: 0; }
    .queue__head { padding: var(--gap); border-bottom: 1px solid var(--rule); position: sticky; top: 0; background: var(--surface); }
    .queue__head h1 { font-size: 19px; margin-bottom: var(--gap-sm); }
    .queue__toggle { display: flex; align-items: center; gap: var(--gap-sm); font-size: 13px; color: var(--ink-soft); }
    .queue__toggle input { width: auto; }

    .queue__list { list-style: none; margin: 0; padding: 0; }

    .row {
      display: flex; flex-direction: column; gap: var(--gap-xs);
      width: 100%; padding: 12px var(--gap);
      border: none; border-bottom: 1px solid var(--rule); border-left: 3px solid transparent;
      background: transparent; text-align: left; font: inherit; cursor: pointer;
    }
    .row:hover { background: var(--surface-sunken); }
    .row.is-selected { background: var(--surface-sunken); border-left-color: var(--ink); }
    .row__top { display: flex; justify-content: space-between; gap: var(--gap-sm); }
    .row__name { font-weight: 600; }
    .row__time { font-size: 12px; color: var(--ink-faint); white-space: nowrap; }
    .row__preview {
      font-size: 13px; color: var(--ink-soft);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .row__foot { display: flex; align-items: center; gap: var(--gap-sm); flex-wrap: wrap; }
    .row__reason { font-size: 12px; color: var(--ink-faint); }
    .row__unread {
      margin-left: auto; min-width: 20px; padding: 0 6px;
      border-radius: 100px; background: var(--ink); color: var(--ink-inverse);
      font-size: 12px; font-weight: 600; text-align: center;
    }

    .thread { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
    .thread__head {
      display: flex; justify-content: space-between; align-items: center; gap: var(--gap);
      padding: var(--gap) var(--gap-lg); border-bottom: 1px solid var(--rule); background: var(--surface);
    }
    .thread__actions { display: flex; align-items: center; gap: var(--gap-sm); }

    .banner {
      margin: 0; padding: 10px var(--gap-lg);
      background: var(--state-wait-bg); color: var(--state-wait); font-size: 14px;
    }

    .messages { flex: 1; overflow-y: auto; padding: var(--gap-lg); display: flex; flex-direction: column; gap: var(--gap); }

    .bubble { max-width: 62ch; padding: 10px 14px; border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--rule); }
    .bubble--lead { align-self: flex-start; }
    .bubble--ia { align-self: flex-end; background: var(--state-auto-bg); border-color: transparent; }
    .bubble--corretor { align-self: flex-end; background: var(--state-human-bg); border-color: transparent; }
    .bubble--sistema { align-self: center; background: var(--surface-sunken); font-size: 13px; }
    .bubble__author { font-size: 12px; font-weight: 600; color: var(--ink-soft); }
    .bubble__text { margin: 2px 0 4px; white-space: pre-wrap; }
    .bubble__props { margin: 0 0 4px; font-size: 12px; color: var(--ink-soft); display: flex; gap: 6px; flex-wrap: wrap; }
    .bubble__time { font-size: 11px; color: var(--ink-faint); }

    .composer { display: flex; gap: var(--gap-sm); padding: var(--gap) var(--gap-lg) var(--gap-sm); border-top: 1px solid var(--rule); background: var(--surface); }
    .composer textarea { resize: none; }
    .composer__note { padding: 0 var(--gap-lg) var(--gap); background: var(--surface); margin: 0; }

    .hint { color: var(--ink-soft); font-size: 13px; padding: var(--gap); margin: 0; }

    @media (max-width: 900px) {
      .inbox {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr;
        height: calc(100dvh - 56px);
      }
      .queue { border-right: none; border-bottom: 1px solid var(--rule); max-height: 38vh; }
    }
  `],
})
export class InboxComponent implements OnInit, OnDestroy {
  private readonly service = inject(ConversationService);
  private readonly destroy$ = new Subject<void>();

  protected readonly Mode = ConversationMode;

  readonly conversations = signal<ConversationListItem[]>([]);
  readonly detail = signal<ConversationDetail | null>(null);
  readonly selectedId = signal<string | null>(null);
  readonly listLoading = signal(true);
  readonly sending = signal(false);

  onlyAttention = false;
  draft = "";

  ngOnInit(): void {
    this.loadList();

    // Enquanto nao houver WebSocket, um poll leve mantem a fila atualizada.
    interval(20_000)
      .pipe(
        switchMap(() => this.service.list({ onlyNeedingAttention: this.onlyAttention, pageSize: 50 })),
        takeUntil(this.destroy$),
      )
      .subscribe({ next: (result) => this.conversations.set(result.items) });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadList(): void {
    this.listLoading.set(true);

    this.service.list({ onlyNeedingAttention: this.onlyAttention, pageSize: 50 }).subscribe({
      next: (result) => {
        this.conversations.set(result.items);
        this.listLoading.set(false);
      },
      error: () => this.listLoading.set(false),
    });
  }

  select(id: string): void {
    this.selectedId.set(id);
    this.detail.set(null);
    this.draft = "";

    this.service.detail(id).subscribe({ next: (d) => this.detail.set(d) });
    this.service.markAsRead(id).subscribe({ next: () => this.clearUnread(id) });
  }

  send(): void {
    const id = this.selectedId();
    const text = this.draft.trim();
    if (!id || !text || this.sending()) return;

    this.sending.set(true);

    this.service.send(id, text).subscribe({
      next: () => {
        this.draft = "";
        this.sending.set(false);
        this.select(id);
        this.loadList();
      },
      error: () => this.sending.set(false),
    });
  }

  takeOver(id: string): void {
    this.service.takeOver(id).subscribe({ next: () => this.select(id) });
  }

  resume(id: string): void {
    this.service.resumeAutomation(id).subscribe({ next: () => this.select(id) });
  }

  // --- rotulos de estado ---

  stateLabel(c: ConversationListItem): string {
    if (c.status === ConversationStatus.Encerrada) return "Encerrada";
    if (c.mode === ConversationMode.Humana) return "Com você";
    if (c.mode === ConversationMode.Menu) return "Menu automático";
    return "IA respondendo";
  }

  stateClass(c: ConversationListItem): string {
    if (c.status === ConversationStatus.Encerrada) return "state-tag--closed";
    if (c.status === ConversationStatus.AguardandoCorretor) return "state-tag--wait";
    if (c.mode === ConversationMode.Humana) return "state-tag--human";
    if (c.mode === ConversationMode.Menu) return "state-tag--closed";
    return "state-tag--auto";
  }

  detailStateLabel(d: ConversationDetail): string {
    return this.stateLabel(d as unknown as ConversationListItem);
  }

  detailStateClass(d: ConversationDetail): string {
    return this.stateClass(d as unknown as ConversationListItem);
  }

  handoffLabel(reason: HandoffReason): string {
    return HANDOFF_LABEL[reason];
  }

  authorLabel(author: MessageAuthor): string {
    return { 1: "Cliente", 2: "IA", 3: "Você", 4: "Sistema" }[author] ?? "";
  }

  bubbleClass(author: MessageAuthor): string {
    return { 1: "bubble--lead", 2: "bubble--ia", 3: "bubble--corretor", 4: "bubble--sistema" }[author] ?? "";
  }

  private clearUnread(id: string): void {
    this.conversations.update((list) =>
      list.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)),
    );
  }
}
