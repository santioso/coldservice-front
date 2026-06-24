# 🏗️ Arquitectura Técnica - Módulo de Monitoreo de Temperatura

## 📑 Índice
1. [Visión General](#visión-general)
2. [Arquitectura de Componentes](#arquitectura-de-componentes)
3. [Flujo de Datos](#flujo-de-datos)
4. [Servicios y APIs](#servicios-y-apis)
5. [Modelos de Datos](#modelos-de-datos)
6. [Integración con Electron](#integración-con-electron)
7. [Dependencias Externas](#dependencias-externas)

---

## 🎯 Visión General

El módulo de monitoreo de temperatura es una aplicación Angular que permite la visualización y análisis de datos de temperatura provenientes de archivos CSV. Está diseñado para funcionar tanto en navegador web como en aplicación de escritorio Electron.

### Tecnologías Principales

- **Framework**: Angular 15+
- **Gráficas**: Chart.js
- **Generación PDF**: jsPDF + html2canvas
- **Parseo CSV**: PapaParse
- **UI Components**: Angular Material
- **Formularios**: Reactive Forms

---

## 🏛️ Arquitectura de Componentes

### Estructura de Directorios

```
src/app/
├── monitoreo-temperatura/
│   ├── monitoreo-temperatura.component.ts       # Componente principal
│   ├── monitoreo-temperatura.component.html     # Template
│   ├── monitoreo-temperatura.component.scss     # Estilos
│   ├── monitoreo-temperatura.service.ts         # Servicio de datos
│   └── csv-file.service.ts                      # Servicio de archivos CSV
│
├── monitoreo-temperatura-history/
│   ├── monitoreo-temperatura-history.component.ts
│   ├── monitoreo-temperatura-history.component.html
│   ├── monitoreo-temperatura-history.service.ts
│   └── ...
│
└── assets/
    └── images/
        └── base64/
            └── logo.const.ts                    # Logo en base64
```

### Componentes Principales

#### 1. MonitoreoTemperaturaComponent

**Responsabilidades:**
- Gestión del ciclo de vida del componente
- Renderizado de la interfaz de usuario
- Coordinación entre servicios
- Generación de gráficas
- Creación de informes PDF

**Propiedades clave:**
```typescript
@ViewChild('graficaCanvas') graficaCanvas: ElementRef<HTMLCanvasElement>
@ViewChild('reporteContent') reporteContent: ElementRef<HTMLDivElement>

form: FormGroup                          // Formulario reactivo
plantas: string[]                        // Lista de plantas disponibles
datosTemperatura: TemperatureData        // Datos de temperatura cargados
temperaturaChart: Chart                  // Instancia de Chart.js
mostrarGrafica: boolean                  // Control de visibilidad
```

**Métodos principales:**
```typescript
ngOnInit()                               // Inicialización
cargarArchivoCSV()                       // Carga de archivo CSV
onPlantaChange()                         // Cambio de planta seleccionada
actualizarGrafica()                      // Actualización de gráfica
generarPDF()                             // Generación de informe PDF
obtenerUltimaTemperatura()               // Cálculo de estadísticas
obtenerTemperaturaMinima()
obtenerTemperaturaMaxima()
obtenerTiempoTranscurrido()
```

#### 2. MonitoreoTemperaturaService

**Responsabilidades:**
- Gestión de datos de temperatura
- Procesamiento de datos CSV
- Cálculo de estadísticas
- Comunicación con API backend (para guardar informes)

**Métodos principales:**
```typescript
getCSVFileInfo(): Observable<CSVFileInfo>
getPlantas(): Observable<string[]>
obtenerDatos(planta: string): Observable<TemperatureData>
obtenerEstadisticas(planta: string): Observable<any>
crearInforme(informe: Partial<InformeItem>): Observable<InformeItem>
recargarDatos(): Observable<void>
```

#### 3. CSVFileService

**Responsabilidades:**
- Lectura de archivos CSV
- Escritura de archivos CSV (en Electron)
- Gestión de caché de datos
- Integración con File System Access API
- Integración con Electron IPC

**Métodos principales:**
```typescript
readCSVFile(): Observable<CSVDataRow[]>
selectCSVFile(): Observable<CSVDataRow[]>
writeCSVFile(data: CSVDataRow[]): Observable<void>
loadDefaultCSVFile(): Observable<CSVDataRow[]>
reloadFromHandle(): Observable<CSVDataRow[]>
```

---

## 🔄 Flujo de Datos

### 1. Carga Inicial de Datos

```
Usuario hace clic en "Cargar Archivo CSV"
    ↓
CSVFileService.selectCSVFile()
    ↓
Input file dialog se abre
    ↓
Usuario selecciona archivo
    ↓
FileReader lee el contenido
    ↓
PapaParse parsea el CSV
    ↓
Datos se almacenan en BehaviorSubject
    ↓
Datos se guardan en localStorage
    ↓
Componente recibe notificación
    ↓
Se extraen plantas disponibles
    ↓
Se actualiza UI
```

### 2. Selección de Planta y Visualización

```
Usuario selecciona planta del dropdown
    ↓
onPlantaChange() se ejecuta
    ↓
MonitoreoTemperaturaService.obtenerDatos(planta)
    ↓
Servicio filtra datos por planta
    ↓
Se crean series de datos (DataSeries[])
    ↓
Se calculan estadísticas
    ↓
Componente recibe TemperatureData
    ↓
actualizarGrafica() se ejecuta
    ↓
Chart.js renderiza la gráfica
    ↓
Se muestran estadísticas en UI
```

### 3. Generación de PDF

```
Usuario completa formulario
    ↓
Usuario hace clic en "Descargar informe PDF"
    ↓
Validación de formulario
    ↓
html2canvas captura el contenido HTML
    ↓
Se crea instancia de jsPDF
    ↓
Se agrega logo en base64
    ↓
Se agrega información del formulario
    ↓
Se agrega imagen de la gráfica
    ↓
Se agrega lista de chequeo
    ↓
PDF se descarga automáticamente
```

---

## 🔌 Servicios y APIs

### MonitoreoTemperaturaService

#### Métodos de Lectura

**`getCSVFileInfo(): Observable<CSVFileInfo>`**
- Retorna información general del CSV cargado
- Incluye: plantas disponibles, tipos de datos, total de registros

**`getPlantas(): Observable<string[]>`**
- Retorna lista de códigos de plantas (P1, P2, P3, etc.)

**`getPlantasFormateadas(): Observable<{codigo: string, nombre: string}[]>`**
- Retorna plantas con nombres formateados (P1 → "Planta 1")

**`obtenerDatos(planta: string): Observable<TemperatureData>`**
- Filtra y retorna datos de una planta específica
- Procesa múltiples series de datos
- Calcula serie derivada "Delta de T" (Ambiente - Gabinete)

**`obtenerEstadisticas(planta: string): Observable<any>`**
- Calcula min, max, promedio para cada serie de datos

#### Métodos de Escritura

**`crearInforme(informe: Partial<InformeItem>): Observable<InformeItem>`**
- Envía informe al backend para almacenamiento
- Endpoint: `POST /api/informes`

**`borrarDatosPlanta(planta: string): Observable<void>`**
- Elimina datos de una planta del CSV
- Solo funciona en modo Electron con permisos de escritura

#### Métodos de Utilidad

**`recargarDatos(): Observable<void>`**
- Limpia caché y recarga datos desde archivo
- Útil cuando el archivo CSV se actualiza externamente

**`formatearNombrePlanta(planta: string): string`**
- Convierte códigos de planta a nombres legibles
- Ejemplo: "P1" → "Planta 1"

---

### CSVFileService

#### Detección de Entorno

**`isElectron(): boolean`**
- Detecta si la aplicación está corriendo en Electron
- Verifica existencia de `window.electronAPI`

**`isFileSystemAPISupported(): boolean`**
- Verifica soporte de File System Access API
- Disponible en navegadores basados en Chromium

#### Lectura de Archivos

**`readCSVFile(): Observable<CSVDataRow[]>`**
- Lee datos desde caché (BehaviorSubject)
- Fallback a localStorage si no hay datos en memoria
- Retorna error si no hay datos cargados

**`selectCSVFile(): Observable<CSVDataRow[]>`**
- Abre diálogo de selección de archivo
- Lee y parsea el archivo seleccionado
- Almacena datos en memoria y localStorage

**`loadDefaultCSVFile(): Observable<CSVDataRow[]>`**
- Solo funciona en Electron
- Lee archivo desde ruta predefinida
- Usa Electron IPC para acceso al sistema de archivos

#### Escritura de Archivos

**`writeCSVFile(data: CSVDataRow[]): Observable<void>`**
- Solo funciona en Electron
- Escribe datos al archivo CSV
- Usa Electron IPC para acceso al sistema de archivos

**`writeBackToSelectedFile(data: CSVDataRow[]): Promise<void>`**
- Usa File System Access API
- Requiere permisos de escritura del usuario
- Solo funciona en navegadores compatibles

#### Utilidades

**`toCSV(data: CSVDataRow[]): string`**
- Convierte array de objetos a formato CSV
- Maneja escape de caracteres especiales
- Genera encabezados automáticamente

**`downloadCSV(filename: string, data: CSVDataRow[]): void`**
- Descarga CSV como archivo
- Crea blob y trigger de descarga

---

## 📊 Modelos de Datos

### CSVDataRow

```typescript
interface CSVDataRow {
  Fecha: string;              // YYYY-MM-DD
  Hora: string;               // HH:MM:SS
  Planta: string;             // P1, P2, P3, etc.
  [key: string]: string;      // Campos dinámicos
}
```

**Ejemplo:**
```typescript
{
  Fecha: "2024-01-15",
  Hora: "14:30:00",
  Planta: "P1",
  "Gabinete (°C)": "5.2",
  "Ambiente (°C)": "22.5",
  "Corriente (A)": "3.4"
}
```

---

### DataSeries

```typescript
interface DataSeries {
  nombre: string;             // Nombre de la serie (sin unidad)
  unidad: string;             // Unidad de medida (°C, A, etc.)
  valores: number[];          // Array de valores numéricos
  tiempos: Date[];            // Array de timestamps
}
```

**Ejemplo:**
```typescript
{
  nombre: "Gabinete",
  unidad: "°C",
  valores: [5.2, 5.1, 5.3, 5.0],
  tiempos: [
    new Date("2024-01-15T14:30:00"),
    new Date("2024-01-15T14:31:00"),
    new Date("2024-01-15T14:32:00"),
    new Date("2024-01-15T14:33:00")
  ]
}
```

---

### TemperatureData

```typescript
interface TemperatureData {
  tiempos: Date[];            // Timestamps de todas las mediciones
  temperaturas: number[];     // Valores de temperatura (primera serie)
  series: DataSeries[];       // Todas las series de datos
  plantas: string[];          // Plantas incluidas en los datos
  tiposDatos: string[];       // Tipos de datos disponibles
}
```

---

### InformeItem

```typescript
interface InformeItem {
  id: number;
  planta: string;
  equipo: string | null;
  tecnico: string | null;
  cliente: string | null;
  ubicacion: string | null;
  tipo_gas: string | null;
  temperatura_limite: number | null;
  checklist: string | null;    // JSON string de array
  created_at: string;
  updated_at: string;
  valores: InformeValorItem[];
}
```

---

### InformeValorItem

```typescript
interface InformeValorItem {
  id?: number;
  fecha: string;              // YYYY-MM-DD
  hora?: string;              // HH:MM:SS
  gabinete: number;
  ambiente: number;
  diferencia_temperatura: number;
  corriente: number;
}
```

---

## 🖥️ Integración con Electron

### Arquitectura Electron

```
┌─────────────────────────────────────┐
│     Proceso Renderer (Angular)      │
│  ┌───────────────────────────────┐  │
│  │  MonitoreoTemperaturaComponent│  │
│  └──────────────┬────────────────┘  │
│                 │                    │
│  ┌──────────────▼────────────────┐  │
│  │     CSVFileService            │  │
│  └──────────────┬────────────────┘  │
│                 │                    │
│  ┌──────────────▼────────────────┐  │
│  │   window.electronAPI          │  │
│  └──────────────┬────────────────┘  │
└─────────────────┼────────────────────┘
                  │ IPC
┌─────────────────▼────────────────────┐
│      Proceso Main (Electron)         │
│  ┌───────────────────────────────┐  │
│  │   IPC Handlers                │  │
│  │   - readCSVFile               │  │
│  │   - writeCSVFile              │  │
│  │   - checkCSVFile              │  │
│  └──────────────┬────────────────┘  │
│                 │                    │
│  ┌──────────────▼────────────────┐  │
│  │   Node.js fs module           │  │
│  └──────────────┬────────────────┘  │
│                 │                    │
│  ┌──────────────▼────────────────┐  │
│  │   Sistema de Archivos         │  │
│  └───────────────────────────────┘  │
└──────────────────────────────────────┘
```

### APIs de Electron

#### window.electronAPI.readCSVFile()

```typescript
readCSVFile(): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}>
```

**Uso:**
```typescript
const result = await window.electronAPI.readCSVFile();
if (result.success) {
  const csvContent = result.data;
  // Procesar contenido
}
```

#### window.electronAPI.writeCSVFile()

```typescript
writeCSVFile(csvContent: string): Promise<{
  success: boolean;
  error?: string;
}>
```

**Uso:**
```typescript
const csvContent = this.toCSV(data);
const result = await window.electronAPI.writeCSVFile(csvContent);
if (result.success) {
  console.log('Archivo guardado');
}
```

#### window.electronAPI.checkCSVFile()

```typescript
checkCSVFile(): Promise<{
  success: boolean;
  exists?: boolean;
  size?: number;
  lastModified?: Date;
  error?: string;
}>
```

**Uso:**
```typescript
const result = await window.electronAPI.checkCSVFile();
if (result.exists) {
  console.log(`Archivo existe, tamaño: ${result.size} bytes`);
}
```

---

## 📦 Dependencias Externas

### Chart.js

**Versión**: 3.x o superior

**Uso**: Renderizado de gráficas interactivas

**Configuración:**
```typescript
import { Chart, ChartConfiguration } from 'chart.js';

const config: ChartConfiguration = {
  type: 'line',
  data: {
    labels: formatoHora,
    datasets: datasets
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      'y-temperature': {
        type: 'linear',
        position: 'left',
        title: { text: 'Temperatura (°C)' }
      },
      'y-current': {
        type: 'linear',
        position: 'right',
        title: { text: 'Corriente (A)' }
      }
    }
  }
};

const chart = new Chart(ctx, config);
```

---

### jsPDF

**Versión**: 2.x o superior

**Uso**: Generación de documentos PDF

**Configuración:**
```typescript
import { jsPDF } from 'jspdf';

const pdf = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

pdf.addImage(logoBase64, 'PNG', 10, 10, 50, 20);
pdf.text('Título', 10, 40);
pdf.save('documento.pdf');
```

---

### html2canvas

**Versión**: 1.x o superior

**Uso**: Captura de elementos HTML como imágenes

**Configuración:**
```typescript
import html2canvas from 'html2canvas';

const canvas = await html2canvas(element, {
  scale: 2,
  logging: false,
  useCORS: true
});

const imgData = canvas.toDataURL('image/png');
```

---

### PapaParse

**Versión**: 5.x o superior

**Uso**: Parseo de archivos CSV

**Configuración:**
```typescript
import * as Papa from 'papaparse';

Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
  complete: (results) => {
    const data = results.data as CSVDataRow[];
    // Procesar datos
  },
  error: (error) => {
    console.error('Error:', error);
  }
});
```

---

### Angular Material

**Versión**: 15.x o superior

**Componentes usados:**
- `MatFormField`
- `MatSelect`
- `MatInput`
- `MatCheckbox`
- `MatButton`
- `MatSlider`

**Importación:**
```typescript
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
```

---

## 🔐 Consideraciones de Seguridad

### Acceso a Archivos

1. **Navegador Web**:
   - Solo puede acceder a archivos seleccionados explícitamente por el usuario
   - No puede leer/escribir archivos arbitrarios del sistema
   - Usa File System Access API cuando está disponible

2. **Electron**:
   - Puede acceder a archivos del sistema mediante IPC
   - Requiere configuración de rutas permitidas
   - Implementa validación de rutas para prevenir path traversal

### Almacenamiento de Datos

1. **localStorage**:
   - Datos persisten entre sesiones
   - Limitado a ~5-10MB
   - Accesible solo desde el mismo origen

2. **BehaviorSubject**:
   - Datos en memoria
   - Se pierden al cerrar la aplicación
   - Más rápido que localStorage

### Validación de Datos

1. **CSV**:
   - Validación de estructura antes de procesar
   - Sanitización de valores numéricos
   - Manejo de caracteres especiales

2. **Formularios**:
   - Validación reactiva con Angular Forms
   - Campos requeridos marcados
   - Validación antes de generar PDF

---

## 🚀 Optimizaciones de Rendimiento

### Carga de Datos

1. **Lazy Loading**: Datos se cargan solo cuando se necesitan
2. **Caché**: Datos se almacenan en memoria después de la primera carga
3. **Debounce**: Cambios en el campo de equipo tienen debounce de 500ms

### Renderizado de Gráficas

1. **Destrucción de instancias**: Gráficas anteriores se destruyen antes de crear nuevas
2. **Change Detection**: Uso de `ChangeDetectorRef` para control manual
3. **Timeout**: Renderizado diferido con `setTimeout` para evitar bloqueos

### Generación de PDF

1. **Escala optimizada**: html2canvas usa scale: 2 para balance calidad/tamaño
2. **Compresión de imágenes**: PNG con compresión moderada
3. **Procesamiento asíncrono**: Uso de Promises para no bloquear UI

---

## 📈 Escalabilidad

### Límites Actuales

- **Registros por planta**: ~10,000 recomendado
- **Plantas por archivo**: Ilimitado (limitado por memoria del navegador)
- **Tamaño de archivo CSV**: ~5MB recomendado

### Mejoras Futuras

1. **Paginación de datos**: Para archivos muy grandes
2. **Web Workers**: Procesamiento de CSV en background
3. **IndexedDB**: Almacenamiento de mayor capacidad
4. **Streaming**: Lectura incremental de archivos grandes

---

**Versión del Documento**: 1.0
**Última actualización**: Noviembre 2024
**Aplicación**: ColdService - Módulo de Monitoreo de Temperatura
