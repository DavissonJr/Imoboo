import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
import { platformAdminGuard } from "./core/guards/platform-admin.guard";

export const routes: Routes = [
  {
    path: "",
    pathMatch: "full",
    loadComponent: () => import("./features/landing/landing.component").then((m) => m.LandingComponent),
  },
  {
    path: "entrar",
    loadComponent: () => import("./features/auth/login.component").then((m) => m.LoginComponent),
  },
  {
    path: "c/:tenantSlug",
    loadComponent: () =>
      import("./features/public-catalog/public-catalog.component").then((m) => m.PublicCatalogComponent),
  },
  {
    path: "primeiro-acesso",
    canActivate: [authGuard],
    loadComponent: () => import("./features/onboarding/onboarding.component").then((m) => m.OnboardingComponent),
  },
  {
    path: "",
    canActivate: [authGuard],
    loadComponent: () => import("./layout/shell.component").then((m) => m.ShellComponent),
    children: [
      { path: "", pathMatch: "full", redirectTo: "painel" },
      {
        path: "painel",
        loadComponent: () =>
          import("./features/dashboard/dashboard.component").then((m) => m.DashboardComponent),
      },
      {
        path: "conversas",
        loadComponent: () =>
          import("./features/conversations/inbox.component").then((m) => m.InboxComponent),
      },
      {
        path: "leads",
        loadComponent: () =>
          import("./features/leads/lead-list.component").then((m) => m.LeadListComponent),
      },
      {
        path: "imoveis",
        loadComponent: () =>
          import("./features/properties/property-list.component").then((m) => m.PropertyListComponent),
      },
      {
        path: "imoveis/novo",
        loadComponent: () =>
          import("./features/properties/property-form.component").then((m) => m.PropertyFormComponent),
      },
      {
        path: "imoveis/:id/editar",
        loadComponent: () =>
          import("./features/properties/property-form.component").then((m) => m.PropertyFormComponent),
      },
      {
        path: "agendamentos",
        loadComponent: () =>
          import("./features/appointments/appointment-list.component").then((m) => m.AppointmentListComponent),
      },
      {
        path: "perfil",
        loadComponent: () =>
          import("./features/profile/profile.component").then((m) => m.ProfileComponent),
      },
      {
        path: "contas",
        canActivate: [platformAdminGuard],
        loadComponent: () =>
          import("./features/platform-accounts/platform-accounts.component").then((m) => m.PlatformAccountsComponent),
      },
    ],
  },
  { path: "**", redirectTo: "" },
];
