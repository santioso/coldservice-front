import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
  OnDestroy,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Chart, ChartConfiguration } from 'chart.js';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  MonitoreoTemperaturaService,
  TemperatureData,
  InformeItem,
} from './monitoreo-temperatura.service';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { LogoConst } from '../../assets/images/base64/logo.const';
import Swal from 'sweetalert2';

interface DatoTemperatura {
  valor: number;
  tiempo: Date;
  indice: number;
}

@Component({
  selector: 'app-monitoreo-temperatura',
  templateUrl: './monitoreo-temperatura.component.html',
  styleUrls: ['./monitoreo-temperatura.component.scss'],
})
export class MonitoreoTemperaturaComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('graficaCanvas') graficaCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('reporteContent') reporteContent!: ElementRef<HTMLDivElement>;

  form!: FormGroup;
  plantas: string[] = [];
  plantasFormateadas: { codigo: string; nombre: string }[] = [];
  checklistItems: string[] = [];
  temperaturaChart: Chart | null = null;
  datosTemperatura: TemperatureData | null = null;
  mostrarGrafica = false;
  datosListos = false;
  tituloArchivo: string = 'Cargar Archivo CSV';
  botonColor: string = 'primary';
  tipoGas: string[] = ["R290", "R134A", "R404", "R507", "R600"];

  // Variables del slider
  disabled = false;
  max = 30;
  min = -50;
  showTicks = true;
  step = 1;
  thumbLabel = true;
  value = 0;

  private actualizacionAutomatica: Subscription | null = null;
  private equipoSubscription: Subscription | null = null;
  private readonly INTERVALO_ACTUALIZACION = 30000; // 30 segundos en milisegundos

  // Logo en formato base64 para el PDF
  private readonly logoBase64 = LogoConst._LOGO;

  constructor(
    private fb: FormBuilder,
    private monitoreoService: MonitoreoTemperaturaService,
    private cdr: ChangeDetectorRef
  ) {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    // Inicialmente no hay plantas hasta que se cargue el archivo CSV
    this.plantas = [];
    this.plantasFormateadas = [];

    this.checklistItems = this.monitoreoService.getChecklistItems();

    // Suscribirse a los cambios en el campo de equipo
    this.equipoSubscription =
      this.form
        .get('equipo')
        ?.valueChanges.pipe(
          debounceTime(500), // Esperar 500ms después de la última tecla
          distinctUntilChanged() // Solo emitir cuando el valor cambie
        )
        .subscribe(() => {
          if (this.datosListos && this.mostrarGrafica) {
            this.actualizarGrafica();
          }
        }) ?? null;

    // Cargar automáticamente el archivo CSV al inicializar el componente
    // this.cargarArchivoCSVAutomaticamente();
  }

  ngAfterViewInit(): void {
    // Si ya tenemos datos cuando la vista se inicializa, actualizamos la gráfica
    if (this.datosListos) {
      this.actualizarGrafica();
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {
    // Cancelar todas las suscripciones al destruir el componente
    if (this.actualizacionAutomatica) {
      this.actualizacionAutomatica.unsubscribe();
      this.actualizacionAutomatica = null;
    }

    if (this.equipoSubscription) {
      this.equipoSubscription.unsubscribe();
      this.equipoSubscription = null;
    }
  }

  onSliderChange(value: number): void {
    this.form.get('limite')?.setValue(value);
    this.cdr.detectChanges();
    this.actualizarDatosManualmente();
  }

  private inicializarFormulario(): void {
    this.form = this.fb.group({
      planta: ['', Validators.required],
      equipo: ['', Validators.required],
      limite: [''],
      tecnico: ['', Validators.required],
      fecha: [new Date().toISOString().split('T')[0]],
      cliente: ['', Validators.required],
      ubicacion: [''],
      tipo_gas: [''],
      chequeo: this.fb.array([]),
    });
    this.form.get('limite')?.setValue(this.value);
  }

  private reiniciarFormulario(mantenerPlanta = false): void {
    const plantaActual = mantenerPlanta ? this.form.get('planta')?.value : '';

    // Reiniciar el formulario
    this.inicializarFormulario();

    // Si se debe mantener la planta, restaurar su valor
    if (mantenerPlanta && plantaActual) {
      this.form.get('planta')?.setValue(plantaActual);
    }
  }

  onPlantaChange(): void {
    const planta = this.form.get('planta')?.value;
    if (!planta) return;

    // Reiniciar el formulario manteniendo solo la planta seleccionada
    this.reiniciarFormulario(true);
    // Asegurar que el límite en el formulario refleje el valor actual del slider
    this.form.get('limite')?.setValue(this.value);

    // Cancelar cualquier actualización automática previa
    if (this.actualizacionAutomatica) {
      this.actualizacionAutomatica.unsubscribe();
      this.actualizacionAutomatica = null;
    }

    // Obtener los datos iniciales desde el archivo CSV
    this.obtenerDatosPlanta(planta);

    // Nota: No se configura actualización automática ya que los datos vienen de archivo local
    // Para actualizar datos, el usuario debe usar el botón "Actualizar Datos"
  }

  private obtenerDatosPlanta(planta: string, mostrarError = true): void {
    console.log('🔍 Componente: Obteniendo datos para planta:', planta);

    this.monitoreoService.obtenerDatos(planta).subscribe(
      (data) => {
        console.log('✅ Componente: Datos recibidos:', data);
        console.log('📊 Series de datos:', data.series.length);
        console.log('⏰ Tiempos:', data.tiempos.length);
        console.log('🌡️ Temperaturas:', data.temperaturas.length);

        this.datosTemperatura = data;
        this.datosListos = true;
        this.mostrarGrafica = true;

        // Forzamos la detección de cambios para asegurar que la vista se actualice
        this.cdr.detectChanges();

        // Esperamos a que la vista se actualice antes de intentar acceder al canvas
        setTimeout(() => {
          this.actualizarGrafica();
        }, 0);
      },
      (error) => {
        console.error('❌ Componente: Error al obtener datos:', error);
        if (mostrarError) {
          alert('Error al obtener datos de temperatura');
        }
      }
    );
  }

  // Métodos para obtener información de temperatura
  obtenerUltimaTemperatura(): DatoTemperatura {
    console.log('🔍 Calculando última temperatura...');
    console.log('📊 datosTemperatura:', this.datosTemperatura);

    if (!this.datosTemperatura || this.datosTemperatura.series.length === 0) {
      console.log('❌ No hay datos de temperatura disponibles');
      return { valor: 0, tiempo: new Date(), indice: -1 };
    }

    // Mostrar todas las series disponibles para debugging
    console.log('📋 Todas las series disponibles:');
    this.datosTemperatura.series.forEach((serie, index) => {
      console.log(
        `  Serie ${index}: nombre="${serie.nombre}", unidad="${serie.unidad}"`
      );
    });

    // Obtener específicamente la serie del Gabinete
    const temperaturaSeries = this.datosTemperatura.series.find(
      (s) => s.nombre.toLowerCase().includes('gabinete')
    );
    console.log('🌡️ Serie del Gabinete encontrada:', temperaturaSeries);

    if (!temperaturaSeries || temperaturaSeries.valores.length === 0) {
      console.log('❌ No hay valores de temperatura en la serie');
      return { valor: 0, tiempo: new Date(), indice: -1 };
    }

    const { tiempos } = this.datosTemperatura;
    const ultimoIndice = temperaturaSeries.valores.length - 1;
    const ultimoValor = temperaturaSeries.valores[ultimoIndice];
    const ultimoTiempo = tiempos[ultimoIndice];

    console.log(
      '✅ Última temperatura calculada:',
      ultimoValor,
      'en',
      ultimoTiempo
    );

    return {
      valor: ultimoValor,
      tiempo: ultimoTiempo,
      indice: ultimoIndice,
    };
  }

  obtenerTemperaturaMinima(): DatoTemperatura {
    if (!this.datosTemperatura || this.datosTemperatura.series.length === 0) {
      return { valor: 0, tiempo: new Date(), indice: -1 };
    }

    // Obtener específicamente la serie del Gabinete
    const temperaturaSeries = this.datosTemperatura.series.find((s) =>
      s.nombre.toLowerCase().includes('gabinete')
    );
    if (!temperaturaSeries || temperaturaSeries.valores.length === 0) {
      return { valor: 0, tiempo: new Date(), indice: -1 };
    }

    const { tiempos } = this.datosTemperatura;
    let minValor = Number.MAX_VALUE;
    let minIndice = 0;

    temperaturaSeries.valores.forEach((temp, i) => {
      if (temp < minValor) {
        minValor = temp;
        minIndice = i;
      }
    });

    return {
      valor: minValor,
      tiempo: tiempos[minIndice],
      indice: minIndice,
    };
  }

  obtenerTemperaturaMaxima(): DatoTemperatura {
    if (!this.datosTemperatura || this.datosTemperatura.series.length === 0) {
      return { valor: 0, tiempo: new Date(), indice: -1 };
    }

    // Obtener específicamente la serie del Gabinete
    const temperaturaSeries = this.datosTemperatura.series.find((s) =>
      s.nombre.toLowerCase().includes('gabinete')
    );
    if (!temperaturaSeries || temperaturaSeries.valores.length === 0) {
      return { valor: 0, tiempo: new Date(), indice: -1 };
    }

    const { tiempos } = this.datosTemperatura;
    let maxValor = Number.MIN_VALUE;
    let maxIndice = 0;

    temperaturaSeries.valores.forEach((temp, i) => {
      if (temp > maxValor) {
        maxValor = temp;
        maxIndice = i;
      }
    });

    return {
      valor: maxValor,
      tiempo: tiempos[maxIndice],
      indice: maxIndice,
    };
  }

  obtenerTiempoTranscurrido(): string {
    if (!this.datosTemperatura || this.datosTemperatura.tiempos.length === 0) {
      return 'No hay datos disponibles';
    }

    const tiempos = this.datosTemperatura.tiempos;
    const inicio = new Date(tiempos[0]);
    const fin = new Date(tiempos[tiempos.length - 1]);

    return this.calcularDuracion(inicio, fin);
  }

  // Filtra las series que no queremos mostrar
  filtrarSeries(series: any[]): any[] {
    if (!series) return [];
    
    return series.filter(serie => {
      const nombreSerie = serie.nombre.toLowerCase();
      return !(
        nombreSerie.includes('temperatura ambiente') || 
        nombreSerie.includes('delta t') || 
        nombreSerie.includes('diferencia')
      );
    });
  }

  formatearHora(fecha: Date): string {
    if (!fecha) return '';

    const horas = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');
    const segundos = fecha.getSeconds().toString().padStart(2, '0');

    return `${horas}:${minutos}:${segundos}`;
  }

  private formatearFecha(fecha: Date): string {
    if (!fecha) return '';
    const year = fecha.getFullYear();
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const day = fecha.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  actualizarGrafica(): void {
    if (!this.datosTemperatura || !this.graficaCanvas) return;

    // Destruir el gráfico existente si hay uno
    if (this.temperaturaChart) {
      this.temperaturaChart.destroy();
      this.temperaturaChart = null;
    }

    const { tiempos, series } = this.datosTemperatura;

    // Filtrar las series que no queremos mostrar
    const seriesFiltradas = series.filter(serie => {
      const nombreSerie = serie.nombre.toLowerCase();
      // Verificar si el nombre de la serie contiene alguna de las palabras clave a excluir
      const esSerieAOcultar = 
        nombreSerie.includes('ambiente') || 
        nombreSerie.includes('delta') || 
        nombreSerie.includes('diferencia');
      
      console.log(`Serie: ${serie.nombre}, Ocultar: ${esSerieAOcultar}`);
      
      return !esSerieAOcultar;
    });
    
    console.log('Series después de filtrar:', seriesFiltradas.map(s => s.nombre));

    // Formatear los tiempos para mostrar solo la hora
    const formatoHora = tiempos.map((tiempo) => {
      const fecha = new Date(tiempo);
      return `${fecha.getHours().toString().padStart(2, '0')}:${fecha
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
    });

    // Parseo robusto del límite: permitir 0 como valor válido
    const rawLimite = this.form.get('limite')?.value;
    const parsedLimite = Number(rawLimite);
    const limite =
      rawLimite === '' || rawLimite === null || rawLimite === undefined || Number.isNaN(parsedLimite)
        ? null
        : parsedLimite;
    const activo = this.form.get('equipo')?.value;

    // Configuración del gráfico con múltiples series
    const datasets: any[] = [];

    // Colores para las diferentes series
    const colors = [
      { border: 'rgb(75, 192, 192)', background: 'rgba(75, 192, 192, 0.1)' }, // Gabinete
      { border: 'rgb(255, 99, 132)', background: 'rgba(255, 99, 132, 0.1)' }, // Ambiente
      { border: 'rgba(4, 82, 17, 0.49)', background: 'rgba(255, 99, 132, 0.1)' }, // Diferencia
      { border: 'rgb(54, 162, 235)', background: 'rgba(54, 162, 235, 0.1)' }, // Corriente
      { border: 'rgb(255, 205, 86)', background: 'rgba(255, 205, 86, 0.1)' }, // Extra
      { border: 'rgb(153, 102, 255)', background: 'rgba(153, 102, 255, 0.1)' }, // Extra
    ];

    // Agregar cada serie de datos (ya filtradas)
    seriesFiltradas.forEach((serie, index) => {
      datasets.push({
        label: serie.unidad ? `${serie.nombre} (${serie.unidad})` : serie.nombre,
        data: serie.valores,
        borderColor: colors[index % colors.length].border,
        backgroundColor: colors[index % colors.length].background,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: colors[index % colors.length].border,
        fill: false,
        tension: 0.1,
        yAxisID: this.getYAxisId(serie.unidad, serie.nombre)
      });
    });

    // Agregar línea de límite si se especificó (solo para temperaturas)
    if (limite !== null) {
      const temperaturaSeries = series.find((s) => 
        s.unidad.includes('°C') || 
        s.nombre.toLowerCase().includes('gabinete') || 
        s.nombre.toLowerCase().includes('ambiente')
      );
      if (temperaturaSeries) {
        datasets.push({
          label: `Límite inferior: ${limite}°C`,
          data: Array(tiempos.length).fill(limite),
          borderColor: 'red',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
          yAxisID: 'y-temperature',
        });
      }
    }

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: formatoHora,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Monitoreo - Activo ${
              this.form.get('equipo')?.value || 'Sin número'
            }`,
            font: {
              size: 16,
            },
          },
          legend: {
            position: 'top',
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Hora',
            },
            ticks: {
              maxRotation: 90,
              minRotation: 90,
            },
          },
          'y-temperature': {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Temperatura (°C)',
            },
            // Configuración de ticks para mostrar cada 2 grados
            ticks: {
              stepSize: 2,
            },
            // Configuración de la cuadrícula
            grid: {
              // Dibujar líneas de cuadrícula para todos los ticks
              color: function(context) {
                // Solo dibujar líneas para valores pares
                if (context.tick && Number.isInteger(context.tick.value) && context.tick.value % 2 === 0) {
                  return 'rgba(200, 200, 200, 0.5)';
                }
                return 'transparent';
              },
              lineWidth: 1,
              drawOnChartArea: true,
              drawTicks: true,
              tickColor: 'rgba(200, 200, 200, 0.5)'
            },
          },
          'y-current': {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Corriente (A)',
            },
            grid: {
              drawOnChartArea: false,
            },
          },
        },
      },
    };

    try {
      // Crear el nuevo gráfico
      const ctx = this.graficaCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.temperaturaChart = new Chart(ctx, config);
      } else {
        console.error('No se pudo obtener el contexto 2D del canvas');
      }
    } catch (error) {
      console.error('Error al crear el gráfico:', error);
    }
  }

  // Método para cargar archivo CSV manualmente
  cargarArchivoCSV(): void {
    // Usar el servicio existente para cargar el CSV
    // Preferir File System Access API para conservar un handle escribible
    const seleccionar$ = this.monitoreoService.csvFileService.selectCSVFileWithPicker();
    seleccionar$.subscribe({
      next: (data) => {
        console.log('Archivo CSV cargado exitosamente:', data.length, 'registros');
        
        // Validar la estructura del archivo CSV
        if (!this.validarEstructuraCSV(data)) {
          console.error('Estructura de archivo CSV inválida');
          Swal.fire({
            title: 'Formato incorrecto',
            text: 'El archivo CSV no tiene el formato esperado (Fecha, Hora, Planta, Gabinete, ...). Por favor, seleccione un archivo válido.',
            icon: 'error',
            confirmButtonText: 'Cerrar'
          }).then((result) => {
            if (result.isConfirmed) {
              // Volver a abrir el cuadro de diálogo para seleccionar otro archivo
              this.cargarArchivoCSV();
            }
          });
          this.tituloArchivo = 'Cargar Archivo CSV';
          this.botonColor = 'primary';
          return;
        }
        
        // Cargar las plantas y actualizar el título con el número de plantas
        this.cargarPlantasDesdeCSV();
        
        // Obtener el número de plantas directamente del servicio
        this.monitoreoService.getPlantasFormateadas().subscribe(
          (plantas) => {
            console.log('Plantas encontradas:', plantas.length);
            this.tituloArchivo = 'CSV Cargado (' + plantas.length + ' plantas)';
            // Cambiar el color del botón a verde para indicar éxito
            this.botonColor = 'accent';
          }
        );
      },
      error: (error) => {
        console.error('Error al cargar archivo CSV:', error);
        Swal.fire({
          title: 'Error',
          text: 'Error al cargar el archivo CSV: ' + error.message,
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        this.tituloArchivo = 'Cargar Archivo CSV';
        this.botonColor = 'primary';
      }
    });
  }

  /**
   * Valida que el archivo CSV tenga la estructura correcta
   * @param data Datos del CSV
   * @returns true si la estructura es válida, false en caso contrario
   */
  private validarEstructuraCSV(data: any[]): boolean {
    // Verificar que haya datos
    if (!data || data.length === 0) {
      return false;
    }
    
    // Obtener las claves del primer objeto (encabezados del CSV)
    const headers = Object.keys(data[0]);
    
    // Verificar que existan los encabezados requeridos (Fecha, Hora, Planta, Gabinete)
    // Nota: Comprobamos diferentes variantes de capitalización
    const requiredHeaders = ['Fecha', 'Hora', 'Planta', 'Gabinete'];
    
    for (const required of requiredHeaders) {
      // Buscar si existe alguna variante del encabezado (mayúsculas, minúsculas, etc.)
      const exists = headers.some(header => 
        header.toLowerCase() === required.toLowerCase() ||
        header.toLowerCase().includes(required.toLowerCase())
      );
      
      if (!exists) {
        console.error(`Falta el encabezado requerido: ${required}`);
        console.log('Encabezados encontrados:', headers);
        return false;
      }
    }
    
    // Verificar que al menos el primer registro tenga datos válidos
    const firstRow = data[0];
    for (const required of requiredHeaders) {
      // Buscar la clave que corresponde al encabezado requerido
      const key = headers.find(header => 
        header.toLowerCase() === required.toLowerCase() ||
        header.toLowerCase().includes(required.toLowerCase())
      );
      
      if (key && (!firstRow[key] || firstRow[key].trim() === '')) {
        console.error(`El primer registro no tiene un valor válido para: ${required}`);
        return false;
      }
    }
    
    return true;
  }
  
  // Método para cargar automáticamente el archivo CSV
  private cargarArchivoCSVAutomaticamente(): void {
    // Intentar cargar el archivo CSV automáticamente
    this.monitoreoService.csvFileService.loadDefaultCSVFile().subscribe({
      next: (data: any) => {
        console.log(
          'Archivo CSV cargado automáticamente:',
          data.length,
          'registros'
        );

        this.tituloArchivo = 'Cargar Archivo CSV';
        this.cargarPlantasDesdeCSV();
      },
      error: (error: any) => {
        console.log(
          'No se pudo cargar automáticamente el archivo CSV:',
          error.message
        );
      },
    });
  }

  // Método auxiliar para cargar plantas desde CSV
  private cargarPlantasDesdeCSV(): void {
    this.monitoreoService.getPlantasFormateadas().subscribe(
      (plantasFormateadas) => {
        this.plantasFormateadas = plantasFormateadas;
        this.plantas = plantasFormateadas.map((p) => p.codigo);
      },
      (error) => {
        console.error('Error al cargar plantas:', error);
        this.plantas = [];
        this.plantasFormateadas = [];
      }
    );
  }

  // Método para actualizar manualmente los datos
  actualizarDatosManualmente(): void {
    const planta = this.form.get('planta')?.value;
    if (planta) {
      // Recargar datos desde el archivo CSV
      this.monitoreoService.recargarDatos().subscribe(() => {
        this.obtenerDatosPlanta(planta);
      });
    }
  }

  generarPDF(): void {
    if (!this.reporteContent || !this.datosTemperatura || !this.form.valid) return;

    //const { tiempos, temperaturas } = this.datosTemperatura;
    const formValues = this.form.value;

    // Crear el PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();

    // Información de la empresa al lado derecho
    pdf.setFontSize(10);
    const rightMargin = pageWidth - 70; // Posición para alinear a la derecha
    pdf.text('Cold Service SAS', rightMargin, 12);
    pdf.text('Catambuco', rightMargin, 16);
    pdf.text('Pasto', rightMargin, 20);
    pdf.text('Colombia', rightMargin, 24);
    pdf.text('Cel: +57 3212541796', rightMargin, 28);
    pdf.text('fabio.osorio@coldservice.com.co', rightMargin, 32);
    pdf.text('www.coldservice.com.co', rightMargin, 36);

    // Usar el logo en base64
    try {
      // Agregar el logo al PDF usando la propiedad logoBase64
      pdf.addImage(this.logoBase64, 'PNG', 20, 10, 54, 27);
    } catch (error) {
      console.warn('Error al agregar el logo al PDF:', error);

      // Si hay un error, usar el placeholder como respaldo
      pdf.setDrawColor(200, 200, 200);
      pdf.setFillColor(240, 240, 240);
      pdf.roundedRect(20, 10, 40, 20, 3, 3, 'FD');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('LOGO', 40, 22, { align: 'center' });
      pdf.setTextColor(0, 0, 0); // Restaurar color de texto
    }

    // Título
    pdf.setFontSize(16);
    pdf.setTextColor(0, 51, 153); // Color azul
    const nombrePlanta = this.monitoreoService.formatearNombrePlanta(
      formValues.planta
    );
    pdf.text(
      `Reporte de Monitoreo - ${nombrePlanta} - Activo ${
        formValues.equipo || 'Sin número'
      }`,
      pageWidth / 2,
      50,
      { align: 'center' }
    );
    pdf.setTextColor(0, 0, 0);

    // Información del reporte
    pdf.setFontSize(11);
    pdf.text(`Fecha: ${formValues.fecha}`, 20, 60);
    pdf.text(`Técnico: ${formValues.tecnico || ''}`, 120, 60);
    pdf.text(`Equipo: ${formValues.equipo || ''}`, 20, 70);
    pdf.text(`Cliente: ${formValues.cliente || ''}`, 120, 70);
    pdf.text(`Ubicación: ${formValues.ubicacion || ''}`, 20, 80);
    pdf.text(`Tipo de gas: ${formValues.tipo_gas || ''}`, 120, 80);

    // Línea divisoria entre ubicación y datos de temperatura
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.line(20, 85, pageWidth - 20, 85);

    // Datos de temperatura
    const tempMin = this.obtenerTemperaturaMinima();
    const tempMax = this.obtenerTemperaturaMaxima();
    const tempUltima = this.obtenerUltimaTemperatura();
    const duracion = this.obtenerTiempoTranscurrido();

    pdf.text(
      `Última temperatura: ${tempUltima.valor.toFixed(
        2
      )} °C (${this.formatearHora(tempUltima.tiempo)})`,
      20,
      95
    );
    pdf.text(
      `Temperatura mínima: ${tempMin.valor.toFixed(2)} °C (${this.formatearHora(
        tempMin.tiempo
      )})`,
      20,
      105
    );
    pdf.text(
      `Temperatura máxima: ${tempMax.valor.toFixed(2)} °C (${this.formatearHora(
        tempMax.tiempo
      )})`,
      110,
      95
    );
    pdf.text(`Tiempo transcurrido: ${duracion}`, 110, 105);

    // Línea divisoria
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.line(20, 110, pageWidth - 20, 110);

    // Lista de chequeo
    pdf.setFontSize(14);
    pdf.setTextColor(0, 51, 153); // Color azul
    pdf.text('Lista de Chequeo:', 20, 120);
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0); // Restaurar color de texto

    const checklistSeleccionados = formValues.chequeo || [];
    const colWidth = 90;

    this.checklistItems.forEach((item, i) => {
      const x = 20 + (i % 2) * colWidth;
      const y = 130 + Math.floor(i / 2) * 8;
      const check = checklistSeleccionados.includes(item) ? 'X' : ' ';
      pdf.text(`[${check}] ${item}`, x, y);
    });

    // Calcular la altura final de la lista de verificación
    const alturaFinalChecklist =
      130 + Math.ceil(this.checklistItems.length / 2) * 8;

    // Línea divisoria entre la lista de verificación y el gráfico
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.line(
      20,
      alturaFinalChecklist + 10,
      pageWidth - 20,
      alturaFinalChecklist + 10
    );

    // Capturar la gráfica y agregarla al PDF
    html2canvas(this.graficaCanvas.nativeElement)
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        try {
          pdf.addImage(imgData, 'PNG', 20, alturaFinalChecklist + 20, 170, 80);
        } catch (error) {
          console.error('Error al agregar la gráfica al PDF:', error);
          // Agregar un mensaje en lugar de la gráfica
          pdf.text(
            'No se pudo incluir la gráfica en el reporte',
            20,
            alturaFinalChecklist + 20
          );
        }

        // Agregar pie de página
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100); // Color gris
        pdf.text(
          'Generado con ColdSoft Ver. 1.0   ®',
          pageWidth - 23,
          pdf.internal.pageSize.height - 10,
          { align: 'right' }
        );
        pdf.setTextColor(0, 0, 0); // Restaurar color negro

        // Guardar el PDF
        const equipo = (formValues.equipo || 'sin_equipo').toString().trim().replace(/\s+/g, '_');
        const ahora = new Date();
        const fechaStr = `${ahora.getFullYear()}-${(ahora.getMonth()+1).toString().padStart(2,'0')}-${ahora.getDate().toString().padStart(2,'0')}`;
        const horaStr = this.formatearHora(ahora).replace(/:/g, '-');
        const nombreArchivo = `reporte_${equipo}_${fechaStr}-${horaStr}.pdf`;
        pdf.save(nombreArchivo);
      })
      .catch((error) => {
        console.error('Error al capturar la gráfica:', error);
        // Guardar el PDF incluso si hay un error con la gráfica
        const equipo = (formValues.equipo || 'sin_equipo').toString().trim().replace(/\s+/g, '_');
        const ahora = new Date();
        const fechaStr = `${ahora.getFullYear()}-${(ahora.getMonth()+1).toString().padStart(2,'0')}-${ahora.getDate().toString().padStart(2,'0')}`;
        const horaStr = this.formatearHora(ahora).replace(/:/g, '-');
        const nombreArchivo = `reporte_${equipo}_${fechaStr}-${horaStr}.pdf`;
        pdf.save(nombreArchivo);

      })
      .finally(() => {
        // Guardar el informe en la base de datos
        this.guardarInformeEnBaseDeDatos(formValues);
        
        // Borrar datos de la planta después de generar el PDF
        this.borrarDatosDespuesPDF(formValues.planta);
      });
  }

  private calcularDuracion(inicio: Date, fin: Date): string {
    const diff = fin.getTime() - inicio.getTime();
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${horas}h ${minutos}m`;
  }

  toggleChecklistItem(item: string): void {
    const chequeoControl = this.form.get('chequeo');
    const seleccionados = (chequeoControl?.value || []) as string[];

    if (seleccionados.includes(item)) {
      // Quitar el item
      const index = seleccionados.indexOf(item);
      seleccionados.splice(index, 1);
    } else {
      // Agregar el item
      seleccionados.push(item);
    }

    chequeoControl?.setValue(seleccionados);
  }

  isItemSelected(item: string): boolean {
    const seleccionados = this.form.get('chequeo')?.value || [];
    return seleccionados.includes(item);
  }

  // Método para determinar el eje Y apropiado según la unidad
  private getYAxisId(unidad: string, nombre?: string): string {
    if (unidad.includes('°C') || (nombre && (nombre.toLowerCase().includes('delta de t') || nombre.toLowerCase().includes('diferencia')))) {
      return 'y-temperature';
    } else if (unidad.includes('A')) {
      return 'y-current';
    } else {
      return 'y-temperature'; // Por defecto
    }
  }

  // Método para borrar datos después de generar el PDF
  /**
   * Guarda la información del informe en la base de datos
   * @param formValues Valores del formulario con la información del informe
   */
  private guardarInformeEnBaseDeDatos(formValues: any): void {
    console.log('💾 Guardando informe en la base de datos');

    if (!this.datosTemperatura || !this.datosTemperatura.series?.length) {
      console.error('No hay datos de temperatura disponibles para guardar');
      return;
    }

    // Identificar series por nombre (Gabinete, Ambiente, Corriente)
    const series = this.datosTemperatura.series;
    const serieGabinete = series.find(s => s.nombre.toLowerCase().includes('gabinete'));
    const serieAmbiente = series.find(s => s.nombre.toLowerCase().includes('ambiente'));
    const serieDiferencia = series.find(s => 
      s.nombre.toLowerCase().includes('diferencia') || 
      s.nombre.toLowerCase().includes('delta de t')
    );
    const serieCorriente = series.find(s => s.nombre.toLowerCase().includes('corriente'));

    const n = Math.min(
      serieGabinete?.valores.length || 0,
      serieAmbiente?.valores.length || 0,
      serieDiferencia?.valores.length || 0,
      serieCorriente?.valores.length || 0,
    );

    if (n === 0) {
      console.error('No se encontraron series válidas (Gabinete/Ambiente/Corriente) para guardar');
      return;
    }

    const tiempos = this.datosTemperatura.tiempos;
    const valores = Array.from({ length: n }).map((_, i) => ({
      fecha: this.formatearFecha(tiempos[i]),
      hora: this.formatearHora(tiempos[i]),
      gabinete: Number(serieGabinete?.valores[i] ?? 0),
      ambiente: Number(serieAmbiente?.valores[i] ?? 0),
      diferencia_temperatura: Number(serieDiferencia?.valores[i] ?? 0),
      corriente: Number(serieCorriente?.valores[i] ?? 0),
    }));

    // Formatear el checklist
    const checklistSeleccionados = formValues.chequeo || [];
    const checklistStr = checklistSeleccionados.length > 0
      ? JSON.stringify(checklistSeleccionados)
      : null;

    // Payload con cabecera + valores[] para guardado en cascada
    const toNullIfEmpty = (v: any) => (v === '' || v === undefined ? null : v);
    // Parseo seguro del límite evitando usar isNaN sobre un tipo null | number
    const parsed = Number(formValues.limite);
    const temperaturaLimite: number | null =
      formValues.limite === '' || formValues.limite === null || formValues.limite === undefined || Number.isNaN(parsed)
        ? null
        : parsed;

    const payload: any = {
      planta: formValues.planta,
      equipo: toNullIfEmpty(formValues.equipo),
      tecnico: toNullIfEmpty(formValues.tecnico),
      cliente: toNullIfEmpty(formValues.cliente),
      ubicacion: toNullIfEmpty(formValues.ubicacion),
      tipo_gas: toNullIfEmpty(formValues.tipo_gas),
      temperatura_limite: temperaturaLimite,
      checklist: checklistStr,
      valores,
    };

    // Llamar al servicio para guardar el informe con valores
    this.monitoreoService.crearInforme(payload).subscribe({
      next: (response) => {
        console.log('✅ Informe y valores guardados exitosamente:', response);
        // Mostrar mensaje de éxito
        Swal.fire({
          title: 'Éxito',
          text: 'El informe y sus valores han sido guardados en la base de datos',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        });
      },
      error: (error) => {
        console.error('❌ Error al guardar el informe y valores:', error);
        // Mostrar mensaje de error
        Swal.fire({
          title: 'Error',
          text: 'No se pudo guardar el informe y sus valores en la base de datos',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }
  
  private borrarDatosDespuesPDF(planta: string): void {
    // Flujo: intentar escribir al archivo seleccionado (File System Access API). Si no hay handle, pedirlo.
    const applyAndRefresh = (datosFiltrados: any[]) => {
      // Guardar en memoria/localStorage
      this.monitoreoService.csvFileService.setData(datosFiltrados);

      // Recargar el caché interno del servicio
      this.monitoreoService.recargarDatos().subscribe({
        next: () => {
          console.log(`Datos de la planta ${planta} borrados exitosamente`);
          // Actualizar la lista de plantas disponibles
          this.monitoreoService.getPlantasFormateadas().subscribe(
            (plantasFormateadas) => {
              this.plantasFormateadas = plantasFormateadas;
              this.plantas = plantasFormateadas.map((p) => p.codigo);

              // Si la planta actual ya no existe, limpiar el formulario
              if (!this.plantas.includes(planta)) {
                this.form.get('planta')?.setValue('');
                this.datosTemperatura = null;
                this.mostrarGrafica = false;
                this.datosListos = false;

                // Destruir el gráfico si existe
                if (this.temperaturaChart) {
                  this.temperaturaChart.destroy();
                  this.temperaturaChart = null;
                }
              }
            },
            (error) => {
              console.error('Error al actualizar lista de plantas:', error);
            }
          );
        },
        error: (error) => {
          console.error('Error al recargar datos después de borrar:', error);
        }
      });
    };

    this.monitoreoService.csvFileService.readCSVFile().subscribe({
      next: async (data) => {
        const datosFiltrados = (data || []).filter((row: any) => row.Planta !== planta);

        try {
          if (this.monitoreoService.csvFileService.hasWritableHandle()) {
            await this.monitoreoService.csvFileService.writeBackToSelectedFile(datosFiltrados as any);
            // Recargar desde el archivo para mantener sincronía
            this.monitoreoService.csvFileService.reloadFromHandle().subscribe({
              next: () => applyAndRefresh(datosFiltrados),
              error: (err) => {
                console.warn('No se pudo recargar desde archivo, aplicando solo en memoria:', err);
                applyAndRefresh(datosFiltrados);
              }
            });
          } else {
            // Sin handle: no pedir selección ni confirmaciones; aplicar en memoria/localStorage
            applyAndRefresh(datosFiltrados);
          }
        } catch (e) {
          console.error('Error general al escribir CSV:', e);
          // Fallback: mantener sólo memoria/localStorage
          applyAndRefresh(datosFiltrados);
        }
      },
      error: (error) => {
        console.error('Error al leer datos CSV en memoria:', error);
        alert('Error al borrar los datos de la planta del archivo CSV');
      }
    });
  }
}
