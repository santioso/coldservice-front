import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AssetsService {
  private _notifications: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
  #apiUrl = `${environment.apiUrl}/`;

constructor(private _httpClient: HttpClient) { }

getAll(): Observable<any> {
  return this._httpClient.get<any>(`${this.#apiUrl}asset`)
}

}
