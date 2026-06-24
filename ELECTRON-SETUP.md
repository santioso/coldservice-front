# Configuración de Electron para Monitoreo de Temperatura

## Instalación de Dependencias

1. **Instalar dependencias de Electron:**
```bash
npm install --save-dev electron electron-builder concurrently wait-on
```

2. **Verificar que las dependencias estén instaladas:**
```bash
npm list electron electron-builder
```

## Configuración del Archivo CSV

El archivo CSV debe estar ubicado en:
```
C:\Users\SantiagoO\Downloads\datos_lora.csv
```

**Formato requerido:**
```csv
Fecha,Hora,Planta,Gabinete (°C),Ambiente (°C),Corriente (A)
2025-08-06,18:47:47,P1,21.8,23.5,2.02
2025-08-06,18:48:49,P1,21.9,23.5,2.01
...
```

## Ejecutar la Aplicación

### Desarrollo
```bash
# Terminal 1: Iniciar servidor Angular
npm start

# Terminal 2: Ejecutar Electron
npm run electron-dev
```

### Producción
```bash
# Construir y ejecutar
npm run electron-build

# Construir instalador
npm run electron-pack
```

## Funcionalidades

### ✅ Carga Automática
- La aplicación busca automáticamente el archivo CSV en la ruta especificada
- No requiere intervención manual del usuario
- Muestra información del archivo encontrado

### ✅ Lectura de Datos Reales
- Lee directamente del archivo físico en el sistema
- No usa datos simulados o de ejemplo
- Procesa múltiples series de datos (Gabinete, Ambiente, Corriente)

### ✅ Escritura de Datos
- Actualiza el archivo CSV original después de generar PDFs
- Elimina datos de plantas procesadas
- Mantiene integridad de los datos

### ✅ Interfaz de Usuario
- Muestra plantas con nombres formateados (P1 → Planta 1)
- Gráficas múltiples con ejes Y separados
- Generación de PDFs con datos reales

## Solución de Problemas

### Error: "Esta funcionalidad requiere Electron"
- Asegúrate de ejecutar con `npm run electron-dev` o `npm run electron-build`
- No funciona en navegador web normal

### Error: "Archivo no encontrado"
- Verifica que el archivo existe en `C:\Users\SantiagoO\Downloads\datos_lora.csv`
- Asegúrate de que el archivo tenga permisos de lectura

### Error: "Error parsing CSV"
- Verifica el formato del archivo CSV
- Asegúrate de que tenga las columnas requeridas
- Revisa que no haya caracteres especiales corruptos

## Estructura del Proyecto

```
coldservice-front/
├── electron/
│   ├── main.js          # Proceso principal de Electron
│   └── preload.js       # APIs seguras para el renderer
├── src/
│   └── app/
│       └── monitoreo-temperatura/
│           ├── csv-file.service.ts      # Servicio para archivos CSV
│           └── monitoreo-temperatura.component.ts
├── package.json
└── electron-builder.json
```

## Notas Importantes

- **Solo funciona en Windows** (ruta hardcodeada para Windows)
- **Requiere Electron** para acceso al sistema de archivos
- **Archivo CSV debe existir** antes de ejecutar la aplicación
- **Datos se actualizan en tiempo real** al modificar el archivo CSV
