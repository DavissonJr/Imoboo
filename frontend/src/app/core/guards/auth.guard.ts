import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return router.createUrlTree(["/entrar"]);

  // Senha provisória: força passar pelo primeiro acesso antes de liberar o resto do app.
  if (auth.mustChangePassword() && state.url !== "/primeiro-acesso") {
    return router.createUrlTree(["/primeiro-acesso"]);
  }

  return true;
};
