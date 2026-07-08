import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { environment } from 'environments/environment';
import { MonitoringActivoSearchItem, MonitoringService } from './monitoring.service';

export interface ActivoDialogResult {
  activo_id: string;
  equipo_placa?: string | null;
  equipo_modelo?: string | null;
  limite_inferior_celsius?: number | null;
  limite_superior_celsius?: number | null;
  ubicacion?: string | null;
  observaciones?: string | null;
}

type ActivoItem = MonitoringActivoSearchItem;

export interface ActivoDialogData {
  currentActivoId?: string;
  equipo_placa?: string | null;
  equipo_modelo?: string | null;
  limite_inferior_celsius?: number | null;
  limite_superior_celsius?: number | null;
  ubicacion?: string | null;
  observaciones?: string | null;
}

@Component({
  template: `
    <h2 mat-dialog-title>Equipo e instalación</h2>
    <mat-dialog-content>
      <!-- SECCIÓN 1: Buscar / crear activo -->
      <h3>Activo (equipo)</h3>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Buscar activo por ID, descripción o fabricante</mat-label>
        <input
          matInput
          [formControl]="searchCtrl"
          placeholder="Escriba al menos 4 caracteres"
          autocomplete="off"
        />
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>

      <div *ngIf="!searched && !loading && data?.currentActivoId && data.currentActivoId.length < 4" class="current-badge">
        Activo actual: <strong>{{ data.currentActivoId }}</strong>
      </div>

      <div *ngIf="loading" class="loading">Buscando...</div>

      <div *ngIf="results.length > 0" class="results-list">
        <mat-radio-group [(ngModel)]="selectedId">
          <mat-list-item
            *ngFor="let item of results"
            class="result-item"
            [class.selected]="selectedId === item.id"
          >
            <mat-radio-button [value]="item.id" class="radio-btn" (change)="onActivoSelect(item.id)">
              <strong>{{ item.id }}</strong>
              <span class="text-muted" *ngIf="item.descripcion"> — {{ item.descripcion }}</span>
              <br />
              <small class="text-muted">
                Fab: {{ item.fabricante || '—' }} | Cap: {{ item.capacidad ?? '—' }} | Cliente: {{ item.nombre_cliente || '—' }}
              </small>
            </mat-radio-button>
          </mat-list-item>
        </mat-radio-group>
      </div>

      <div *ngIf="searched && results.length === 0 && !loading" class="no-results">
        <p>No se encontraron activos con ese criterio.</p>
        <button mat-stroked-button color="primary" type="button" (click)="showCreateActivo = true">
          + Agregar nuevo activo
        </button>
      </div>

      <div *ngIf="showCreateActivo" class="sub-form">
        <h4>Nuevo activo</h4>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Activo (NInventar) *</mat-label>
          <input matInput [(ngModel)]="newActivo.id" placeholder="Ej: MCAR3386" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descripción</mat-label>
          <input matInput [(ngModel)]="newActivo.descripcion" placeholder="Ej: CARRO HELADERO" />
        </mat-form-field>
        <div class="row">
          <div class="col">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Fabricante</mat-label>
              <input matInput [(ngModel)]="newActivo.fabricante" />
            </mat-form-field>
          </div>
          <div class="col">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Capacidad</mat-label>
              <input matInput type="number" [(ngModel)]="newActivo.capacidad" />
            </mat-form-field>
          </div>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre del cliente</mat-label>
          <input matInput [(ngModel)]="newActivo.nombre_cliente" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Establecimiento comercial</mat-label>
          <input matInput [(ngModel)]="newActivo.establecimiento_comercial" />
        </mat-form-field>
      </div>

      <!-- SECCIÓN 2: Datos de instalación -->
      <h3>Datos de instalación</h3>
      <div class="sub-form">
        <div class="row">
          <div class="col">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Límite inferior (°C)</mat-label>
              <input matInput type="number" [(ngModel)]="instLimiteInferior" placeholder="Ej: 2" />
            </mat-form-field>
          </div>
          <div class="col">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Límite superior (°C)</mat-label>
              <input matInput type="number" [(ngModel)]="instLimiteSuperior" placeholder="Ej: 8" />
            </mat-form-field>
          </div>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Ubicación</mat-label>
          <input matInput [(ngModel)]="instUbicacion" placeholder="Ej: Cuarto frío #3" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Observaciones</mat-label>
          <textarea matInput [(ngModel)]="instObservaciones" placeholder="Notas adicionales"></textarea>
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close()">Cancelar</button>
      <button
        mat-raised-button
        color="primary"
        type="button"
        [disabled]="!canConfirm()"
        (click)="confirm()"
      >
        Guardar
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .full-width { width: 100%; }
      .loading, .no-results { padding: 1rem; text-align: center; color: #666; }
      .current-badge { padding: 0.5rem 1rem; text-align: center; color: #17375e; background: #e8f0fe; border-radius: 8px; margin: 0.5rem 0; }
      .results-list { max-height: 220px; overflow-y: auto; }
      .result-item { padding: 0.3rem 0; border-bottom: 1px solid #eee; }
      .result-item.selected { background: #e3f2fd; }
      .result-item .radio-btn { width: 100%; }
      .sub-form { margin-top: 0.5rem; padding: 0.75rem; background: #f8fafc; border-radius: 8px; }
      h3 { margin: 1rem 0 0.5rem; font-size: 1rem; color: #17375e; }
      h4 { margin: 0.5rem 0; font-size: 0.9rem; color: #555; }
      .text-muted { color: #888; }
    `,
  ],
})
export class MonitoringActivoDialogComponent implements OnInit {
  searchCtrl = this.fb.control('');
  results: ActivoItem[] = [];
  selectedId = '';
  loading = false;
  searched = false;
  showCreateActivo = false;

