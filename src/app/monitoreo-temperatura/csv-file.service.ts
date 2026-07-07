import { Injectable } from '@angular/core';
import { Observable, of, throwError, BehaviorSubject } from 'rxjs';
import { CSVDataRow } from './monitoreo-temperatura.service';
import * as Papa from 'papaparse';

// Declarar la interfaz para las APIs de Electron
declare global {
  interface Window {
    electronAPI?: {
      readCSVFile: () => Promise<{
        success: boolean;
        data?: string;
        error?: string;
      }>;
      writeCSVFile: (
        csvContent: string
      ) => Promise<{ success: boolean; error?: string }>;
      checkCSVFile: () => Promise<{
        success: boolean;
        exists?: boolean;
        size?: number;
        lastModified?: Date;
        error?: string;
      }>;
      isElectron: () => boolean;
    };
  }
}

@Injectable({
  providedIn: 'root',
})
export class CSVFileService {
  private csvDataSubject = new BehaviorSubject<CSVDataRow[]>([]);
  public csvData$ = this.csvDataSubject.asObservable();
  // Manejador del archivo seleccionado mediante File System Access API
  private fileHandle: any | null = null;

  constructor() {
    // Constructor vacío - no se puede eliminar debido a la inyección de dependencias
  }

  /**
   * Verifica si estamos ejecutando en Electron
   */
  private isElectron(): boolean {
    return !!(window.electronAPI && window.electronAPI.isElectron());
  }

  /**
   * Verifica soporte del File System Access API (Chromium-based browsers)
   */
  private isFileSystemAPISupported(): boolean {
    return typeof (window as any).showOpenFilePicker === 'function';
  }

  /**
   * Lee el archivo CSV desde un archivo seleccionado
   */
  readCSVFile(): Observable<CSVDataRow[]> {
    return new Observable((observer) => {
      const currentData = this.csvDataSubject.value;
      if (currentData.length > 0) {
        observer.next(currentData);
        observer.complete();
        return;
      }

      // Fallback: intentar cargar desde localStorage (navegador)
      try {
        const raw = localStorage.getItem('csvData');
        if (raw) {
          const parsed = JSON.parse(raw) as CSVDataRow[];
          this.csvDataSubject.next(parsed);
          observer.next(parsed);
          observer.complete();
          return;
        }
      } catch (_) {
        // ignorar errores de parseo
      }

      observer.error(new Error('No hay datos CSV cargados. Use selectCSVFile() para cargar un archivo.'));
    });
  }

