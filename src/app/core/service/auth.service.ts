import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from '../models/user';
import { environment } from 'environments/environment';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly currentUserSubject: BehaviorSubject<User>;
  public currentUser: Observable<User>;

  constructor(private readonly http: HttpClient) {
    this.currentUserSubject = new BehaviorSubject<User>(
      JSON.parse(localStorage.getItem('currentUser') ?? '{}')
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User {
    return this.currentUserSubject.value;
  }

  login(username: string, password: string): Observable<User> {
    return this.http
      .post<{ access_token: string; userdata: string }>(`${environment.apiUrl}/users/login`, {
        username,
        password,
      })
      .pipe(
        map((response) => {
          const { access_token, userdata } = response;
          let decodedUserdata: User = {} as User;
          if (access_token && userdata) {
            decodedUserdata = jwtDecode<User>(userdata);
            decodedUserdata.access_token = access_token;
            localStorage.setItem('currentUser', JSON.stringify(userdata));
            localStorage.setItem('access_token', access_token);
            this.currentUserSubject.next(decodedUserdata);
          console.log('user', decodedUserdata)
          }
          return decodedUserdata;
        })
      );
  }

  logout() {
    // remove user from local storage to log user out
    localStorage.removeItem('currentUser');
  //  localStorage.removeItem('access_token');
    this.currentUserSubject.next(this.currentUserValue);
    return of({ success: false });
  }
}
