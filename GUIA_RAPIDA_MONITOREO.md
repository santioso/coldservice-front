# ⚡ Guía Rápida - Monitoreo de Temperatura

## 🚀 Inicio Rápido (5 pasos)

### 1️⃣ Cargar Datos
```
Clic en "Cargar Archivo CSV" (botón azul superior derecho)
→ Seleccionar archivo datos_lora.csv
→ Esperar confirmación (botón se pone verde)
```

### 2️⃣ Seleccionar Planta
```
Clic en campo "Planta"
→ Elegir planta de la lista
→ La gráfica aparece automáticamente
```

### 3️⃣ Completar Formulario
```
✓ Número de equipo
✓ Límite de temperatura (usar slider)
✓ Nombre del técnico
✓ Nombre del cliente
✓ Ubicación (opcional)
✓ Tipo de gas
✓ Marcar ítems de chequeo
```

### 4️⃣ Revisar Datos
```
Verificar estadísticas:
- Última temperatura
- Temperatura mínima
- Temperatura máxima
- Tiempo transcurrido

Revisar gráfica:
- Líneas de temperatura
- Línea de límite (roja)
- Valores en el tiempo
```

### 5️⃣ Generar PDF
```
Clic en "Descargar informe PDF" (botón verde)
→ PDF se descarga automáticamente
→ Guardar en carpeta de informes
```

---

## 📊 Interpretación de la Pantalla

### Sección Superior - Formulario

```
┌─────────────────────────────────────────────────────────────┐
│ [Cargar Archivo CSV]                                        │
├─────────────────────────────────────────────────────────────┤
│ Planta: [Seleccionar ▼]  Equipo: [______]                  │
│                                                             │
│ Límite: [━━━━●━━━━━] 0°C                                   │
│                                                             │
│ Técnico: [______]  Fecha: [2024-01-15]                     │
│                                                             │
│ Cliente: [______]  Ubicación: [______]  Gas: [R290 ▼]      │
│                                                             │
│ Lista de chequeo:                                           │
│ ☑ Rodachinas  ☑ Cable  ☑ Imágenes  ☑ Pintura              │
│ ☑ Tapas  ☑ Conexión  ☑ Ajustes  ☑ Tapa compresor          │
│ ☑ Termoencogible  ☑ Sin óxido                              │
└─────────────────────────────────────────────────────────────┘
```

### Sección Media - Estadísticas

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Última Temp  │ Temp Mínima  │ Temp Máxima  │ Tiempo       │
│   5.2°C      │   4.8°C      │   5.5°C      │ 2h 30m       │
│  14:30:00    │  12:15:00    │  13:45:00    │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### Sección Inferior - Gráfica

