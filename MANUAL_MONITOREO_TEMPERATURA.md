# 📊 Manual de Usuario - Módulo de Monitoreo de Temperatura

## 📋 Índice
1. [Resumen del Módulo](#resumen-del-módulo)
2. [Estructura del Sistema](#estructura-del-sistema)
3. [Guía de Uso Paso a Paso](#guía-de-uso-paso-a-paso)
4. [Casos de Uso Comunes](#casos-de-uso-comunes)
5. [Funcionalidades Principales](#funcionalidades-principales)
6. [Preguntas Frecuentes](#preguntas-frecuentes)
7. [Solución de Problemas](#solución-de-problemas)

---

## 🎯 Resumen del Módulo

El **Módulo de Monitoreo de Temperatura** es una herramienta diseñada para visualizar, analizar y generar informes de datos de temperatura provenientes de diferentes plantas de refrigeración.

### ¿Qué hace este módulo?

- 📁 **Carga datos** desde archivos CSV con información de temperatura
- 📈 **Visualiza gráficas** en tiempo real de múltiples variables (temperatura del gabinete, ambiente, corriente eléctrica)
- 📊 **Muestra estadísticas** como temperatura mínima, máxima, última lectura y tiempo transcurrido
- 📄 **Genera informes PDF** profesionales con toda la información del monitoreo
- 🔄 **Actualiza datos** manualmente cuando sea necesario
- ⚙️ **Configura límites** de temperatura para control de calidad

---

## 🏗️ Estructura del Sistema

### Componentes Principales

```
Módulo de Monitoreo de Temperatura
│
├── 📁 Carga de Datos CSV
│   ├── Selección manual de archivo
│   ├── Validación de estructura
│   └── Almacenamiento en memoria
│
├── 📊 Visualización de Datos
│   ├── Selector de planta
│   ├── Panel de información (última temp, min, max, tiempo)
│   ├── Gráfica interactiva multi-serie
│   └── Línea de límite configurable
│
├── 📝 Formulario de Informe
│   ├── Datos del equipo
│   ├── Datos del técnico y cliente
│   ├── Lista de chequeo
│   └── Configuración de límites
│
└── 📄 Generación de PDF
    ├── Encabezado con logo
    ├── Información del servicio
    ├── Gráfica capturada
    └── Lista de chequeo
```

### Flujo de Datos

```
1. Usuario carga archivo CSV
   ↓
2. Sistema valida y procesa el archivo
   ↓
3. Se extraen las plantas disponibles
   ↓
4. Usuario selecciona una planta
   ↓
5. Sistema filtra y muestra datos de esa planta
   ↓
6. Se genera gráfica y estadísticas
   ↓
7. Usuario completa formulario
   ↓
8. Se genera informe PDF
```

---

## 📖 Guía de Uso Paso a Paso

### Paso 1: Cargar Archivo CSV

1. Al ingresar al módulo, verá un botón azul en la parte superior derecha que dice **"Cargar Archivo CSV"**
2. Haga clic en el botón
3. Seleccione el archivo CSV desde su computadora (normalmente llamado `datos_lora.csv`)
4. El sistema validará el archivo automáticamente

**Estructura esperada del CSV:**
```csv
Fecha,Hora,Planta,Gabinete (°C),Ambiente (°C),Corriente (A)
2024-01-15,10:30:00,P1,5.2,22.5,3.4
2024-01-15,10:31:00,P1,5.1,22.6,3.3
```

**Indicadores de éxito:**
- ✅ El botón cambiará de color azul a verde
- ✅ El texto mostrará "CSV Cargado (X plantas)" donde X es el número de plantas encontradas
- ✅ Aparecerá un cuadro informativo mostrando las series de datos disponibles

### Paso 2: Seleccionar Planta

1. En el campo **"Planta"**, haga clic para desplegar la lista
2. Verá las plantas disponibles (ej: "Planta 1", "Planta 2", etc.)
3. Seleccione la planta que desea monitorear
4. El sistema cargará automáticamente los datos de esa planta

**Qué sucede al seleccionar:**
- 🔄 Se filtran los datos del CSV para esa planta específica
- 📊 Se genera automáticamente la gráfica
- 📈 Se calculan las estadísticas (min, max, última temperatura)
- ⏱️ Se muestra el tiempo transcurrido del monitoreo

### Paso 3: Completar Información del Servicio

Complete los siguientes campos del formulario:

#### Información del Equipo
- **Número de equipo**: Identificador del equipo monitoreado (ej: "EQ-001")
- **Límite inferior de temperatura**: Use el slider para establecer el límite (rango: -50°C a 30°C)
  - El valor seleccionado aparecerá en azul junto al slider
  - Se dibujará una línea roja punteada en la gráfica mostrando este límite

#### Información del Servicio
- **Fecha**: Por defecto es la fecha actual, puede modificarla si es necesario
- **Nombre del técnico**: Nombre completo del técnico que realizó el monitoreo
- **Nombre del cliente**: Razón social o nombre del cliente
- **Ubicación del cliente**: Dirección o ubicación física del equipo
- **Tipo de gas**: Seleccione el tipo de refrigerante usado (R290, R134A, R404, R507, R600)

#### Lista de Chequeo
Marque los ítems que fueron verificados durante el servicio:
- ☑️ Estado de rodachinas
- ☑️ Cable extensión
- ☑️ Imágenes
- ☑️ Pintura
- ☑️ Tapas
- ☑️ Conexión del control
- ☑️ Ajuste de control, motor, compresor
- ☑️ Tapa compresor
- ☑️ Uso de termoencogible
- ☑️ Partes metálicas sin óxido

### Paso 4: Interpretar la Información Mostrada

#### Panel de Estadísticas
En la parte superior de la gráfica verá 4 tarjetas con información clave:

1. **Última temperatura** (azul)
   - Muestra la temperatura más reciente registrada
   - Incluye la hora exacta de la medición

2. **Temperatura mínima** (celeste)
   - La temperatura más baja registrada durante el monitoreo
   - Incluye la hora en que ocurrió

3. **Temperatura máxima** (rojo)
   - La temperatura más alta registrada durante el monitoreo
   - Incluye la hora en que ocurrió

4. **Tiempo transcurrido** (verde)
   - Duración total del monitoreo
   - Formato: "Xh Ym" (horas y minutos)

#### Gráfica Interactiva

La gráfica muestra múltiples series de datos:

- **Línea verde/turquesa**: Temperatura del Gabinete (°C)
- **Línea roja punteada**: Límite inferior configurado
- **Línea azul** (si está disponible): Corriente eléctrica (A)
- **Eje X**: Hora de las mediciones (formato 24h)
- **Eje Y izquierdo**: Temperatura en grados Celsius
- **Eje Y derecho**: Corriente en Amperios

**Funciones interactivas:**
- 🖱️ Pase el cursor sobre la gráfica para ver valores exactos
- 🔍 La leyenda en la parte superior identifica cada serie
- 📏 Las líneas de cuadrícula facilitan la lectura de valores

### Paso 5: Actualizar Datos

Si necesita recargar los datos del archivo CSV:

1. Haga clic en el botón **"Recargar datos CSV"** (botón azul con ícono de actualización)
2. El sistema volverá a leer el archivo y actualizará la gráfica
3. Útil cuando el archivo CSV se actualiza externamente

### Paso 6: Generar Informe PDF

Una vez completado el formulario:

1. Verifique que todos los campos requeridos estén completos (marcados con *)
2. Haga clic en el botón **"Descargar informe PDF"** (botón verde en la parte superior de la gráfica)
3. El sistema generará un PDF profesional que incluye:
   - Logo de la empresa
   - Información del servicio
   - Datos del cliente y técnico
   - Gráfica capturada
   - Estadísticas de temperatura
   - Lista de chequeo marcada
   - Fecha y hora de generación

**El PDF se descargará automáticamente** con el nombre: `Informe_Temperatura_[Planta]_[Fecha].pdf`

---

## 💼 Casos de Uso Comunes

### Caso 1: Monitoreo de Rutina

**Escenario**: Un técnico realiza el monitoreo mensual de una planta de refrigeración.

**Pasos:**
1. Cargar el archivo CSV con los datos del día
2. Seleccionar la planta correspondiente
3. Verificar que las temperaturas estén dentro del rango esperado
4. Completar la información del servicio
5. Marcar los ítems de la lista de chequeo
6. Generar y guardar el informe PDF

**Tiempo estimado**: 5-10 minutos

---

### Caso 2: Diagnóstico de Problema

**Escenario**: Se reporta que un equipo no está enfriando correctamente.

**Pasos:**
1. Cargar datos de monitoreo reciente
2. Seleccionar la planta afectada
3. Analizar la gráfica buscando:
   - Temperaturas fuera de rango
   - Variaciones anormales
   - Picos o caídas súbitas
4. Revisar la corriente eléctrica (si está disponible)
5. Documentar hallazgos en el informe
6. Establecer límite de temperatura objetivo
7. Generar PDF para seguimiento

**Tiempo estimado**: 15-20 minutos

---

### Caso 3: Comparación de Múltiples Plantas

**Escenario**: Necesita comparar el rendimiento de diferentes plantas.

**Pasos:**
1. Cargar el archivo CSV con datos de todas las plantas
2. Para cada planta:
   - Seleccionarla del menú
   - Revisar estadísticas (min, max, promedio implícito)
   - Generar informe PDF individual
3. Comparar los PDFs generados
4. Identificar plantas con mejor/peor rendimiento

**Tiempo estimado**: 10-15 minutos por planta

---

### Caso 4: Auditoría de Calidad

**Escenario**: Revisión de cumplimiento de estándares de servicio.

**Pasos:**
1. Cargar datos históricos
2. Seleccionar planta a auditar
3. Verificar que la temperatura se mantuvo dentro de límites
4. Revisar que todos los ítems de chequeo estén marcados
5. Validar información completa del técnico y cliente
6. Generar PDF para archivo de auditoría

**Tiempo estimado**: 10 minutos

---

## ⚙️ Funcionalidades Principales

### 1. Carga de Datos CSV

**Características:**
- ✅ Validación automática de estructura
- ✅ Soporte para múltiples plantas en un solo archivo
- ✅ Detección automática de columnas (Fecha, Hora, Planta, variables de medición)
- ✅ Almacenamiento en memoria para acceso rápido
- ✅ Persistencia en navegador (localStorage)

**Formatos soportados:**
- Archivos .csv con codificación UTF-8
- Separador: coma (,)
- Primera fila: encabezados de columna

---

### 2. Visualización de Gráficas

**Tipos de datos visualizados:**
- 🌡️ Temperatura del Gabinete (°C)
- 🌡️ Temperatura Ambiente (°C) - si está disponible
- ⚡ Corriente Eléctrica (A) - si está disponible
- 📏 Línea de límite inferior configurable

**Características de la gráfica:**
- Múltiples series en un solo gráfico
- Ejes Y duales (temperatura y corriente)
- Escala automática según datos
- Cuadrícula cada 2 grados para fácil lectura
- Colores diferenciados por serie
- Formato de hora 24h en eje X

---

### 3. Estadísticas en Tiempo Real

**Cálculos automáticos:**
- **Última temperatura**: Valor más reciente + hora
- **Temperatura mínima**: Valor más bajo + hora de ocurrencia
- **Temperatura máxima**: Valor más alto + hora de ocurrencia
- **Tiempo transcurrido**: Duración total del monitoreo

**Actualización:**
- Se recalculan automáticamente al cambiar de planta
- Se actualizan al recargar datos

---

### 4. Configuración de Límites

**Slider de temperatura:**
- Rango: -50°C a 30°C
- Incrementos: 1°C
- Visualización en tiempo real del valor seleccionado
- Línea roja punteada en la gráfica mostrando el límite

**Uso:**
- Establecer temperatura mínima aceptable
- Identificar visualmente si hay lecturas fuera de rango
- Documentar parámetros de operación

---

### 5. Lista de Chequeo

**10 ítems estándar de verificación:**
1. Estado de rodachinas
2. Cable extensión
3. Imágenes
4. Pintura
5. Tapas
6. Conexión del control
7. Ajuste de control, motor, compresor
8. Tapa compresor
9. Uso de termoencogible
10. Partes metálicas sin óxido

**Funcionalidad:**
- Checkboxes independientes
- Se incluyen en el PDF generado
- Ayuda a estandarizar el servicio

---

### 6. Generación de PDF

**Contenido del informe:**

**Sección 1: Encabezado**
- Logo de la empresa
- Título del informe
- Fecha y hora de generación

**Sección 2: Información del Servicio**
- Planta monitoreada
- Número de equipo
- Técnico responsable
- Cliente y ubicación
- Tipo de gas refrigerante
- Límite de temperatura configurado

**Sección 3: Estadísticas**
- Última temperatura registrada
- Temperatura mínima y hora
- Temperatura máxima y hora
- Tiempo total de monitoreo

**Sección 4: Gráfica**
- Captura de la gráfica completa
- Todas las series visibles
- Línea de límite incluida

**Sección 5: Lista de Chequeo**
- Todos los ítems marcados
- Formato de lista con checkmarks

**Formato:**
- Tamaño: A4
- Orientación: Vertical
- Calidad: Alta resolución
- Nombre archivo: `Informe_Temperatura_[Planta]_[Fecha].pdf`

---

## ❓ Preguntas Frecuentes

### ¿Qué formato debe tener el archivo CSV?

El archivo debe tener al menos estas columnas:
- `Fecha`: Formato YYYY-MM-DD (ej: 2024-01-15)
- `Hora`: Formato HH:MM:SS (ej: 14:30:00)
- `Planta`: Código de planta (ej: P1, P2, P3)
- Columnas de datos con unidades entre paréntesis (ej: "Gabinete (°C)")

### ¿Puedo cargar datos de múltiples plantas en un solo archivo?

Sí, el sistema detecta automáticamente todas las plantas presentes en el archivo CSV y las muestra en el selector de plantas.

### ¿Qué pasa si el archivo CSV no tiene el formato correcto?

El sistema mostrará un mensaje de error indicando que el formato es incorrecto y le pedirá que seleccione otro archivo.

### ¿Los datos se guardan automáticamente?

Los datos del CSV se almacenan temporalmente en el navegador (localStorage). Si cierra la aplicación, deberá volver a cargar el archivo CSV.

### ¿Puedo editar el PDF generado?

El PDF se genera como documento final. Si necesita hacer cambios, modifique la información en el formulario y genere un nuevo PDF.

### ¿Qué navegadores son compatibles?

La aplicación funciona mejor en:
- Google Chrome (recomendado)
- Microsoft Edge
- Firefox
- Safari

### ¿Necesito conexión a internet?

Una vez cargada la aplicación, puede trabajar sin conexión a internet. Solo necesita el archivo CSV local.

### ¿Cuántos datos puede manejar el sistema?

El sistema puede manejar archivos CSV con miles de registros. Sin embargo, para mejor rendimiento, se recomienda archivos con menos de 10,000 registros por planta.

### ¿Puedo exportar los datos a Excel?

Actualmente solo se genera PDF. Los datos originales están en el archivo CSV que puede abrir con Excel.

### ¿Cómo actualizo los datos si el archivo CSV cambia?

Use el botón "Recargar datos CSV" para volver a leer el archivo desde disco.

---

## 🔧 Solución de Problemas

### Problema: No aparecen plantas después de cargar el CSV

**Posibles causas:**
- El archivo no tiene la columna "Planta"
- El archivo está vacío
- El formato del archivo es incorrecto

**Solución:**
1. Verifique que el archivo tenga la columna "Planta"
2. Abra el CSV en un editor de texto para verificar el formato
3. Asegúrese de que haya datos en el archivo
4. Intente cargar el archivo nuevamente

---

### Problema: La gráfica no se muestra

**Posibles causas:**
- No se ha seleccionado una planta
- Los datos de la planta están vacíos
- Error en el formato de fechas/horas

**Solución:**
1. Verifique que haya seleccionado una planta
2. Revise que la planta tenga datos en el CSV
3. Verifique el formato de las columnas Fecha y Hora
4. Recargue la página y vuelva a cargar el CSV

---

### Problema: El botón "Descargar informe PDF" está deshabilitado

**Causa:**
Faltan campos requeridos en el formulario

**Solución:**
Complete todos los campos marcados como requeridos:
- Planta
- Número de equipo
- Nombre del técnico
- Nombre del cliente

---

### Problema: Las temperaturas se muestran incorrectamente

**Posibles causas:**
- Formato incorrecto en el CSV (comas en lugar de puntos decimales)
- Columnas mal etiquetadas

**Solución:**
1. Verifique que los números usen punto (.) como separador decimal
2. Asegúrese de que las columnas tengan las unidades correctas (°C)
3. Revise que no haya caracteres especiales en los valores numéricos

---

### Problema: El PDF no se descarga

**Posibles causas:**
- Bloqueador de ventanas emergentes activo
- Permisos de descarga bloqueados
- Error en el navegador

**Solución:**
1. Permita descargas desde la aplicación en su navegador
2. Desactive temporalmente bloqueadores de ventanas emergentes
3. Intente con otro navegador
4. Verifique que tenga espacio en disco

---

### Problema: Los datos no se actualizan al hacer clic en "Recargar datos CSV"

**Causa:**
El archivo CSV no ha cambiado o el navegador está usando datos en caché

**Solución:**
1. Verifique que el archivo CSV se haya actualizado realmente
2. Cierre y vuelva a abrir la aplicación
3. Limpie el caché del navegador
4. Vuelva a cargar el archivo CSV manualmente

---

## 📞 Soporte Técnico

Si experimenta problemas no cubiertos en este manual:

1. **Verifique la consola del navegador** (F12) para mensajes de error
2. **Tome una captura de pantalla** del error
3. **Anote los pasos** que realizó antes del error
4. **Contacte al equipo de soporte** con esta información

---

## 📝 Notas Importantes

- ⚠️ **Siempre verifique** que el archivo CSV tenga el formato correcto antes de cargarlo
- 💾 **Guarde los informes PDF** generados para mantener un historial
- 🔄 **Recargue los datos** después de cada actualización del archivo CSV
- ✅ **Complete todos los campos** del formulario para generar informes completos
- 📊 **Revise las gráficas** antes de generar el PDF para asegurar que los datos sean correctos

---

## 🎓 Consejos de Uso

1. **Organice sus archivos CSV** por fecha o periodo para facilitar el seguimiento
2. **Use nombres descriptivos** para los equipos (ej: "EQ-PLANTA1-001")
3. **Establezca límites de temperatura** basados en especificaciones del fabricante
4. **Genere PDFs regularmente** para mantener documentación actualizada
5. **Revise las estadísticas** para identificar tendencias o problemas
6. **Marque todos los ítems** de la lista de chequeo durante el servicio

---

**Versión del Manual**: 1.0
**Última actualización**: Noviembre 2024
**Aplicación**: ColdService - Módulo de Monitoreo de Temperatura
