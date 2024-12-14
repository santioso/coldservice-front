import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertOptions } from "sweetalert2";

@Injectable({
    providedIn: 'root'
})
export class UtilPopupService {

    /**
     * Getter that returns a configured Swal instance.
     */
    get swal(): typeof Swal {
        return Swal.mixin({
            allowOutsideClick: false,
            allowEscapeKey: false,
            cancelButtonText: "No",
            confirmButtonText: "Si",
            showCancelButton: true,
            showCloseButton: true,
            customClass: {
                popup: 'bg-primary text-white min-w-1/3',
                title: 'mat-headline-3 font-normal text-lime',
                actions: "flex flex-col flex-auto w-full px-8",
                confirmButton: 'w-full bg-white text-primary',
                cancelButton: 'w-full bg-white text-primary'
            }
        });
    }

    /**
     * Method to display a message on the screen using sweetalert2.
     * @param mensaje Message text, can be HTML.
     * @param tipo Message type 'warning' | 'error' | 'success' | 'info' | 'question'.
     * @param titulo Message title.
     * @param mostrarConfirmacion Indicates whether to display the confirmation button.
     * @returns typeof @Swal
     */
    mostrarMensaje(mensaje: string, tipo: SweetAlertIcon, titulo = '', mostrarConfirmacion = true): Promise<any> {
        const options: SweetAlertOptions = {
            title: titulo,
            html: mensaje,
            icon: tipo,
            showCancelButton: mostrarConfirmacion,
            showCloseButton: !mostrarConfirmacion,
            confirmButtonText: mostrarConfirmacion ? 'Si' : 'Continuar',
            cancelButtonText: 'No'
        };

        return this.swal.fire(options);
    }
}
