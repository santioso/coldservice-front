# Implementación de Lectura de Archivo CSV con Electron

## Resumen de Cambios Realizados

Se ha modificado el módulo de monitoreo de temperatura para leer datos desde un archivo CSV local en lugar de ThingSpeak. Los cambios principales incluyen:

### 1. Nuevas Interfaces
- `CSVDataRow`: Estructura de datos para filas del CSV
- `DataSeries`: Serie de datos con nombre, unidad, valores y tiempos
- `CSVFileInfo`: Información del archivo CSV
- `TemperatureData`: Extendida para soportar múltiples series de datos

### 2. Servicios Modificados
- `MonitoreoTemperaturaService`: Actualizado para leer desde CSV
- `CSVFileService`: Nuevo servicio para manejo de archivos

### 3. Componente Actualizado
- Carga plantas dinámicamente desde el CSV
- Muestra tipos de datos disponibles
- Botón "Recargar datos CSV" en lugar de actualización automática

## Implementación con Electron

### Paso 1: Instalar Electron
```bash
npm install electron --save-dev
```

### Paso 2: Configurar Electron
Crear archivo `electron/main.js`:
```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadURL('http://localhost:4200');
}

app.whenReady().then(createWindow);

// IPC handlers para lectura de archivos
ipcMain.handle('read-csv-file', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return data;
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
});
```

### Paso 3: Crear Preload Script
Crear archivo `electron/preload.js`:
```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readCSVFile: (filePath) => ipcRenderer.invoke('read-csv-file', filePath),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath)
});
```

### Paso 4: Actualizar CSVFileService
Modificar `csv-file.service.ts`:
```typescript
private readFileWithElectron(): Observable<CSVDataRow[]> {
  return new Observable(observer => {
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI) {
        electronAPI.readCSVFile(this.CSV_FILE_PATH)
          .then((csvContent: string) => {
            // Procesar CSV con Papa Parse
            Papa.parse(csvContent, {
              header: true,
              skipEmptyLines: true,
              complete: (results) => {
                if (results.errors.length > 0) {
                  observer.error(new Error('Error parsing CSV: ' + results.errors[0].message));
                } else {
                  observer.next(results.data as CSVDataRow[]);
                  observer.complete();
                }
              },
              error: (error) => {
                observer.error(error);
              }
            });
          })
          .catch((error: any) => {
            observer.error(new Error(`Error al leer archivo CSV: ${error}`));
          });
      } else {
        // Fallback a datos simulados
        this.readSimulatedData().subscribe(observer);
      }
    } catch (error) {
      observer.error(new Error(`Error al leer archivo CSV: ${error}`));
    }
  });
}
```

### Paso 5: Configurar package.json
Agregar scripts en `package.json`:
```json
{
  "scripts": {
    "electron": "electron electron/main.js",
    "electron-dev": "concurrently \"npm start\" \"wait-on http://localhost:4200 && electron electron/main.js\""
  }
}
```

## Uso

### En Desarrollo (Web)
```bash
npm start
```
Los datos se simulan desde el servicio.

### En Producción (Electron)
```bash
npm run electron-dev
```
Los datos se leen desde el archivo CSV real.

## Estructura del CSV

El archivo debe tener el formato:
```csv
Fecha,Hora,Planta,Gabinete (°C),Ambiente (°C),Corriente (A)
2025-08-06,18:47:47,P1,21.8,23.5,2.02
2025-08-06,18:48:49,P1,21.9,23.5,2.01
...
```

## Características

- **Múltiples Plantas**: Soporta hasta 8 plantas simultáneas (P1-P8)
- **Múltiples Tipos de Datos**: Detecta automáticamente los tipos de datos disponibles
- **Unidades Dinámicas**: Extrae unidades de los nombres de columnas
- **Gráficas Múltiples**: Puede mostrar múltiples series de datos
- **Actualización Manual**: Botón para recargar datos desde el archivo

## Notas Importantes

1. **Ruta del Archivo**: Actualmente configurado para `C:\Users\SantiagoO\Downloads\datos_lora.csv`
2. **Formato de Fecha**: Debe ser YYYY-MM-DD
3. **Formato de Hora**: Debe ser HH:MM:SS
4. **Plantas**: Deben tener formato P1, P2, P3, etc.
5. **Tipos de Datos**: Deben incluir unidades en paréntesis, ej: "Gabinete (°C)"

## Próximos Pasos

1. Implementar selección de archivo CSV desde la interfaz
2. Agregar validación de formato de archivo
3. Implementar cache de datos para mejor rendimiento
4. Agregar exportación de datos procesados
5. Implementar filtros por fecha/hora
