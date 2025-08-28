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
  InformeItem,
  MonitoreoTemperaturaHistoryService,
  TemperatureData,
} from './monitoreo-temperatura-history.service';
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
  selector: 'app-monitoreo-temperatura-history',
  templateUrl: './monitoreo-temperatura-history.component.html',
  styleUrls: ['./monitoreo-temperatura-history.component.scss'],
})
export class MonitoreoTemperaturaHistoryComponent
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

  // Variables del slider
  disabled = false;
  max = 30;
  min = -50;
  showTicks = true;
  step = 1;
  thumbLabel = true;
  value = 0;

  // Datos de informes
  informes: InformeItem[] = [];
  cargandoInformes = false;
  errorInformes = false;

  // Suscripciones
  private formSubscription: Subscription | null = null;
  private informesSubscription: Subscription | null = null;
  private equipoSubscription: Subscription | null = null;
  private actualizacionAutomatica: Subscription | null = null;
  private readonly INTERVALO_ACTUALIZACION = 30000; // 30 segundos en milisegundos

  // Logo en formato base64 para el PDF
  private readonly logoBase64 = LogoConst._LOGO;

  constructor(
    private fb: FormBuilder,
    private monitoreoService: MonitoreoTemperaturaHistoryService,
    private cdr: ChangeDetectorRef
  ) {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    this.inicializarFormulario();
    this.configurarSuscripciones();
    this.cargarChecklistItems();

    // Obtener el límite de temperatura del localStorage si existe
    this.form
      .get('limite')
      ?.setValue(
        localStorage.getItem('limiteTemperatura')
          ? Number(localStorage.getItem('limiteTemperatura'))
          : null
      );

    // Obtener el valor del slider del localStorage si existe
    this.value =
      Number(localStorage.getItem('valorSlider')) ||
      (this.form.get('limite')?.value as number) ||
      0;

    // Cargar datos históricos automáticamente
    this.cargarDatosHistoricos();
    
    // Cargar informes desde la API
    this.cargarInformes();
  }

  // El método configurarSuscripciones() se ha movido más abajo en el archivo

  ngAfterViewInit(): void {
    // Si ya tenemos datos cuando la vista se inicializa, actualizamos la gráfica
    if (this.datosListos) {
      this.actualizarGrafica();
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }
    
    if (this.informesSubscription) {
      this.informesSubscription.unsubscribe();
    }
    
    if (this.equipoSubscription) {
      this.equipoSubscription.unsubscribe();
    }
    
    // Cancelar actualización automática si existe
    if (this.actualizacionAutomatica) {
      this.actualizacionAutomatica.unsubscribe();
    }
  }

  onSliderChange(value: any): void {
    this.form.get('limite')?.setValue(value);
    this.cdr.detectChanges();
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
      chequeo: this.fb.array([]),
    });
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

    // Obtener la primera serie de temperatura disponible
    const temperaturaSeries = this.datosTemperatura.series.find(
      (s) =>
        s.unidad.includes('°C') ||
        s.unidad.includes('°') ||
        s.unidad.includes('')
    );
    console.log('🌡️ Serie de temperatura encontrada:', temperaturaSeries);

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

    // Obtener la primera serie de temperatura disponible
    const temperaturaSeries = this.datosTemperatura.series.find((s) =>
      s.unidad.includes('°C')
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

    // Obtener la primera serie de temperatura disponible
    const temperaturaSeries = this.datosTemperatura.series.find((s) =>
      s.unidad.includes('°C')
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
    if (!this.datosTemperatura || this.datosTemperatura.tiempos.length < 2) {
      return '0h 0m';
    }

    const { tiempos } = this.datosTemperatura;
    return this.calcularDuracion(tiempos[0], tiempos[tiempos.length - 1]);
  }

  formatearHora(fecha: Date): string {
    if (!fecha) return '';

    const horas = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');
    const segundos = fecha.getSeconds().toString().padStart(2, '0');

    return `${horas}:${minutos}:${segundos}`;
  }

  actualizarGrafica(): void {
    if (!this.datosTemperatura || !this.graficaCanvas) return;

    // Destruir el gráfico existente si hay uno
    if (this.temperaturaChart) {
      this.temperaturaChart.destroy();
      this.temperaturaChart = null;
    }

    const { tiempos, series } = this.datosTemperatura;

    // Formatear los tiempos para mostrar solo la hora
    const formatoHora = tiempos.map((tiempo) => {
      const fecha = new Date(tiempo);
      return `${fecha.getHours().toString().padStart(2, '0')}:${fecha
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
    });

    const limite = this.form.get('limite')?.value
      ? parseFloat(this.form.get('limite')?.value)
      : null;
    const activo = this.form.get('equipo')?.value;

    // Configuración del gráfico con múltiples series
    const datasets: any[] = [];

    // Colores para las diferentes series
    const colors = [
      { border: 'rgb(75, 192, 192)', background: 'rgba(75, 192, 192, 0.1)' }, // Gabinete
      { border: 'rgb(255, 99, 132)', background: 'rgba(255, 99, 132, 0.1)' }, // Ambiente
      { border: 'rgb(54, 162, 235)', background: 'rgba(54, 162, 235, 0.1)' }, // Corriente
      { border: 'rgb(255, 205, 86)', background: 'rgba(255, 205, 86, 0.1)' }, // Extra
      { border: 'rgb(153, 102, 255)', background: 'rgba(153, 102, 255, 0.1)' }, // Extra
    ];

    // Agregar cada serie de datos
    series.forEach((serie, index) => {
      datasets.push({
        label: `${serie.nombre} (${serie.unidad})`,
        data: serie.valores,
        borderColor: colors[index % colors.length].border,
        backgroundColor: colors[index % colors.length].background,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: colors[index % colors.length].border,
        fill: false,
        tension: 0.1,
        yAxisID: this.getYAxisId(serie.unidad),
      });
    });

    // Agregar línea de límite si se especificó (solo para temperaturas)
    if (limite !== null) {
      const temperaturaSeries = series.find((s) => s.unidad.includes('°C'));
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
            grid: {
              drawOnChartArea: true,
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
    this.monitoreoService.csvFileService.selectCSVFile().subscribe({
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

  // Método para cargar datos históricos de temperatura
  cargarDatosHistoricos(): void {
    console.log('Cargando datos históricos de temperatura...');
    
    // Intentar cargar el archivo CSV automáticamente primero
    this.cargarArchivoCSVAutomaticamente();
    
    // Cargar informes desde la API
    this.cargarInformes();
    
    console.log('Carga de datos históricos completada');
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
        const nombrePlanta = this.monitoreoService.formatearNombrePlanta(
          formValues.planta
        );
        const nombreArchivo = `reporte_${nombrePlanta.replace(
          ' ',
          '_'
        )}_${new Date().toISOString().slice(0, 19).replace(/:/g, '')}.pdf`;
        pdf.save(nombreArchivo);
      })
      .catch((error) => {
        console.error('Error al capturar la gráfica:', error);
        // Guardar el PDF incluso si hay un error con la gráfica
        const nombrePlanta = this.monitoreoService.formatearNombrePlanta(
          formValues.planta
        );
        const nombreArchivo = `reporte_${nombrePlanta.replace(
          ' ',
          '_'
        )}_${new Date().toISOString().slice(0, 19).replace(/:/g, '')}.pdf`;
        pdf.save(nombreArchivo);

      });
      // Borrar datos de la planta después de generar el PDF
      this.borrarDatosDespuesPDF(formValues.planta);
  }

  private calcularDuracion(inicio: Date, fin: Date): string {
    const diff = fin.getTime() - inicio.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
  
  /**
   * Carga los informes desde la API
   * @param planta Código de planta opcional para filtrar
   * @param fecha Fecha opcional para filtrar
   */
  cargarInformes(planta?: string, fecha?: string): void {
    this.cargandoInformes = true;
    this.errorInformes = false;
    
    this.informesSubscription = this.monitoreoService.getInformesPorPlantaFecha(planta, fecha)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.informes = response.data;
            console.log('📊 Informes cargados:', this.informes.length);
          } else {
            this.informes = [];
            console.error('❌ Error al cargar informes: Respuesta no exitosa');
            this.errorInformes = true;
          }
          this.cargandoInformes = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Error al cargar informes:', error);
          this.informes = [];
          this.cargandoInformes = false;
          this.errorInformes = true;
          this.cdr.detectChanges();
          
          Swal.fire({
            title: 'Error',
            text: 'No se pudieron cargar los informes. Por favor, intente nuevamente.',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      });
  }
  
  /**
   * Filtra los informes según los criterios del formulario
   */
  filtrarInformes(): void {
    const planta = this.form.get('planta')?.value;
    const fecha = this.form.get('fecha')?.value;
    
    this.cargarInformes(planta, fecha);
  }
  
  /**
   * Guarda el informe actual en la base de datos
   */
  guardarInforme(): void {
    if (!this.form.valid) {
      Swal.fire({
        title: 'Formulario incompleto',
        text: 'Por favor complete todos los campos requeridos.',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }
    
    const formValues = this.form.value;
    const checklistSeleccionados = formValues.chequeo || [];
    
    const nuevoInforme: Partial<InformeItem> = {
      fecha: formValues.fecha,
      planta: formValues.planta,
      hora: new Date().toTimeString().split(' ')[0],
      equipo: formValues.equipo,
      tecnico: formValues.tecnico,
      cliente: formValues.cliente,
      ubicacion: formValues.ubicacion,
      temperatura_limite: formValues.limite,
      // Estos valores deberían venir de los datos de temperatura actuales
      gabinete: '0.00',  // Reemplazar con datos reales
      ambiente: '0.00',  // Reemplazar con datos reales
      corriente: '0.00',  // Reemplazar con datos reales
      checklist: checklistSeleccionados.length > 0 ? JSON.stringify(checklistSeleccionados) : null
    };
    
    this.monitoreoService.crearInforme(nuevoInforme)
      .subscribe({
        next: (response) => {
          console.log('✅ Informe guardado correctamente:', response);
          
          Swal.fire({
            title: 'Éxito',
            text: 'El informe se ha guardado correctamente.',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
          
          // Recargar la lista de informes
          this.cargarInformes();
        },
        error: (error) => {
          console.error('❌ Error al guardar informe:', error);
          
          Swal.fire({
            title: 'Error',
            text: 'No se pudo guardar el informe. Por favor, intente nuevamente.',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      });
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
  private getYAxisId(unidad: string): string {
    if (unidad.includes('°C')) {
      return 'y-temperature';
    } else if (unidad.includes('A')) {
      return 'y-current';
    } else {
      return 'y-temperature'; // Por defecto
    }
  }

  /**
   * Carga los elementos de la lista de verificación desde el servicio
   */
  private cargarChecklistItems(): void {
    this.checklistItems = this.monitoreoService.getChecklistItems();
    console.log('✅ Lista de verificación cargada:', this.checklistItems.length, 'elementos');
  }

  // Método para borrar datos después de generar el PDF
  private borrarDatosDespuesPDF(planta: string): void {
    this.monitoreoService.borrarDatosPlanta(planta).subscribe({
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
        console.error('Error al borrar datos de la planta:', error);
        alert('Error al borrar los datos de la planta del archivo CSV');
      },
    });
  }

  /**
   * Configura las suscripciones del componente para reaccionar a cambios
   * en el formulario y actualizar datos automáticamente
   */
  private configurarSuscripciones(): void {
    // Suscripción a cambios en el campo 'limite' del formulario
    const limiteControl = this.form.get('limite');
    if (limiteControl) {
      this.formSubscription = limiteControl.valueChanges
        .pipe(
          debounceTime(300),
          distinctUntilChanged()
        )
        .subscribe(valor => {
          if (valor !== null && valor !== undefined) {
            // Guardar el valor en localStorage
            localStorage.setItem('limiteTemperatura', valor.toString());
            localStorage.setItem('valorSlider', valor.toString());
            this.value = valor;
            
            // Actualizar gráfica si hay datos
            if (this.datosListos) {
              this.actualizarGrafica();
            }
          }
        });
    }
    
    // Suscripción a cambios en el campo 'equipo' del formulario
    const equipoControl = this.form.get('equipo');
    if (equipoControl) {
      this.equipoSubscription = equipoControl.valueChanges
        .subscribe(() => {
          // Actualizar gráfica si hay datos
          if (this.datosListos) {
            this.actualizarGrafica();
          }
        });
    }
  }
}
