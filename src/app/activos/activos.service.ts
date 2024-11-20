import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { UnsubscribeOnDestroyAdapter } from '../shared/UnsubscribeOnDestroyAdapter';
import { ActivosModel } from './activos.model';
import { environment } from 'environments/environment';

@Injectable()
export class ActivosService extends UnsubscribeOnDestroyAdapter {
  private readonly API_URL = `${environment.apiUrl}/activos`; 
  isTblLoading = true;
  dataChange: BehaviorSubject<ActivosModel[]> = new BehaviorSubject<ActivosModel[]>([]);
  // Temporarily stores data from dialogs
  dialogData!: ActivosModel;

  constructor(private readonly httpClient: HttpClient) {
    super();
  }

  get data(): ActivosModel[] {
    return this.dataChange.value;
  }

  getDialogData() {
    return this.dialogData;
  }

  /** CRUD METHODS */
  getAllActivos(): Observable<ActivosModel[]> {
    return this.httpClient.get<ActivosModel[]>(this.API_URL);
  }

  getActivoById(id: string): Observable<ActivosModel> {
    return this.httpClient.get<ActivosModel>(`${this.API_URL}/${id}`);
  }

  addActivos(activosModel: ActivosModel): Observable<ActivosModel> {
    this.dialogData = activosModel;
    return this.httpClient.post<ActivosModel>(this.API_URL, activosModel)
  }

  updateActivos(activosModel: ActivosModel): Observable<ActivosModel> {
    this.dialogData = activosModel;
    return this.httpClient.patch<ActivosModel>(`${this.API_URL}/${activosModel.id}`, activosModel)
  }

  deleteActivos(id: string): Observable<string> {
    console.log(id);
    return this.httpClient.delete<string>(`${this.API_URL}/${id}`)
  }

  fetchData(): void {
    this.getAllActivos().subscribe({
      next: (data) => {
        this.isTblLoading = false;
        this.dataChange.next(data);
      },
      error: (error: HttpErrorResponse) => {
        this.isTblLoading = false;
        console.log(error.name + ' ' + error.message);
      }
    });
  }
}
