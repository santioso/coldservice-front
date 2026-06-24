import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  ApiResponse,
  ApiResponseWithCount,
  ImportResult,
  InformeEntity,
  InformeValorEntity,
  PlantaFechaRow,
} from './models';
import { environment } from 'environments/environment';

interface CreateInformeResponse extends ApiResponse<InformeEntity> {
  valores?: InformeValorEntity[]; // duplicado por conveniencia desde backend
}

@Injectable({ providedIn: 'root' })
export class InformesService {
  private base = `${environment.apiUrl}/informes`;

  constructor(private http: HttpClient) {}

  // GET /informes
  listAll(): Observable<ApiResponse<InformeEntity[]>> {
    return this.http.get<ApiResponse<InformeEntity[]>>(this.base);
  }

  // GET /informes/planta-fecha
  listPlantaFecha(): Observable<ApiResponseWithCount<PlantaFechaRow[]>> {
    return this.http.get<ApiResponseWithCount<PlantaFechaRow[]>>(
      `${this.base}/planta-fecha`
    );
  }

  // GET /informes/rango?fecha_inicio&fecha_fin
  listByRango(
    fecha_inicio: string,
    fecha_fin: string
  ): Observable<ApiResponse<InformeEntity[]>> {
    const params = new HttpParams()
      .set('fecha_inicio', fecha_inicio)
      .set('fecha_fin', fecha_fin);
    return this.http.get<ApiResponse<InformeEntity[]>>(`${this.base}/rango`, {
      params,
    });
  }

  // GET /informes/fecha-planta?fecha&planta
  getByFechaPlanta(
    fecha: string,
    planta: string
  ): Observable<ApiResponse<InformeEntity[]>> {
    const params = new HttpParams().set('fecha', fecha).set('planta', planta);
    return this.http.get<ApiResponse<InformeEntity[]>>(
      `${this.base}/fecha-planta`,
      { params }
    );
  }

  // Helper: retorna solo el primer informe (o null) del endpoint fecha-planta
  getUnoPorFechaPlanta(
    fecha: string,
    planta: string
  ): Observable<InformeEntity | null> {
    return this.getByFechaPlanta(fecha, planta).pipe(
      map((res) => (Array.isArray(res.data) && res.data.length ? res.data[0] : null))
    );
  }

  // POST /informes
  crear(payload: Omit<InformeEntity, 'id' | 'created_at' | 'updated_at'> & {
    valores?: InformeValorEntity[];
  }): Observable<CreateInformeResponse> {
    return this.http.post<CreateInformeResponse>(this.base, payload);
  }

  // POST /informes/import (multipart/form-data)
  importarCSV(file: File): Observable<ApiResponse<{ totalInformes: number }>> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ApiResponse<ImportResult>>(`${this.base}/import`, form) as unknown as Observable<
      ApiResponse<{ totalInformes: number }>
    >;
  }
}
