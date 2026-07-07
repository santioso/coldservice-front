import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { MonitoringAuthService } from '../monitoring-auth.service';

@Component({
  selector: 'app-monitoring-login',
  templateUrl: './monitoring-login.component.html',
  styleUrls: ['./monitoring-login.component.scss'],
})
export class MonitoringLoginComponent implements OnInit {
  form!: FormGroup;
  hidePassword = true;
  loading = false;
  error = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: MonitoringAuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  submit(): void {
    this.error = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const { email, password } = this.form.value;
    this.authService
      .login(email, password)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => this.router.navigate(['/monitoring/dashboard']),
        error: (err: unknown) => {
          this.error = this.formatError(err);
        },
      });
  }

  private formatError(err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) {
      return 'No fue posible iniciar sesión';
    }
    const backendMessage =
      (typeof err.error === 'object' && err.error && 'message' in err.error
        ? (err.error as any).message
        : null) ?? null;

    if (Array.isArray(backendMessage)) {
      return backendMessage.join(', ');
    }
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage;
    }
    if (typeof err.status === 'number' && err.status > 0) {
      return `No fue posible iniciar sesión (HTTP ${err.status})`;
    }
    return 'No fue posible iniciar sesión';
  }
}
