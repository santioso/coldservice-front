import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ActivosEnOrdenEntradaInterface, AddOrdenSalidaInterface, OrdenesSalidaModel } from './ordenes-salida.model';
import { environment } from 'environments/environment';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { ActivoMaestroModel } from 'app/ordenes-entrada/activo-maestro.model';

@Injectable({
  providedIn: 'root'
})
export class OrdenesSalidaService extends UnsubscribeOnDestroyAdapter {
  private readonly API_URL = `${environment.apiUrl}/orden-salida`;
  private readonly API_URL_BASICO = `${environment.apiUrl}`;
  isTblLoading = true;
  dataChange: BehaviorSubject<OrdenesSalidaModel[]> = new BehaviorSubject<OrdenesSalidaModel[]>([]);
  //Temporary stores data from dialogs
  dialogData!: OrdenesSalidaModel;

  constructor(private readonly httpClient: HttpClient) {
    super();
  }

  get data(): OrdenesSalidaModel[] {
    return this.dataChange.value;
  }

  getDialogData() {
    return this.dialogData;
  }

  /** CRUD METHODS */
  getAllOrdenes(): Observable<OrdenesSalidaModel[]> {
    return this.httpClient.get<OrdenesSalidaModel[]>(this.API_URL);
  }

  getOrdenById(id: number): Observable<OrdenesSalidaModel> {
    return this.httpClient.get<OrdenesSalidaModel>(`${this.API_URL}/${id}/activos`);
  }

  addOrden(orden: AddOrdenSalidaInterface): Observable<AddOrdenSalidaInterface> {
    return this.httpClient.post<AddOrdenSalidaInterface>(this.API_URL, orden);
  }

  updateOrden(orden: AddOrdenSalidaInterface, id: number): Observable<AddOrdenSalidaInterface> {
    return this.httpClient.patch<AddOrdenSalidaInterface>(`${this.API_URL}/${id}`, orden);
  }

  deleteOrden(id: number): Observable<void> {
    return this.httpClient.delete<void>(`${this.API_URL}/${id}`);
  }

   getMaestroActivoByPlaca(placa: string): Observable<ActivoMaestroModel[]> {
      return this.httpClient.get<ActivoMaestroModel[]>(`${this.API_URL_BASICO}/master-activos/${placa}`)
    }

  getAllActivosOrdenesEntrada(): Observable<ActivosEnOrdenEntradaInterface[]> {
      return this.httpClient.get<ActivosEnOrdenEntradaInterface[]>(`${this.API_URL}/activos-salida`);
    }


  fetchData(): void {
    this.getAllOrdenes().subscribe({
      next: (data) => {
        this.isTblLoading = false;
        this.dataChange.next(data);
      },
      error: (error: HttpErrorResponse) => {
        this.isTblLoading = false;
        console.error(error.name + ' ' + error.message);
      }
    });
  }

  printOrder(id: number): Observable<HttpResponse<Blob>> {
    return this.httpClient.get(`${this.API_URL_BASICO}/reporte-orden/orden-salida/${id}`, {
      responseType: 'blob',
      observe: 'response',
    })
  }
}
