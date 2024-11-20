import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { UnsubscribeOnDestroyAdapter } from '../shared/UnsubscribeOnDestroyAdapter';
import { environment } from 'environments/environment';
import { OrdenesEntradaModel } from './ordenes-entrada.model';
import { ActivoMaestroModel } from './activo-maestro.model';

@Injectable()
export class OrdenesEntradaService extends UnsubscribeOnDestroyAdapter {
  private readonly API_URL = `${environment.apiUrl}/orden-entrada`;
  private readonly API_URL_BASICO = `${environment.apiUrl}`;
  isTblLoading = true;
  dataChange: BehaviorSubject<OrdenesEntradaModel[]> = new BehaviorSubject<OrdenesEntradaModel[]>([]);
  // Temporarily stores data from dialogs
  dialogData!: OrdenesEntradaModel;

  constructor(private readonly httpClient: HttpClient) {
    super();
  }

  get data(): OrdenesEntradaModel[] {
    return this.dataChange.value;
  }

  getDialogData() {
    return this.dialogData;
  }

  /** CRUD METHODS */
  getAllOrdenes(): Observable<OrdenesEntradaModel[]> {
    return this.httpClient.get<OrdenesEntradaModel[]>(`${this.API_URL}`);
  }

  getOrdenById(id: number): Observable<OrdenesEntradaModel> {
    return this.httpClient.get<OrdenesEntradaModel>(`${this.API_URL}/${id}/activos`);
  }

  addOrden(ordenesEntradaModel: OrdenesEntradaModel): Observable<OrdenesEntradaModel> {
    this.dialogData = ordenesEntradaModel;
    return this.httpClient.post<OrdenesEntradaModel>(this.API_URL, ordenesEntradaModel)
  }

  updateOrden(ordenesEntradaModel: OrdenesEntradaModel): Observable<OrdenesEntradaModel> {
    this.dialogData = ordenesEntradaModel;
    return this.httpClient.patch<OrdenesEntradaModel>(`${this.API_URL}/${ordenesEntradaModel.id}`, ordenesEntradaModel)
  }

  deleteOrden(id: number): Observable<string> {
    return this.httpClient.delete<string>(`${this.API_URL}/${id}`)
  }

  getMaestroActivoByPlaca(placa: string): Observable<ActivoMaestroModel[]> {
    return this.httpClient.get<ActivoMaestroModel[]>(`${this.API_URL_BASICO}/master-activos/${placa}`)
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

printOrder():  void {
  
}

}
