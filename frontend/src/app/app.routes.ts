import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";

export const routes: Routes = [
  {
    path: "entrar",
    loadComponent: () => import("./features/auth/login.component").then((m) => m.LoginComponent),
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
    ],
  },
  { path: "**", redirectTo: "" },
];
