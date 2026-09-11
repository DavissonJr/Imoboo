import { Component, inject } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { AuthService } from "../core/services/auth.service";

@Component({
  selector: "app-shell",
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <nav class="rail">
        <div class="rail__brand">
          <span class="rail__mark">Imoboo</span>
          <span class="rail__tenant">{{ auth.user()?.tenantName }}</span>
        </div>

        <ul class="rail__nav">
          <li><a routerLink="/painel" routerLinkActive="is-active">Painel</a></li>
          <li><a routerLink="/conversas" routerLinkActive="is-active">Conversas</a></li>
          <li><a routerLink="/leads" routerLinkActive="is-active">Leads</a></li>
          <li><a routerLink="/imoveis" routerLinkActive="is-active">Imóveis</a></li>
          <li><a routerLink="/agendamentos" routerLinkActive="is-active">Agendamentos</a></li>
        </ul>

        <div class="rail__foot">
          <span class="rail__user">{{ auth.user()?.name }}</span>
          <button type="button" class="btn btn--quiet" (click)="auth.logout()">Sair</button>
        </div>
      </nav>

      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .shell { display: grid; grid-template-columns: 216px 1fr; min-height: 100vh; }

    .rail {
      display: flex;
      flex-direction: column;
      gap: var(--gap-lg);
      padding: var(--gap-lg) var(--gap);
      background: var(--surface);
      border-right: 1px solid var(--rule);
      position: sticky;
      top: 0;
      height: 100vh;
    }

    .rail__brand { display: flex; flex-direction: column; gap: 2px; }
    .rail__mark { font-size: 19px; font-weight: 700; letter-spacing: -0.02em; }
    .rail__tenant { font-size: 13px; color: var(--ink-faint); }

    .rail__nav { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .rail__nav a {
      display: block;
      padding: 8px 12px;
      border-radius: var(--radius);
      color: var(--ink-soft);
      font-weight: 500;
    }
    .rail__nav a:hover { background: var(--surface-sunken); text-decoration: none; }
    .rail__nav a.is-active { background: var(--ink); color: var(--ink-inverse); }

    .rail__foot { display: flex; flex-direction: column; gap: var(--gap-sm); align-items: flex-start; }
    .rail__user { font-size: 13px; color: var(--ink-soft); }

    .content { min-width: 0; }

    @media (max-width: 900px) {
      .shell { grid-template-columns: 1fr; }
      .rail { position: static; height: auto; flex-direction: row; align-items: center; flex-wrap: wrap; }
      .rail__nav { flex-direction: row; flex-wrap: wrap; }
    }
  `],
})
export class ShellComponent {
  readonly auth = inject(AuthService);
}
