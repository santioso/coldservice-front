import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { MonitoringAuthService } from './monitoring-auth.service';

@Injectable({ providedIn: 'root' })
export class MonitoringAuthGuard {
  constructor(
    private readonly authService: MonitoringAuthService,
    private readonly router: Router,
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): boolean {
    if (this.authService.currentSession?.token) {
      this.authService.startInactivityTracking(state.url);
      return true;
    }
    this.router.navigate(['/monitoring/login']);
    return false;
  }
}
