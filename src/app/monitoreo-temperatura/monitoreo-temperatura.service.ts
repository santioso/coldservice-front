import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import * as Papa from 'papaparse';
import { CSVFileService } from './csv-file.service';

export interface CSVDataRow {
  Fecha: string;
  Hora: string;
  Planta: string;
  [key: string]: string; // Para campos dinámicos como "Gabinete (°C)", "Ambiente (°C)", etc.
}

export interface PlantaData {
  nombre: string;
  datos: CSVDataRow[];
}

export interface DataSeries {
  nombre: string;
  unidad: string;
  valores: number[];
  tiempos: Date[];
}

export interface TemperatureData {
  tiempos: Date[];
  temperaturas: number[];
  // Nuevos campos para múltiples series de datos
  series: DataSeries[];
  plantas: string[];
  tiposDatos: string[];
}

export interface CSVFileInfo {
  plantas: string[];
  tiposDatos: string[];
  totalRegistros: number;
}

@Injectable({
  providedIn: 'root',
})
export class MonitoreoTemperaturaService {
  private csvData: CSVDataRow[] = [];

  private readonly CHECKLIST_ITEMS: string[] = [
    'Estado de rodachinas',
    'Cable extensión',
    'Imágenes',
    'Pintura',
    'Tapas',
    'Conexión del control',
    'Ajuste de control, motor, compresor',
    'Tapa compresor',
    'Uso de termoencogible',
    'Partes metálicas sin óxido',
  ];

  constructor(public csvFileService: CSVFileService) {}

  getChecklistItems(): string[] {
    return this.CHECKLIST_ITEMS;
  }

  // Obtener información del archivo CSV
  getCSVFileInfo(): Observable<CSVFileInfo> {
    return this.loadCSVData().pipe(
      map((data) => {
        const plantas = [...new Set(data.map((row) => row.Planta))];
        const tiposDatos = Object.keys(data[0] || {}).filter(
          (key) => key !== 'Fecha' && key !== 'Hora' && key !== 'Planta'
        );

        return {
          plantas,
          tiposDatos,
          totalRegistros: data.length,
        };
      })
    );
  }

  // Obtener plantas disponibles
  getPlantas(): Observable<string[]> {
    return this.getCSVFileInfo().pipe(map((info) => info.plantas));
  }

  // Obtener tipos de datos disponibles
  getTiposDatos(): Observable<string[]> {
    return this.getCSVFileInfo().pipe(map((info) => info.tiposDatos));
  }

  // Cargar datos CSV desde archivo local
  private loadCSVData(): Observable<CSVDataRow[]> {
    if (this.csvData.length > 0) {
      return of(this.csvData);
    }

    return this.csvFileService.readCSVFile().pipe(
      map((data) => {
        this.csvData = data;
        return data;
      }),
      catchError((error) => {
        console.error('Error al cargar archivo CSV:', error);
        return throwError(() => error);
      })
    );
  }