```
┌─────────────────────────────────────────────────────────────┐
│ Monitoreo - Activo EQ-001        [Descargar PDF]           │
├─────────────────────────────────────────────────────────────┤
│ ℹ Los datos se leen desde CSV   [Recargar datos CSV]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 10°C ┤                                                      │
│      │                                                      │
│  8°C ┤     ╱─╲                                             │
│      │    ╱   ╲                                            │
│  6°C ┤   ╱     ╲___                                        │
│      │  ╱          ╲                                       │
│  4°C ┤ ╱            ╲___                                   │
│      │╱                 ╲                                  │
│  2°C ┤━━━━━━━━━━━━━━━━━━━ (Límite)                         │
│      │                                                      │
│  0°C └──────────────────────────────────────────           │
│      10:00  11:00  12:00  13:00  14:00                     │
│                                                             │
│ ── Gabinete (°C)  ── Corriente (A)  ━━ Límite              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Código de Colores

### Botones
- 🔵 **Azul** = Acción pendiente (cargar CSV)
- 🟢 **Verde** = Acción completada / Generar PDF
- 🔴 **Rojo** = Advertencia / Error

### Estadísticas
- 🔵 **Azul** = Última temperatura
- 🔷 **Celeste** = Temperatura mínima
- 🔴 **Rojo** = Temperatura máxima
- 🟢 **Verde** = Tiempo transcurrido

### Gráfica
- 🟢 **Verde/Turquesa** = Temperatura del Gabinete
- 🔴 **Rojo punteado** = Límite de temperatura
- 🔵 **Azul** = Corriente eléctrica

---

## ⌨️ Atajos y Consejos

### Navegación Rápida
- `Tab` = Moverse entre campos
- `Enter` = Confirmar selección en dropdowns
- `Espacio` = Marcar/desmarcar checkboxes

### Consejos de Productividad
1. **Prepare el CSV antes** de abrir la aplicación
2. **Use nombres consistentes** para equipos (ej: EQ-P1-001)
3. **Configure el límite primero** antes de revisar la gráfica
4. **Marque los checkboxes** mientras realiza las verificaciones
5. **Genere el PDF inmediatamente** después de completar el servicio

### Validaciones Automáticas
- ⚠️ Campos con * son **obligatorios**
- ⚠️ El botón PDF se **deshabilita** si falta información
- ⚠️ El CSV debe tener el **formato correcto**

---

## 📋 Checklist de Uso Diario

### Antes de Empezar
- [ ] Archivo CSV actualizado y disponible
- [ ] Navegador compatible abierto (Chrome recomendado)
- [ ] Información del cliente a mano
- [ ] Número de equipo identificado

### Durante el Monitoreo
- [ ] CSV cargado correctamente
- [ ] Planta seleccionada
- [ ] Gráfica visible y correcta
- [ ] Estadísticas coherentes
- [ ] Límite de temperatura configurado

### Al Completar
- [ ] Todos los campos obligatorios completos
- [ ] Lista de chequeo marcada
- [ ] Gráfica revisada
- [ ] PDF generado
- [ ] PDF guardado en carpeta correcta

---

## 🔍 Verificación Rápida de Problemas

### ❌ No aparecen plantas
```
Solución:
1. Verificar que el CSV tenga columna "Planta"
2. Recargar el archivo CSV
3. Revisar formato del archivo
```

### ❌ Gráfica no se muestra
```
Solución:
1. Verificar que seleccionó una planta
2. Esperar unos segundos
3. Recargar la página si es necesario
```

### ❌ Botón PDF deshabilitado
```
Solución:
1. Completar campo "Número de equipo"
2. Completar campo "Nombre del técnico"
3. Completar campo "Nombre del cliente"
```

### ❌ Datos incorrectos
```
Solución:
1. Clic en "Recargar datos CSV"
2. Verificar archivo CSV original
3. Volver a cargar el archivo
```

---

## 📊 Formato del Archivo CSV

### Estructura Mínima Requerida

```csv
Fecha,Hora,Planta,Gabinete (°C),Ambiente (°C),Corriente (A)
2024-01-15,10:00:00,P1,5.2,22.5,3.4
2024-01-15,10:01:00,P1,5.1,22.6,3.3
2024-01-15,10:02:00,P1,5.3,22.4,3.5
```

### Columnas Obligatorias
- ✅ `Fecha` (formato: YYYY-MM-DD)
- ✅ `Hora` (formato: HH:MM:SS)
- ✅ `Planta` (código: P1, P2, P3, etc.)

### Columnas de Datos (al menos una)
- 🌡️ `Gabinete (°C)` - Temperatura del gabinete
- 🌡️ `Ambiente (°C)` - Temperatura ambiente
- ⚡ `Corriente (A)` - Corriente eléctrica

### Reglas de Formato
- Separador: **coma (,)**
- Decimales: **punto (.)**
- Codificación: **UTF-8**
- Primera fila: **encabezados**

---

## 🎯 Objetivos de Calidad

### Tiempos Esperados
- ⏱️ Cargar CSV: **< 5 segundos**
- ⏱️ Generar gráfica: **< 2 segundos**
- ⏱️ Generar PDF: **< 10 segundos**
- ⏱️ Proceso completo: **5-10 minutos**

### Estándares de Datos
- 📊 Mínimo **10 registros** por planta
- 📊 Máximo **10,000 registros** por planta (recomendado)
- 📊 Intervalo de medición: **1-5 minutos**
- 📊 Duración mínima: **30 minutos**

### Calidad del Informe
- ✅ Todos los campos obligatorios completos
- ✅ Al menos 5 ítems de chequeo marcados
- ✅ Límite de temperatura configurado
- ✅ Gráfica clara y legible
- ✅ Estadísticas coherentes

---

## 📞 Contacto Rápido

### Soporte Técnico
- 📧 Email: soporte@coldservice.com
- 📱 Teléfono: +XX XXX XXX XXXX
- 💬 Chat: Disponible en la aplicación

### Recursos Adicionales
- 📖 Manual completo: `MANUAL_MONITOREO_TEMPERATURA.md`
- 🏗️ Documentación técnica: `ARQUITECTURA_MONITOREO_TEMPERATURA.md`
- 🎥 Video tutoriales: [URL]
- 💡 Base de conocimientos: [URL]

---

## 🔄 Actualizaciones

### Versión Actual: 1.0

**Últimas mejoras:**
- ✨ Carga de archivos CSV mejorada
- ✨ Gráficas con múltiples series
- ✨ Generación de PDF optimizada
- ✨ Validación de datos mejorada
- ✨ Interfaz más intuitiva

**Próximamente:**
- 🔜 Exportación a Excel
- 🔜 Comparación de plantas
- 🔜 Alertas automáticas
- 🔜 Reportes programados

---

## 💡 Tips Profesionales

### Para Técnicos
1. **Tome fotos** durante el servicio para adjuntar al informe
2. **Anote observaciones** importantes en un bloc de notas
3. **Verifique el equipo** antes de iniciar el monitoreo
4. **Configure alarmas** si el monitoreo es prolongado
5. **Guarde PDFs** con nomenclatura consistente

### Para Supervisores
1. **Revise PDFs** diariamente
2. **Compare tendencias** entre plantas
3. **Identifique patrones** de problemas
4. **Programe mantenimientos** basados en datos
5. **Archive informes** organizadamente

### Para Administradores
1. **Respalde archivos CSV** regularmente
2. **Mantenga nomenclatura** consistente
3. **Capacite al personal** en el uso del módulo
4. **Establezca estándares** de calidad
5. **Monitoree métricas** de uso

---

**Imprime esta guía y tenla a mano para consulta rápida** 📄

---

**Versión**: 1.0 | **Fecha**: Noviembre 2024 | **Aplicación**: ColdService