  /**
   * Selecciona un archivo usando File System Access API y conserva el handle para escritura posterior
   */
  selectCSVFileWithPicker(): Observable<CSVDataRow[]> {
    return new Observable((observer) => {
      if (!this.isFileSystemAPISupported()) {
        observer.error(new Error('El navegador no soporta el File System Access API.'));
        return;
      }
      (async () => {
        try {
          const [handle] = await (window as any).showOpenFilePicker({
            multiple: false,
            types: [
              {
                description: 'Archivos CSV',
                accept: { 'text/csv': ['.csv'] },
              },
            ],
          });
          this.fileHandle = handle;
          const file = await handle.getFile();
          const text = await file.text();
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.errors.length > 0) {
                observer.error(new Error('Error parsing CSV: ' + results.errors[0].message));
              } else {
                const data = results.data as CSVDataRow[];
                this.csvDataSubject.next(data);
                try {
                  localStorage.setItem('csvData', JSON.stringify(data));
                } catch {
                  // Ignore storage failures; parsed CSV data is still returned.
                }
                observer.next(data);
                observer.complete();
              }
            },
            error: (error: any) => observer.error(error),
          });
        } catch (err: any) {
          observer.error(err);
        }
      })();
    });
  }

  /**
   * Selecciona y lee un archivo CSV
   */
  selectCSVFile(): Observable<CSVDataRow[]> {
    return new Observable((observer) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      input.onchange = (event: any) => {
        const file = event.target.files[0];
        if (file) {
          this.readFileContent(file)
            .then((data) => {
              this.csvDataSubject.next(data);
              // Guardar en localStorage para futuras cargas automáticas
              localStorage.setItem('csvData', JSON.stringify(data));
              observer.next(data);
              observer.complete();
            })
            .catch((error) => {
              observer.error(error);
            });
        } else {
          observer.error(new Error('No se seleccionó ningún archivo'));
        }
      };
      input.click();
    });
  }

  /**
   * Carga automáticamente el archivo CSV desde la ruta específica
   */
  loadDefaultCSVFile(): Observable<CSVDataRow[]> {
    return new Observable((observer) => {
      console.log('🔍 Iniciando carga automática de CSV...');

      // Verificar si estamos en Electron
      if (!this.isElectron()) {
        console.error(
          '❌ No estamos en Electron, no se puede acceder al sistema de archivos'
        );
        observer.error(
          new Error(
            'Esta funcionalidad requiere Electron para acceder al sistema de archivos.'
          )
        );
        return;
      }

      console.log('✅ Electron detectado, procediendo a leer archivo...');

      // Usar Electron para leer el archivo CSV
      window
        .electronAPI!.readCSVFile()
        .then((result) => {
          console.log('📄 Resultado de lectura de archivo:', result);

          if (result.success && result.data) {
            console.log(
              '✅ Archivo leído exitosamente, contenido:',
              result.data.substring(0, 200) + '...'
            );

            // Parsear el contenido CSV
            return new Promise<CSVDataRow[]>((resolve, reject) => {
              Papa.parse(result.data!, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                  console.log('📊 Resultados del parsing CSV:', results);

                  if (results.errors.length > 0) {
                    console.error('❌ Errores en parsing CSV:', results.errors);
                    reject(
                      new Error(
                        'Error parsing CSV: ' + results.errors[0].message
                      )
                    );
                  } else {
                    console.log(
                      '✅ CSV parseado exitosamente, registros:',
                      results.data.length
                    );
                    console.log('📋 Primer registro:', results.data[0]);
                    resolve(results.data as CSVDataRow[]);
                  }
                },
                error: (error: any) => {
                  console.error('❌ Error en Papa.parse:', error);
                  reject(error);
                },
              });
            });
          } else {
            console.error('❌ Error al leer archivo:', result.error);
            throw new Error(result.error || 'Error al leer el archivo CSV');
          }
        })
        .then((data) => {
          console.log(
            '💾 Guardando datos en memoria, total registros:',
            data.length
          );
          this.csvDataSubject.next(data);
          // Guardar en localStorage para futuras cargas
          localStorage.setItem('csvData', JSON.stringify(data));
          observer.next(data);
          observer.complete();
        })
        .catch((error) => {
          console.error('❌ Error al cargar archivo CSV:', error);
          observer.error(
            new Error(`Error al cargar archivo CSV: ${error.message}`)
          );
        });
    });
  }

  /**
   * Lee el contenido de un archivo CSV
   */
  private readFileContent(file: File): Promise<CSVDataRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        try {
          const csvContent = e.target.result;

          Papa.parse(csvContent, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.errors.length > 0) {
                reject(
                  new Error('Error parsing CSV: ' + results.errors[0].message)
                );
              } else {
                resolve(results.data as CSVDataRow[]);
              }
            },
            error: (error: any) => {
              reject(error);
            },
          });
        } catch (error) {
          reject(new Error(`Error al procesar archivo CSV: ${error}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Escribe datos CSV al archivo usando Electron
   */
  writeCSVFile(data: CSVDataRow[]): Observable<void> {
    return new Observable((observer) => {
      try {
        // Verificar si estamos en Electron
        if (!this.isElectron()) {
          observer.error(
            new Error(
              'Esta funcionalidad requiere Electron para acceder al sistema de archivos.'
            )
          );
          return;
        }

        // Convertir datos a formato CSV
        const headers = Object.keys(data[0] || {});
        const csvContent = [
          headers.join(','),
          ...data.map((row) => headers.map((header) => row[header]).join(',')),
        ].join('\n');

        // Usar Electron para escribir el archivo
        window
          .electronAPI!.writeCSVFile(csvContent)
          .then((result) => {
            if (result.success) {
              // Actualizar los datos en memoria
              this.csvDataSubject.next(data);
              observer.next();
              observer.complete();
            } else {
              throw new Error(
                result.error || 'Error al escribir el archivo CSV'
              );
            }
          })
          .catch((error) => {
            observer.error(
              new Error(`Error al escribir archivo CSV: ${error.message}`)
            );
          });
      } catch (error) {
        observer.error(new Error(`Error al procesar datos CSV: ${error}`));
      }
    });
  }

  /**
   * Limpia los datos cargados
   */
  clearData(): void {
    this.csvDataSubject.next([]);
  }

  /**
   * Establece los datos CSV en memoria y los persiste en localStorage (sin Electron)
   */
  setData(data: CSVDataRow[]): void {
    this.csvDataSubject.next(data);
    try {
      localStorage.setItem('csvData', JSON.stringify(data));
    } catch (_) {
      // ignorar errores de almacenamiento
    }
  }

  /**
   * Indica si tenemos un handle de archivo disponible para escribir
   */
  hasWritableHandle(): boolean {
    return !!this.fileHandle;
  }

  /**
   * Intenta escribir los datos actuales al archivo seleccionado (File System Access API)
   */
  async writeBackToSelectedFile(data: CSVDataRow[]): Promise<void> {
    if (!this.fileHandle) throw new Error('No hay un archivo seleccionado para escritura.');
    // Solicitar permiso de escritura si es necesario
    if (this.fileHandle.requestPermission) {
      const perm = await this.fileHandle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') throw new Error('Permiso de escritura no concedido.');
    }
    const writable = await this.fileHandle.createWritable();
    try {
      const csv = this.toCSV(data);
      await writable.write(csv);
    } finally {
      await writable.close();
    }
  }

  /**
   * Recarga datos desde el handle actual (si existe) y actualiza memoria/localStorage
   */
  reloadFromHandle(): Observable<CSVDataRow[]> {
    return new Observable((observer) => {
      (async () => {
        try {
          if (!this.fileHandle) throw new Error('No hay archivo para recargar.');
          const file = await this.fileHandle.getFile();
          const text = await file.text();
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.errors.length > 0) {
                observer.error(new Error('Error parsing CSV: ' + results.errors[0].message));
              } else {
                const data = results.data as CSVDataRow[];
                this.setData(data);
                observer.next(data);
                observer.complete();
              }
            },
            error: (error: any) => observer.error(error),
          });
        } catch (err: any) {
          observer.error(err);
        }
      })();
    });
  }

  /**
   * Convierte datos a CSV (encabezados deducidos de la primera fila)
   */
  toCSV(data: CSVDataRow[]): string {
    const rows = data || [];
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const escape = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      // Envolver en comillas si contiene coma, comillas o salto de línea
      if (/[",\n]/.test(str)) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };
    const lines = [headers.join(',')].concat(
      rows.map(row => headers.map(h => escape((row as any)[h])).join(','))
    );
    return lines.join('\n');
  }

  /**
   * Dispara descarga del CSV actualizado en navegador
   */
  downloadCSV(filename: string, data: CSVDataRow[]): void {
    const csv = this.toCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Obtiene información del archivo CSV
   */
  getFileInfo(): Observable<{ path: string; exists: boolean; size?: number }> {
    if (this.isElectron()) {
      return new Observable((observer) => {
        window
          .electronAPI!.checkCSVFile()
          .then((result) => {
            if (result.success) {
              observer.next({
                path: 'C:\\Users\\SantiagoO\\Downloads\\datos_lora.csv',
                exists: result.exists || false,
                size: result.size,
              });
              observer.complete();
            } else {
              observer.error(
                new Error(result.error || 'Error al verificar archivo')
              );
            }
          })
          .catch((error) => {
            observer.error(error);
          });
      });
    } else {
      const currentData = this.csvDataSubject.value;
      return of({
        path: 'Archivo seleccionado por usuario',
        exists: currentData.length > 0,
        size: currentData.length,
      });
    }
  }

  /**
   * Verifica si el archivo existe
   */
  fileExists(): Observable<boolean> {
    const currentData = this.csvDataSubject.value;
    return of(currentData.length > 0);
  }
}
