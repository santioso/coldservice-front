import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PlantaData {
  id: string;
  api_key: string;
}

export interface ThingSpeakResponse {
  channel: any;
  feeds: {
    created_at: string;
    field1: string;
    [key: string]: any;
  }[];
}

export interface TemperatureData {
  tiempos: Date[];
  temperaturas: number[];
}

@Injectable({
  providedIn: 'root'
})
export class MonitoreoTemperaturaService {
  private readonly CANALES: { [key: string]: PlantaData } = {
    "Planta 1": { id: "1089252", api_key: "2HVQJJHKSK8FN3B6" },
    "Planta 2": { id: "1757278", api_key: "GR0WZFVNFEUXQRTV" },
    "Planta 3": { id: "1759152", api_key: "H7PJMUDQDPPH72NA" },
    "Planta 4": { id: "1759185", api_key: "I6X6TIDPG4K9IFKX" },
    "Planta 5": { id: "1768951", api_key: "HPUV8LT7LLY91ABJ" },
    "Planta 6": { id: "2186649", api_key: "MXE6Q0U8C6721Y8W" },
  };

  private readonly CHECKLIST_ITEMS: string[] = [
    "Estado de rodachinas",
    "Cable extensión",
    "Imágenes",
    "Pintura",
    "Tapas",
    "Conexión del control",
    "Ajuste de control, motor, compresor",
    "Tapa compresor",
    "Uso de termoencogible",
    "Partes metálicas sin óxido"
  ];

  constructor(private http: HttpClient) { }

  getCanales(): { [key: string]: PlantaData } {
    return this.CANALES;
  }

  getChecklistItems(): string[] {
    return this.CHECKLIST_ITEMS;
  }

  obtenerDatos(planta: string): Observable<TemperatureData> {
    const plantaData = this.CANALES[planta];
    if (!plantaData) {
      throw new Error(`No se encontró la planta: ${planta}`);
    }

    const url = `https://api.thingspeak.com/channels/${plantaData.id}/feeds.json?api_key=${plantaData.api_key}&results=1000`;
    return this.http.get<ThingSpeakResponse>(url).pipe(
      map(data => {
        const tiempos: Date[] = [];
        const temperaturas: number[] = [];
        console.log(data);
        data.feeds.forEach(feed => {
          if (feed.field1) {
            tiempos.push(new Date(feed.created_at));
            temperaturas.push(parseFloat(feed.field1));
          }
        });
        
        return { tiempos, temperaturas };
      })
    );
  }

  deleteData(planta: string): Observable<any> {
    const plantaData = this.CANALES[planta];
    if (!plantaData) {
      throw new Error(`No se encontró la planta: ${planta}`);
    }
    // La API key debe ir como parámetro de consulta en la URL, no en el cuerpo
    const url = `https://api.thingspeak.com/channels/${plantaData.id}/feeds.json?api_key=${plantaData.api_key}`;
    return this.http.delete(url);
  }
}