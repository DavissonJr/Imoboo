import { Component, inject, signal } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { DrawerModule } from "primeng/drawer";
import { AuthService } from "../core/services/auth.service";

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const BASE_NAV: NavItem[] = [
  { path: "/painel", label: "Painel", icon: "pi pi-home" },
  { path: "/conversas", label: "Conversas", icon: "pi pi-comments" },
  { path: "/leads", label: "Leads", icon: "pi pi-user" },
  { path: "/imoveis", label: "Imóveis", icon: "pi pi-building" },
  { path: "/agendamentos", label: "Agendamentos", icon: "pi pi-calendar" },
];

@Component({
  selector: "app-shell",
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, DrawerModule],
  template: `
    <div class="shell">
      <!-- barra lateral fixa (desktop) -->
      <nav class="rail rail--desktop">
        <div class="rail__brand">
          <span class="rail__mark">Imoboo</span>
          <span class="rail__tenant">{{ auth.user()?.tenantName }}</span>
        </div>

        <ul class="rail__nav">
          @for (item of navItems(); track item.path) {
            <li>
              <a [routerLink]="item.path" routerLinkActive="is-active">
                <i [class]="item.icon"></i>
                <span>{{ item.label }}</span>
              </a>
            </li>
          }
        </ul>

        <div class="rail__foot">
          <a routerLink="/perfil" routerLinkActive="is-active" class="rail__user">
            <i class="pi pi-user-circle"></i>
            <span>{{ auth.user()?.name }}</span>
          </a>
          <button type="button" class="rail__logout" (click)="auth.logout()">
            <i class="pi pi-sign-out"></i>
            Sair
          </button>
        </div>
      </nav>

      <!-- topo com menu hamburguer (mobile/tablet) -->
      <header class="topbar">
        <button type="button" class="topbar__menu" (click)="drawerOpen.set(true)" aria-label="Abrir menu">
          <i class="pi pi-bars"></i>
        </button>
        <span class="rail__mark">Imoboo</span>
      </header>

      <p-drawer [(visible)]="drawerOpenModel" position="left" header="Imoboo" styleClass="rail-drawer">
        <div class="rail__tenant rail__tenant--drawer">{{ auth.user()?.tenantName }}</div>

        <ul class="rail__nav">
          @for (item of navItems(); track item.path) {
            <li>
              <a [routerLink]="item.path" routerLinkActive="is-active" (click)="drawerOpen.set(false)">
                <i [class]="item.icon"></i>
                <span>{{ item.label }}</span>
              </a>
            </li>
          }
        </ul>

        <div class="rail__foot rail__foot--drawer">
          <a routerLink="/perfil" routerLinkActive="is-active" class="rail__user" (click)="drawerOpen.set(false)">
            <i class="pi pi-user-circle"></i>
            <span>{{ auth.user()?.name }}</span>
          </a>
          <button type="button" class="rail__logout" (click)="auth.logout()">
            <i class="pi pi-sign-out"></i>
            Sair
          </button>
        </div>
      </p-drawer>

      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100dvh; overflow: hidden; }

    .shell { height: 100%; background: var(--canvas); }

    /* --- barra lateral desktop: fixa, independente do fluxo do conteudo --- */
    .rail--desktop {
      display: flex;
      flex-direction: column;
      gap: var(--gap-lg);
      width: 216px;
      padding: var(--gap-lg) var(--gap);
      background: var(--surface);
      border-right: 1px solid var(--rule);
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      overflow-y: auto;
      z-index: 10;
    }

    .rail__brand { display: flex; flex-direction: column; gap: 2px; }
    .rail__mark { font-size: 19px; font-weight: 700; letter-spacing: -0.02em; }
    .rail__tenant { font-size: 13px; color: var(--ink-faint); }
    .rail__tenant--drawer { margin: 4px 0 var(--gap); }

    .rail__nav { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .rail__nav a {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px;
      border-radius: var(--radius);
      color: var(--ink-soft);
      font-weight: 500;
      text-decoration: none;
    }
    .rail__nav a i { font-size: 15px; width: 16px; text-align: center; }
    .rail__nav a:hover { background: var(--surface-sunken); text-decoration: none; }
    .rail__nav a.is-active { background: var(--ink); color: var(--ink-inverse); }

    .rail__foot { display: flex; flex-direction: column; gap: var(--gap-sm); align-items: stretch; }
    .rail__foot--drawer { margin-top: var(--gap-lg); }
    .rail__user {
      display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink-soft); text-decoration: none;
    }
    .rail__user:hover { color: var(--ink); text-decoration: none; }
    .rail__logout {
      display: flex; align-items: center; gap: 8px;
      border: none; background: transparent; padding: 6px 0; cursor: pointer;
      font: inherit; font-size: 13px; color: var(--ink-soft); text-align: left;
    }
    .rail__logout:hover { color: var(--danger); }

    /* --- topo mobile/tablet --- */
    .topbar {
      display: none;
      align-items: center; gap: var(--gap-sm);
      height: 56px;
      padding: 0 var(--gap);
      background: var(--surface);
      border-bottom: 1px solid var(--rule);
      position: sticky; top: 0; z-index: 20;
      box-sizing: border-box;
    }
    .topbar__menu {
      display: flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border: none; border-radius: var(--radius);
      background: var(--surface-sunken); color: var(--ink); cursor: pointer; font-size: 16px;
    }

    .content { margin-left: 216px; height: 100%; overflow-y: auto; min-width: 0; }

    @media (max-width: 900px) {
      .rail--desktop { display: none; }
      .topbar { display: flex; }
      .content { margin-left: 0; }
    }
  `],
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly navItems = signal(BASE_NAV);
  readonly drawerOpen = signal(false);

  // p-drawer usa banana-box [(visible)]; um getter/setter conecta isso ao signal.
  get drawerOpenModel(): boolean {
    return this.drawerOpen();
  }
  set drawerOpenModel(value: boolean) {
    this.drawerOpen.set(value);
  }

  constructor() {
    if (this.auth.isPlatformAdmin()) {
      this.navItems.update((items) => [...items, { path: "/contas", label: "Contas", icon: "pi pi-briefcase" }]);
    }
  }
}