  // Obtener datos para una planta específica
  obtenerDatos(planta: string): Observable<TemperatureData> {
    console.log('🔍 Obteniendo datos para planta:', planta);

    return this.loadCSVData().pipe(
      map((data) => {
        console.log('📊 Datos cargados, total registros:', data.length);
        console.log('📋 Primer registro:', data[0]);

        const plantaData = data.filter((row) => row.Planta === planta);
        console.log(
          '🌱 Datos filtrados para planta',
          planta + ':',
          plantaData.length,
          'registros'
        );

        if (plantaData.length === 0) {
          console.error('❌ No se encontraron datos para la planta:', planta);
          throw new Error(`No se encontraron datos para la planta: ${planta}`);
        }

        // Obtener tipos de datos disponibles (excluyendo Fecha, Hora, Planta)
        const tiposDatos = Object.keys(plantaData[0]).filter(
          (key) => key !== 'Fecha' && key !== 'Hora' && key !== 'Planta'
        );
        console.log('📈 Tipos de datos encontrados:', tiposDatos);

        // Crear series de datos para cada tipo
        const series: DataSeries[] = tiposDatos.map((tipo) => {
          const valores: number[] = [];
          const tiempos: Date[] = [];

          plantaData.forEach((row) => {
            const valor = parseFloat(row[tipo]);
            if (!isNaN(valor)) {
              valores.push(valor);
              const fechaHora = `${row.Fecha} ${row.Hora}`;
              tiempos.push(new Date(fechaHora));
            }
          });

          // Extraer unidad del nombre del campo (ej: "Gabinete (°C)" -> "°C")
          // Manejar tanto el símbolo correcto ° como el carácter de reemplazo
          let unidad = tipo.match(/\(([^)]+)\)/)?.[1] || '';

          // Si la unidad contiene el carácter de reemplazo, reemplazarlo con °
          if (unidad.includes('')) {
            unidad = unidad.replace(/\uFFFD/g, '°');
            console.log(
              `🔧 Unidad corregida: "${
                tipo.match(/\(([^)]+)\)/)?.[1]
              }" -> "${unidad}"`
            );
          }

          const nombre = tipo.replace(/\s*\([^)]*\)/, ''); // Remover unidad del nombre

          console.log(
            `📊 Serie ${nombre} (${unidad}): ${
              valores.length
            } valores, rango: ${Math.min(...valores)} - ${Math.max(...valores)}`
          );

          return {
            nombre,
            unidad,
            valores,
            tiempos,
          };
        });

        // Para compatibilidad con el código existente, usar la primera serie como "temperaturas"
        const primeraSerie = series[0];
        const tiempos = primeraSerie?.tiempos || [];
        const temperaturas = primeraSerie?.valores || [];

        console.log('✅ Datos procesados exitosamente:');
        console.log('  - Series de datos:', series.length);
        console.log('  - Tiempos:', tiempos.length);
        console.log('  - Temperaturas:', temperaturas.length);
        console.log('  - Primer tiempo:', tiempos[0]);
        console.log('  - Último tiempo:', tiempos[tiempos.length - 1]);

        return {
          tiempos,
          temperaturas,
          series,
          plantas: [planta],
          tiposDatos,
        };
      }),
      catchError((error) => {
        console.error('❌ Error al obtener datos:', error);
        return throwError(() => error);
      })
    );
  }

  // Obtener datos para múltiples plantas
  obtenerDatosMultiplesPlantas(plantas: string[]): Observable<TemperatureData> {
    return this.loadCSVData().pipe(
      map((data) => {
        const plantasData = data.filter((row) => plantas.includes(row.Planta));

        if (plantasData.length === 0) {
          throw new Error(
            `No se encontraron datos para las plantas: ${plantas.join(', ')}`
          );
        }

        const tiposDatos = Object.keys(plantasData[0]).filter(
          (key) => key !== 'Fecha' && key !== 'Hora' && key !== 'Planta'
        );

        const series: DataSeries[] = tiposDatos.map((tipo) => {
          const valores: number[] = [];
          const tiempos: Date[] = [];

          plantasData.forEach((row) => {
            const valor = parseFloat(row[tipo]);
            if (!isNaN(valor)) {
              valores.push(valor);
              const fechaHora = `${row.Fecha} ${row.Hora}`;
              tiempos.push(new Date(fechaHora));
            }
          });

          const unidad = tipo.match(/\(([^)]+)\)/)?.[1] || '';
          const nombre = tipo.replace(/\s*\([^)]*\)/, '');

          return {
            nombre,
            unidad,
            valores,
            tiempos,
          };
        });

        const primeraSerie = series[0];
        const tiempos = primeraSerie?.tiempos || [];
        const temperaturas = primeraSerie?.valores || [];

        return {
          tiempos,
          temperaturas,
          series,
          plantas,
          tiposDatos,
        };
      })
    );
  }

  // Método para recargar datos (útil para actualizaciones)
  recargarDatos(): Observable<void> {
    this.csvData = [];
    return this.loadCSVData().pipe(map(() => void 0));
  }

  // Método para obtener estadísticas básicas
  obtenerEstadisticas(planta: string): Observable<any> {
    return this.obtenerDatos(planta).pipe(
      map((data) => {
        const stats: any = {};

        data.series.forEach((serie) => {
          const valores = serie.valores;
          stats[serie.nombre] = {
            min: Math.min(...valores),
            max: Math.max(...valores),
            promedio: valores.reduce((a, b) => a + b, 0) / valores.length,
            unidad: serie.unidad,
          };
        });

        return stats;
      })
    );
  }

  // Método para borrar datos de una planta específica del CSV
  borrarDatosPlanta(planta: string): Observable<void> {
    return this.loadCSVData().pipe(
      map((data) => {
        // Filtrar los datos excluyendo la planta especificada
        const datosFiltrados = data.filter((row) => row.Planta !== planta);

        // Actualizar el cache interno
        this.csvData = datosFiltrados;

        return datosFiltrados;
      }),
      // Escribir el archivo CSV actualizado
      switchMap((datosFiltrados: CSVDataRow[]) =>
        this.csvFileService.writeCSVFile(datosFiltrados)
      ),
      catchError((error) => {
        console.error('Error al borrar datos de la planta:', error);
        return throwError(() => error);
      })
    );
  }

  // Método para formatear el nombre de la planta (P1 -> Planta 1)
  formatearNombrePlanta(planta: string): string {
    const match = planta.match(/^P(\d+)$/);
    if (match) {
      return `Planta ${match[1]}`;
    }
    return planta; // Si no coincide el patrón, devolver el nombre original
  }

  // Método para obtener plantas con nombres formateados
  getPlantasFormateadas(): Observable<{ codigo: string; nombre: string }[]> {
    return this.getPlantas().pipe(
      map((plantas) =>
        plantas.map((planta) => ({
          codigo: planta,
          nombre: this.formatearNombrePlanta(planta),
        }))
      )
    );
  }
}
