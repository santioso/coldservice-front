import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable, filter, map } from 'rxjs';
import Swal from 'sweetalert2';
import { MonitoringSession } from './monitoring.models';

const MONITORING_SESSION_KEY = 'monitoringSession';
const MONITORING_WARNING_TIMEOUT_MS = 59 * 60 * 1000;
const MONITORING_LOGOUT_TIMEOUT_MS = 60 * 60 * 1000;
const ACTIVITY_RESET_THROTTLE_MS = 1000;
const MONITORING_ACTIVITY_EVENTS = [
  'click',
  'keydown',
  'mousemove',
  'scroll',
  'touchstart',
];

@Injectable({ providedIn: 'root' })
export class MonitoringAuthService {
  private readonly sessionSubject =
    new BehaviorSubject<MonitoringSession | null>(this.readStoredSession());
  private warningTimerId?: ReturnType<typeof setTimeout>;
  private logoutTimerId?: ReturnType<typeof setTimeout>;
  private lastActivityResetAt = 0;
  private inactivityTracking = false;
  private readonly activityHandler = () => this.resetInactivityTimers();

  readonly session$ = this.sessionSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe((event) => {
        if (!this.isProtectedMonitoringRoute(event.urlAfterRedirects)) {
          this.stopInactivityTracking();
        }
      });
  }

  get currentSession(): MonitoringSession | null {
    return this.sessionSubject.value;
  }

  get token(): string | null {
    return this.currentSession?.token ?? null;
  }

  login(email: string, password: string): Observable<MonitoringSession> {
    return this.http
      .post<MonitoringSession>(
        `${environment.apiUrl}/api/v1/monitoring/auth/login`,
        {
          email,
          password,
        },
      )
      .pipe(
        map((session) => {
          localStorage.setItem(MONITORING_SESSION_KEY, JSON.stringify(session));
          this.sessionSubject.next(session);
          return session;
        }),
      );
  }

  logout(): void {
    this.stopInactivityTracking();
    localStorage.removeItem(MONITORING_SESSION_KEY);
    this.sessionSubject.next(null);
    this.router.navigate(['/monitoring/login']);
  }

  startInactivityTracking(targetUrl = this.router.url): void {
    if (!this.isProtectedMonitoringRoute(targetUrl)) {
      this.stopInactivityTracking();
      return;
    }
    if (!this.currentSession?.token || this.inactivityTracking) return;
    this.inactivityTracking = true;
    this.lastActivityResetAt = 0;
    MONITORING_ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, this.activityHandler, {
        passive: true,
      });
    });
    this.resetInactivityTimers(true, targetUrl);
  }

  private stopInactivityTracking(): void {
    if (!this.inactivityTracking) return;
    this.inactivityTracking = false;
    this.clearInactivityTimers();
    MONITORING_ACTIVITY_EVENTS.forEach((eventName) => {
      window.removeEventListener(eventName, this.activityHandler);
    });
  }

  private resetInactivityTimers(
    force = false,
    targetUrl = this.router.url,
  ): void {
    if (!this.isProtectedMonitoringRoute(targetUrl)) {
      this.stopInactivityTracking();
      return;
    }
    const now = Date.now();
    if (!force && now - this.lastActivityResetAt < ACTIVITY_RESET_THROTTLE_MS) {
      return;
    }
    this.lastActivityResetAt = now;
    this.clearInactivityTimers();
    this.warningTimerId = setTimeout(
      () => this.showInactivityWarning(),
      MONITORING_WARNING_TIMEOUT_MS,
    );
    this.logoutTimerId = setTimeout(
      () => this.logoutDueToInactivity(),
      MONITORING_LOGOUT_TIMEOUT_MS,
    );
  }

  private clearInactivityTimers(): void {
    if (this.warningTimerId) clearTimeout(this.warningTimerId);
    if (this.logoutTimerId) clearTimeout(this.logoutTimerId);
    this.warningTimerId = undefined;
    this.logoutTimerId = undefined;
  }

  private showInactivityWarning(): void {
    if (!this.isProtectedMonitoringRoute(this.router.url)) {
      this.stopInactivityTracking();
      return;
    }
    this.showMonitoringToast(
      'Su sesión de monitoreo se reiniciará en 1 minuto por inactividad.',
      'warning',
    );
  }

  private logoutDueToInactivity(): void {
    if (!this.isProtectedMonitoringRoute(this.router.url)) {
      this.stopInactivityTracking();
      return;
    }
    this.stopInactivityTracking();
    localStorage.removeItem(MONITORING_SESSION_KEY);
    this.sessionSubject.next(null);
    this.router.navigate(['/monitoring/login']).then(() => {
      this.showMonitoringToast(
        'Sesión de monitoreo cerrada por inactividad. Inicie sesión nuevamente.',
        'info',
      );
    });
  }

  private showMonitoringToast(message: string, icon: 'warning' | 'info'): void {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title: message,
      showConfirmButton: false,
      timer: 5000,
      timerProgressBar: true,
    });
  }

  private isProtectedMonitoringRoute(url: string): boolean {
    const [path] = url.split(/[?#]/);
    const isMonitoringRoute = path === '/monitoring' || path.startsWith('/monitoring/');
    const isLoginRoute = path === '/monitoring/login' || path.startsWith('/monitoring/login/');
    return isMonitoringRoute && !isLoginRoute;
  }

  private readStoredSession(): MonitoringSession | null {
    const raw = localStorage.getItem(MONITORING_SESSION_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as MonitoringSession;
      return parsed?.token ? parsed : null;
    } catch {
      localStorage.removeItem(MONITORING_SESSION_KEY);
      return null;
    }
  }
}
