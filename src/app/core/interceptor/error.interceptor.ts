import { AuthService } from "../service/auth.service";
import { Injectable } from "@angular/core";
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
} from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { MonitoringAuthService } from "app/monitoring/monitoring-auth.service";

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private authenticationService: AuthService,
    private monitoringAuthService: MonitoringAuthService,
  ) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((err) => {
        if (err.status === 401) {
          if (request.url.includes('/api/v1/monitoring/')) {
            this.monitoringAuthService.clearExpiredSession();
            return throwError(err);
          }

          // auto logout if 401 response returned from api
          this.authenticationService.logout();
          location.reload();
        }

        const error = err.error.message || err.statusText;
        return throwError(error);
      })
    );
  }
}
