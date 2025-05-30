import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Chart, ChartConfiguration, ChartOptions } from 'chart.js';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { MonitoreoTemperaturaService, TemperatureData } from './monitoreo-temperatura.service';
import { Subscription, interval } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { LogoConst } from '../../assets/images/base64/logo.const';

interface DatoTemperatura {
  valor: number;
  tiempo: Date;
  indice: number;
}



@Component({
  selector: 'app-monitoreo-temperatura',
  templateUrl: './monitoreo-temperatura.component.html',
  styleUrls: ['./monitoreo-temperatura.component.scss']
})
export class MonitoreoTemperaturaComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('graficaCanvas') graficaCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('reporteContent') reporteContent!: ElementRef<HTMLDivElement>;

  form!: FormGroup;
  plantas: string[] = [];
  checklistItems: string[] = [];
  temperaturaChart: Chart | null = null;
  datosTemperatura: TemperatureData | null = null;
  mostrarGrafica = false;
  datosListos = false;

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
    this.plantas = Object.keys(this.monitoreoService.getCanales());
    this.checklistItems = this.monitoreoService.getChecklistItems();
    
    // Suscribirse a los cambios en el campo de equipo
    this.equipoSubscription = this.form.get('equipo')?.valueChanges
      .pipe(
        debounceTime(500), // Esperar 500ms después de la última tecla
        distinctUntilChanged() // Solo emitir cuando el valor cambie
      )
      .subscribe(() => {
        if (this.datosListos && this.mostrarGrafica) {
          this.actualizarGrafica();
        }
      }) ?? null;
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
  }

  private inicializarFormulario(): void {
    this.form = this.fb.group({
      planta: ['', Validators.required],
      equipo: [''],
      limite: [''],
      tecnico: [''],
      fecha: [new Date().toISOString().split('T')[0]],
      cliente: [''],
      ubicacion: [''],
      chequeo: this.fb.array([])
    });
  }

  private reiniciarFormulario(mantenerPlanta: boolean = false): void {
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
    
    // Obtener los datos iniciales
    this.obtenerDatosPlanta(planta);
    
    // Configurar la actualización automática cada 30 segundos
    this.actualizacionAutomatica = interval(this.INTERVALO_ACTUALIZACION).subscribe(() => {
      this.obtenerDatosPlanta(planta, false);
    });
  }

  private obtenerDatosPlanta(planta: string, mostrarError: boolean = true): void {
    this.monitoreoService.obtenerDatos(planta).subscribe(
      data => {
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
      error => {
        console.error('Error al obtener datos:', error);
        if (mostrarError) {
          alert('Error al obtener datos de temperatura');
        }
      }
    );
  }

  // Métodos para obtener información de temperatura
  obtenerUltimaTemperatura(): DatoTemperatura {
    if (!this.datosTemperatura || this.datosTemperatura.temperaturas.length === 0) {
      return { valor: 0, tiempo: new Date(), indice: -1 };
    }
    
    const { tiempos, temperaturas } = this.datosTemperatura;
    const ultimoIndice = temperaturas.length - 1;
    
    return {
      valor: temperaturas[ultimoIndice],
      tiempo: tiempos[ultimoIndice],
      indice: ultimoIndice
    };
  }

  obtenerTemperaturaMinima(): DatoTemperatura {
    if (!this.datosTemperatura || this.datosTemperatura.temperaturas.length === 0) {
      return { valor: 0, tiempo: new Date(), indice: -1 };
    }
    
    const { tiempos, temperaturas } = this.datosTemperatura;
    let minValor = Number.MAX_VALUE;
    let minIndice = 0;
    
    temperaturas.forEach((temp, i) => {
      if (temp < minValor) {
        minValor = temp;
        minIndice = i;
      }
    });
    
    return {
      valor: minValor,
      tiempo: tiempos[minIndice],
      indice: minIndice
    };
  }

  obtenerTemperaturaMaxima(): DatoTemperatura {
    if (!this.datosTemperatura || this.datosTemperatura.temperaturas.length === 0) {
      return { valor: 0, tiempo: new Date(), indice: -1 };
    }
    
    const { tiempos, temperaturas } = this.datosTemperatura;
    let maxValor = Number.MIN_VALUE;
    let maxIndice = 0;
    
    temperaturas.forEach((temp, i) => {
      if (temp > maxValor) {
        maxValor = temp;
        maxIndice = i;
      }
    });
    
    return {
      valor: maxValor,
      tiempo: tiempos[maxIndice],
      indice: maxIndice
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
    
    const { tiempos, temperaturas } = this.datosTemperatura;
    
    // Formatear los tiempos para mostrar solo la hora
    const formatoHora = tiempos.map(tiempo => {
      const fecha = new Date(tiempo);
      return `${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}`;
    });
    
    const limite = this.form.get('limite')?.value ? parseFloat(this.form.get('limite')?.value) : null;
    const activo = this.form.get('equipo')?.value;
        
    // Configuración del gráfico
    const datasets: any[] = [
      {
        label: 'Temperatura',
        data: temperaturas,
        borderColor: 'green',
        backgroundColor: 'rgba(0, 128, 0, 0.1)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: 'green',
        fill: true,
        tension: 0.1
      }
    ];
    
    // Agregar línea de límite si se especificó
    if (limite !== null) {
      datasets.push({
        label: `Límite inferior: ${limite}°C`,
        data: Array(tiempos.length).fill(limite),
        borderColor: 'red',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      });
    }
    
    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: formatoHora,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Temperatura - Activo ${ this.form.get('equipo')?.value || 'Sin número' }`,
            font: {
              size: 16
            }
          },
          legend: {
            position: 'top'
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Hora'
            },
            ticks: {
              maxRotation: 90,
              minRotation: 90
            }
          },
          y: {
            title: {
              display: true,
              text: 'Temperatura (°C)'
            },
            grid: {
              drawOnChartArea: true
            }
          }
        }
      }
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

  // Método para actualizar manualmente los datos
  actualizarDatosManualmente(): void {
    const planta = this.form.get('planta')?.value;
    if (planta) {
      this.obtenerDatosPlanta(planta);
    }
  }

  deleteData(): void {
    const planta = this.form.get('planta')?.value;
    if (planta) {
      this.monitoreoService.deleteData(planta).subscribe(
        () => {
          this.obtenerDatosPlanta(planta);
        },
        error => {
          console.error('Error al borrar datos:', error);
        }
      );
    }
  }

  generarPDF(): void {
    if (!this.reporteContent || !this.datosTemperatura) return;
    
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
    pdf.text(`Reporte de Temperatura - Activo ${formValues.equipo || 'Sin número'}`, pageWidth / 2, 50, { align: 'center' });
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
    
    pdf.text(`Última temperatura: ${tempUltima.valor.toFixed(2)} °C (${this.formatearHora(tempUltima.tiempo)})`, 20, 95);
    pdf.text(`Temperatura mínima: ${tempMin.valor.toFixed(2)} °C (${this.formatearHora(tempMin.tiempo)})`, 20, 105);
    pdf.text(`Temperatura máxima: ${tempMax.valor.toFixed(2)} °C (${this.formatearHora(tempMax.tiempo)})`, 110, 95);
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
    const alturaFinalChecklist = 130 + Math.ceil(this.checklistItems.length / 2) * 8;
    
    // Línea divisoria entre la lista de verificación y el gráfico
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.line(20, alturaFinalChecklist + 10, pageWidth - 20, alturaFinalChecklist + 10);
    
    // Capturar la gráfica y agregarla al PDF
    html2canvas(this.graficaCanvas.nativeElement).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      try {
        pdf.addImage(imgData, 'PNG', 20, alturaFinalChecklist + 20, 170, 80);
      } catch (error) {
        console.error('Error al agregar la gráfica al PDF:', error);
        // Agregar un mensaje en lugar de la gráfica
        pdf.text('No se pudo incluir la gráfica en el reporte', 20, alturaFinalChecklist + 20);
      }
      
    // Agregar pie de página
      // Agregar pie de página
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100); // Color gris
      pdf.text('Generado con ColdSoft Ver. 1.0   ®', pageWidth - 23, pdf.internal.pageSize.height - 10, { align: 'right' });
      pdf.setTextColor(0, 0, 0); // Restaurar color negro

      // Guardar el PDF
      const nombreArchivo = `reporte_${formValues.planta.replace(' ', '_')}_${new Date().toISOString().slice(0, 19).replace(/:/g, '')}.pdf`;
      pdf.save(nombreArchivo);
    }).catch(error => {
      console.error('Error al capturar la gráfica:', error);
      // Guardar el PDF incluso si hay un error con la gráfica
      const nombreArchivo = `reporte_${formValues.planta.replace(' ', '_')}_${new Date().toISOString().slice(0, 19).replace(/:/g, '')}.pdf`;
      pdf.save(nombreArchivo);
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
}