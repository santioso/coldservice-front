import {Injectable} from '@angular/core';
import {EmailNotificationInterface} from "@shared/interfaces/email-notification.interface";
import {Observable} from "rxjs";
import {Api} from "@core/models/Api.model";
import {HttpClient} from "@angular/common/http";
import {WhatsappNotificationInterface} from "@shared/interfaces/whatsapp-notification.interface";

@Injectable({
    providedIn: 'root'
})
export class NotificationsService {

    constructor(private _http: HttpClient) {
    }

/**
 * Sends an email notification to the specified recipient.
 *
 * @param afiliacion_entidad_id - The ID of the affiliation entity.
 * @param email - The email notification object containing recipient's email, subject, and message.
 * @param defaultMessage - A flag indicating whether to use the default message (true) or not (false). Default is true.
 *
 * @returns An Observable that emits the response from the server.
 */
    sendEmail(afiliacion_entidad_id: number, email: EmailNotificationInterface, defaultMessage: boolean = true): Observable<any> {
        console.log('afiliacion_entidad_id', afiliacion_entidad_id)
        console.log('notificacion', email.correo, email.asunto, email.mensaje, defaultMessage)

        return this._http.post<any>(
            `${Api.urlAfiliacion}/firma/notificacion/`,
            {
                "afiliacion_entidad_id": afiliacion_entidad_id,
                "tipo_not_id": 1,
                "notificacion": {
                    "correo": email.correo,
                    "asunto": email.asunto,
                    "mensaje": email.mensaje,
                    "por_defecto": defaultMessage
                }
            }
        );
    }

    /**
 * Sends a WhatsApp notification to the specified recipient.
 *
 * @param afiliacion_entidad_id - The ID of the affiliation entity.
 * @param wpp - The WhatsApp notification object containing recipient's phone number and message.
 *
 * @returns An Observable that emits the response from the server.
 * The response will contain the status of the notification sent.
 */
    sendWhatsapp(afiliacion_entidad_id: number, wpp: WhatsappNotificationInterface): Observable<any> {
        return this._http.post<any>(
            `${Api.urlAfiliacion}/firma/notificacion/`,
            {
                "afiliacion_entidad_id": afiliacion_entidad_id,
                "tipo_not_id": 2,
                "notificacion": {
                    "celular": `${wpp.celular}`,
                    "mensaje": wpp.mensaje,
                    "por_defecto": wpp.mensaje === null
                }
            }
        );
    }
}
