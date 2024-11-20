import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { AuthService } from '@core';
import { SubSink, UnsubscribeOnDestroyAdapter } from '@shared';
@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss'],
})
export class SigninComponent
  implements OnInit
{
  authForm!: UntypedFormGroup;
  submitted = false;
  loading = false;
  error = '';
  hide = true;
  private subs = new SubSink();

  constructor(
    private readonly formBuilder: UntypedFormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService
  ) {}

  ngOnInit() {
    this.authForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }
  get f() {
    return this.authForm.controls;
  }
  onSubmit() {
    this.submitted = true;
    this.loading = true;
    this.error = '';
    if (this.authForm.invalid) {
      this.error = 'Username and Password not valid !';
      return;
    }

    const username = this.f['username'].value;
    const password = this.f['password'].value;

    console.log('username', username)
    console.log('password', password)

    this.subs.sink = this.authService.login(username, password).subscribe({
      next: (user) => {
        if (user && user.access_token) {
            this.router.navigate(['/dashboard/dashboard1']);
        } else {
          this.error = 'Invalid Login';
        }
        this.loading = false;
      },
        error: (err) => {

          this.error = 'Invalid Login';
          this.loading = false;
        },

    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
