import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { ClientModel } from 'app/models/client.model';
import { UtilPopupService } from '@shared/services/util-popup.service';

export interface ApiResponse {
  status: number;
  message: string;
  errorCode?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientsService extends UnsubscribeOnDestroyAdapter {
  private _notifications: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
  #apiUrl = `${environment.apiUrl}/`;
  isTblLoading = true;

  dataChange: BehaviorSubject<ClientModel[]> = new BehaviorSubject<
  ClientModel[]
>([]);

// Temporarily stores data from dialogs
  dialogData!: ClientModel;


constructor(
  private _httpClient: HttpClient,
  private utilPopupService: UtilPopupService,
) {
  super();
}

getAll(): Observable<ClientModel[]> {
  return this._httpClient.get<ClientModel[]>(`${this.#apiUrl}clients`)
}

getDialogData() {
  return this.dialogData;
}


// ***************************************


  // get data(): AdvanceTable[] {
  //   return this.dataChange.value;
  // }

  /** CRUD METHODS */
  getAllAdvanceTables(): void {
    this.subs.sink = this._httpClient
      .get<ClientModel[]>( this.#apiUrl)
      .subscribe({
        next: (data) => {
          this.isTblLoading = false;
          this.dataChange.next(data);
        },
        error: (error: HttpErrorResponse) => {
          this.isTblLoading = false;
          console.log(error.name + ' ' + error.message);
        },
      });
  }

  addClientRow(client: ClientModel): void {
    this.dialogData = client;
    this._httpClient.post(`${this.#apiUrl}clients`, client)
       .subscribe({
         next: () => {
           this.dialogData = client;
         },
         error: (error: HttpErrorResponse) => {
          console.error(error);
         },
       });
  }

  updateClientRow(client: ClientModel): void {
    const id = client.id;
    this._httpClient.patch(`${this.#apiUrl}clients/${id}`, client)
    .subscribe({
      next: () => {
        this.dialogData = client;
      },
      error: (error: HttpErrorResponse) => {
       console.error(error);
      },
    });
  }

  deleteClientRow(id: number): void {
    this._httpClient.delete(`${this.#apiUrl}clients/${id}`)
      .subscribe({
        next: () => {
          this.utilPopupService.mostrarMensaje(`Cliente ${id} eliminado exitosamente`, 'success', 'Éxito', false);
        },
        error: (error: string) => {
          if (error.includes('sedes asociadas')) {
            this.utilPopupService.mostrarMensaje(
              'No se puede eliminar el cliente porque tiene registros asociados. <br>Elimine las sedes primero antes de continuar',
              'error',
              'Error al eliminar',
              false
            );
          } else if (error === '404') {
            this.utilPopupService.mostrarMensaje(
              'El cliente no existe.',
              'info',
              'Cliente no encontrado',
              false
            );
          } else {
            this.utilPopupService.mostrarMensaje(
              'Ocurrió un error al eliminar el cliente.',
              'error',
              'Error al eliminar',
              false
            );
          }
        },
      });
  }

}
