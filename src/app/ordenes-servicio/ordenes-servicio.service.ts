import { Injectable } from '@angular/core';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { environment } from 'environments/environment';
import { ActivesEntryModel, CreateOrdenesServicioModel, OrdenesServicioDetailsModel, OrdenesServicioModel } from './ordenes-servicio.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class OrdenesServicioService extends UnsubscribeOnDestroyAdapter {
  private readonly API_URL = `${environment.apiUrl}/services`;
  private readonly API_URL_BASICO = `${environment.apiUrl}`;
  isTblLoading = true;
  dataChange: BehaviorSubject<OrdenesServicioModel[]> = new BehaviorSubject<OrdenesServicioModel[]>([]);
  // Temporarily stores data from dialogs
  dialogData!: OrdenesServicioModel;
  dialogDataCreate!: CreateOrdenesServicioModel;

  constructor(private readonly httpClient: HttpClient ) {
    super();
  }

  get data(): OrdenesServicioModel[] {
    return this.dataChange.value;
  }

  getDialogData() {
    return this.dialogData;
  }

  getDialogDataCreate() {
    return this.dialogDataCreate;
  }

  /** CRUD METHODS */
  getAllOrdenes(): Observable<OrdenesServicioModel[]> {
    return this.httpClient.get<OrdenesServicioModel[]>(`${this.API_URL}`);
  }

  getOrderServicedetails(id: number): Observable<OrdenesServicioDetailsModel> {
    return this.httpClient.get<OrdenesServicioDetailsModel>(`${this.API_URL_BASICO}/service-order-details/${id}`);
  }

  addOrden(ordenesServicioModel: CreateOrdenesServicioModel): Observable<OrdenesServicioModel> {
    this.dialogDataCreate = ordenesServicioModel;
    return this.httpClient.post<OrdenesServicioModel>(this.API_URL, ordenesServicioModel)
  }

  updateOrden(ordenesServicioModel: CreateOrdenesServicioModel): Observable<OrdenesServicioModel> {
    this.dialogDataCreate = ordenesServicioModel;
    return this.httpClient.put<OrdenesServicioModel>(`${this.API_URL}/${ordenesServicioModel.id}`, ordenesServicioModel)
  }

  deleteOrden(id: number) {
    return this.httpClient.delete(`${this.API_URL}/${id}`)
  }

  addServiceOrderDetail(detail: any): Observable<any> {
    return this.httpClient.post(`${this.API_URL_BASICO}/service-order-details/`, detail);
  }

  updateServiceOrderDetail(id: number, detail: any): Observable<any> {
    return this.httpClient.put(`${this.API_URL_BASICO}/service-order-details/${id}`, detail);
  }

  deleteServiceOrderDetail(id: number) {
    return this.httpClient.delete(`${this.API_URL_BASICO}/service-order-details/${id}`)
  }

  fetchData(): void {
    this.getAllOrdenes().subscribe({
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

  getStatus(): Observable<any> {
    return this.httpClient.get<any>(`${this.API_URL}/show-column-status`)
  }

  getActivesEntry(): Observable<any[]> {
    return this.httpClient.get<any[]>(`${this.API_URL}/actives-for-service-order`)
  }

  getTechnicals(): Observable<any[]> {
    return this.httpClient.get<any[]>(`${this.API_URL_BASICO}/technicals`)
  }

}
