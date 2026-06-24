import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../service/auth.service';
import { MonitoringAuthService } from 'app/monitoring/monitoring-auth.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(
    private readonly authenticationService: AuthService,
    private readonly monitoringAuthService: MonitoringAuthService,
  ) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    // No añadir encabezado de autorización para solicitudes a ThingSpeak
    if (request.url.includes('api.thingspeak.com')) {
      return next.handle(request);
    }

    if (request.url.includes('/api/v1/monitoring/')) {
      const monitoringToken = this.monitoringAuthService.token;
      if (monitoringToken) {
        request = request.clone({
          setHeaders: {
            Authorization: `Bearer ${monitoringToken}`,
          },
        });
      }
      return next.handle(request);
    }

    // add authorization header with jwt token if available
    const currentUser = this.authenticationService.currentUserValue;
    if (currentUser?.access_token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${currentUser.access_token}`,
        },
      });
    }

    return next.handle(request);
  }
}
