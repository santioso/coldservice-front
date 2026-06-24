import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { MonitoringSession } from './monitoring.models';

const MONITORING_SESSION_KEY = 'monitoringSession';

@Injectable({ providedIn: 'root' })
export class MonitoringAuthService {
  private readonly sessionSubject =
    new BehaviorSubject<MonitoringSession | null>(this.readStoredSession());

  readonly session$ = this.sessionSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

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
    localStorage.removeItem(MONITORING_SESSION_KEY);
    this.sessionSubject.next(null);
    this.router.navigate(['/monitoring/login']);
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