  newActivo: Partial<ActivoItem> = {
    id: '',
    descripcion: '',
    fabricante: '',
    capacidad: null,
    cliente_id: '',
    nombre_cliente: '',
    establecimiento_comercial: '',
  };

  // Installation fields
  instEquipoPlaca = '';
  instEquipoModelo = '';
  instLimiteInferior: number | null = null;
  instLimiteSuperior: number | null = null;
  instUbicacion = '';
  instObservaciones = '';

  constructor(
    public dialogRef: MatDialogRef<MonitoringActivoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ActivoDialogData,
    private readonly fb: FormBuilder,
    private readonly http: HttpClient,
    private readonly monitoringService: MonitoringService,
  ) {
    this.selectedId = data?.currentActivoId ?? '';
    this.instEquipoPlaca = data?.equipo_placa ?? '';
    this.instEquipoModelo = data?.equipo_modelo ?? '';
    this.instLimiteInferior = data?.limite_inferior_celsius ?? null;
    this.instLimiteSuperior = data?.limite_superior_celsius ?? null;
    this.instUbicacion = data?.ubicacion ?? '';
    this.instObservaciones = data?.observaciones ?? '';
  }

  ngOnInit(): void {
    this.searchCtrl.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((term) => {
          const q = (term ?? '').trim();
          if (q.length < 4) {
            this.results = [];
            this.searched = false;
            this.loading = false;
            return of(null);
          }
          this.loading = true;
          return this.monitoringService.searchActivos(q).pipe(
            catchError(() => of([])),
          );
        }),
      )
      .subscribe({
        next: (items) => {
          if (items === null) return;
          this.results = items ?? [];
          this.searched = true;
          this.loading = false;
        },
        error: () => {
          this.results = [];
          this.searched = true;
          this.loading = false;
        },
      });

    // Auto-buscar si ya hay un activo asignado
    const currentId = this.data?.currentActivoId;
    if (currentId && currentId.length >= 4) {
      this.searchCtrl.setValue(currentId);
    }
  }

  onActivoSelect(id: string): void {
    this.selectedId = id;
    // Auto-fill equipo_placa with the selected activo id
    this.instEquipoPlaca = id;
  }

  canConfirm(): boolean {
    return true; // Always can save (installation fields are optional)
  }

  confirm(): void {
    const doSave = (activoId: string) => {
      this.dialogRef.close({
        activo_id: activoId || null,
        equipo_placa: this.instEquipoPlaca || null,
        equipo_modelo: this.instEquipoModelo || null,
        limite_inferior_celsius: this.instLimiteInferior,
        limite_superior_celsius: this.instLimiteSuperior,
        ubicacion: this.instUbicacion || null,
        observaciones: this.instObservaciones || null,
      } as ActivoDialogResult);
    };

    if (this.showCreateActivo && this.newActivo.id?.trim()) {
      // Create activo first, then save
      this.http
        .post(`${environment.apiUrl}/activos`, {
          id: this.newActivo.id,
          descripcion: this.newActivo.descripcion || null,
          fabricante: this.newActivo.fabricante || null,
          capacidad: this.newActivo.capacidad || null,
          cliente_id: this.newActivo.cliente_id || null,
          nombre_cliente: this.newActivo.nombre_cliente || null,
          establecimiento_comercial: this.newActivo.establecimiento_comercial || null,
        })
        .subscribe({
          next: () => doSave(this.newActivo.id!),
          error: () => doSave(this.newActivo.id!),
        });
    } else if (this.selectedId) {
      doSave(this.selectedId);
    } else {
      // No activo selected, just save installation fields
      doSave('');
    }
  }
}
