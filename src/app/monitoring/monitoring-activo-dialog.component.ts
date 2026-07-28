import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ActivoInfo, MonitoringClient } from './monitoring.models';
import { MonitoringActivoSearchItem, MonitoringService } from './monitoring.service';

export interface ActivoDialogResult {
  activo_id: string;
  equipo_placa?: string | null;
  equipo_modelo?: string | null;
  limite_inferior_celsius?: number | null;
  limite_superior_celsius?: number | null;
  ubicacion?: string | null;
  observaciones?: string | null;
  kwhPrice?: number | null;
  createdActivo?: boolean;
}

type ActivoItem = MonitoringActivoSearchItem;

export interface ActivoDialogData {
  deviceId: string;
  sessionId: number;
  currentActivoId?: string;
  activo?: ActivoInfo | null;
  equipo_placa?: string | null;
  equipo_modelo?: string | null;
  limite_inferior_celsius?: number | null;
  limite_superior_celsius?: number | null;
  ubicacion?: string | null;
  observaciones?: string | null;
  kwhPrice?: number | null;
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

      <div *ngIf="!searched && !loading && shortCurrentActivoId" class="current-badge">
        Activo actual: <strong>{{ shortCurrentActivoId }}</strong>
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

      <div *ngIf="searched && results.length === 0 && !loading && !showEditActivo" class="no-results">
        <p>No se encontraron activos con ese criterio.</p>
        <button
          *ngIf="!selectedId"
          mat-stroked-button
          color="primary"
          type="button"
          (click)="enableCreateActivo()"
        >
          + Agregar nuevo activo
        </button>
      </div>

      <div *ngIf="showCreateActivo" class="sub-form">
        <h4>Nuevo activo</h4>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Activo (NInventar) *</mat-label>
          <input
            matInput
            [ngModel]="newActivo.id"
            (ngModelChange)="onNewActivoIdChange($event)"
            placeholder="Ej: MCAR3386"
          />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descripción</mat-label>
          <input
            matInput
            [ngModel]="newActivo.descripcion"
            (ngModelChange)="onNewActivoTextChange('descripcion', $event)"
            placeholder="Ej: CARRO HELADERO"
          />
        </mat-form-field>
        <div class="row">
          <div class="col">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Fabricante</mat-label>
              <input
                matInput
                [ngModel]="newActivo.fabricante"
                (ngModelChange)="onNewActivoTextChange('fabricante', $event)"
              />
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
          <mat-label>Cliente *</mat-label>
          <mat-select
            [(ngModel)]="selectedClientId"
            [disabled]="loadingClients"
            (selectionChange)="onClientSelect($event.value)"
          >
            <mat-option *ngFor="let client of clients" [value]="client.id">
              {{ client.name }}<span *ngIf="client.nit"> — NIT: {{ client.nit }}</span>
            </mat-option>
          </mat-select>
          <mat-hint *ngIf="loadingClients">Cargando clientes...</mat-hint>
        </mat-form-field>
        <div *ngIf="clientLoadError" class="error-message">{{ clientLoadError }}</div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Establecimiento comercial</mat-label>
          <input
            matInput
            [ngModel]="newActivo.establecimiento_comercial"
            (ngModelChange)="onNewActivoTextChange('establecimiento_comercial', $event)"
          />
        </mat-form-field>
        <div *ngIf="saveError" class="error-message">{{ saveError }}</div>
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
          <mat-label>Valor del kWh</mat-label>
          <span matPrefix class="currency-prefix">$</span>
          <input matInput type="number" min="0" step="0.01" [(ngModel)]="kwhPrice" placeholder="0.00" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Ubicación</mat-label>
          <input matInput [(ngModel)]="instUbicacion" placeholder="Ej: Cuarto frío #3" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Observaciones</mat-label>
          <textarea matInput [(ngModel)]="instObservaciones" placeholder="Notas adicionales"></textarea>
        </mat-form-field>
      </div>

      <div *ngIf="showEditActivo" class="sub-form">
        <h4>Editar activo</h4>
        <div class="current-badge">
          Activo seleccionado: <strong>{{ selectedId }}</strong>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descripción</mat-label>
          <input
            matInput
            [ngModel]="existingActivo.descripcion"
            (ngModelChange)="onExistingActivoTextChange('descripcion', $event)"
            placeholder="Ej: CARRO HELADERO"
          />
        </mat-form-field>
        <div class="row">
          <div class="col">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Fabricante</mat-label>
              <input
                matInput
                [ngModel]="existingActivo.fabricante"
                (ngModelChange)="onExistingActivoTextChange('fabricante', $event)"
              />
            </mat-form-field>
          </div>
          <div class="col">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Capacidad</mat-label>
              <input matInput type="number" [(ngModel)]="existingActivo.capacidad" />
            </mat-form-field>
          </div>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Establecimiento comercial</mat-label>
          <input
            matInput
            [ngModel]="existingActivo.establecimiento_comercial"
            (ngModelChange)="onExistingActivoTextChange('establecimiento_comercial', $event)"
          />
        </mat-form-field>
        <div *ngIf="saveError" class="error-message">{{ saveError }}</div>
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
        {{ saving ? 'Guardando...' : 'Guardar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .full-width { width: 100%; }
      .loading, .no-results { padding: 1rem; text-align: center; color: #666; }
      .error-message { margin-top: 0.5rem; color: #c62828; font-size: 0.85rem; }
      .current-badge { padding: 0.5rem 1rem; text-align: center; color: #17375e; background: #e8f0fe; border-radius: 8px; margin: 0.5rem 0; }
      .results-list { max-height: 220px; overflow-y: auto; }
      .result-item { padding: 0.3rem 0; border-bottom: 1px solid #eee; }
      .result-item.selected { background: #e3f2fd; }
      .result-item .radio-btn { width: 100%; }
      .sub-form { margin-top: 0.5rem; padding: 0.75rem; background: #f8fafc; border-radius: 8px; }
      h3 { margin: 1rem 0 0.5rem; font-size: 1rem; color: #17375e; }
      h4 { margin: 0.5rem 0; font-size: 0.9rem; color: #555; }
      .currency-prefix { display: inline-flex; margin-left: 0.5rem; margin-right: 0.35rem; }
      .text-muted { color: #888; }
    `,
  ],
})
export class MonitoringActivoDialogComponent implements OnInit {
  searchCtrl = this.fb.control('');
  results: ActivoItem[] = [];
  selectedId = '';

  /** Activo ID actual si tiene menos de 4 caracteres (no se puede auto-buscar) */
  get shortCurrentActivoId(): string | null {
    const id = this.data?.currentActivoId;
    return id && id.length < 4 ? id : null;
  }
  loading = false;
  searched = false;
  showCreateActivo = false;
  saving = false;
  saveError = '';
  lastSearchTerm = '';
  clients: MonitoringClient[] = [];
  loadingClients = false;
  clientLoadError = '';
  selectedClientId: number | null = null;

  newActivo: Partial<ActivoItem> = {
    id: '',
    descripcion: '',
    fabricante: '',
    capacidad: null,
    cliente_id: '',
    nombre_cliente: '',
    establecimiento_comercial: '',
  };

  existingActivo: Partial<ActivoItem> = {
    id: '',
    descripcion: '',
    fabricante: '',
    capacidad: null,
    nombre_cliente: '',
    establecimiento_comercial: '',
  };

  get showEditActivo(): boolean {
    return Boolean(this.data?.currentActivoId && this.selectedId && !this.showCreateActivo);
  }

  // Installation fields
  instEquipoPlaca = '';
  instEquipoModelo = '';
  instLimiteInferior: number | null = null;
  instLimiteSuperior: number | null = null;
  instUbicacion = '';
  instObservaciones = '';
  kwhPrice: number | null = null;

  constructor(
    public dialogRef: MatDialogRef<MonitoringActivoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ActivoDialogData,
    private readonly fb: FormBuilder,
    private readonly monitoringService: MonitoringService,
  ) {
    this.selectedId = data?.currentActivoId ?? '';
    if (data?.activo) {
      this.setExistingActivo({
        id: data.activo.id,
        descripcion: data.activo.descripcion,
        fabricante: data.activo.fabricante,
        capacidad: data.activo.capacidad,
        nombre_cliente: data.activo.nombre_cliente,
        establecimiento_comercial: data.activo.establecimiento_comercial,
      });
    }
    this.instEquipoPlaca = data?.equipo_placa ?? '';
    this.instEquipoModelo = data?.equipo_modelo ?? '';
    this.instLimiteInferior = data?.limite_inferior_celsius ?? null;
    this.instLimiteSuperior = data?.limite_superior_celsius ?? null;
    this.instUbicacion = data?.ubicacion ?? '';
    this.instObservaciones = data?.observaciones ?? '';
    this.kwhPrice = data?.kwhPrice ?? null;
  }

  ngOnInit(): void {
    this.loadClients();

    this.searchCtrl.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((term) => {
          const q = (term ?? '').trim();
          this.lastSearchTerm = q;
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
          const selected = this.results.find((item) => item.id === this.selectedId);
          if (selected) {
            this.setExistingActivo(selected);
          }
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
    this.showCreateActivo = false;
    const selected = this.results.find((item) => item.id === id);
    if (selected) {
      this.setExistingActivo(selected);
    }
    // Auto-fill equipo_placa with the selected activo id
    this.instEquipoPlaca = id;
  }

  enableCreateActivo(): void {
    this.showCreateActivo = true;
    this.selectedId = '';
    const searchedActivoId = this.normalizeActivoId(this.lastSearchTerm);
    if (searchedActivoId) {
      this.newActivo.id = searchedActivoId;
      this.instEquipoPlaca = searchedActivoId;
    }
  }

  onNewActivoIdChange(value: string): void {
    this.newActivo.id = this.normalizeActivoId(value);
  }

  onNewActivoTextChange(
    field: 'descripcion' | 'fabricante' | 'establecimiento_comercial',
    value: string,
  ): void {
    this.newActivo[field] = this.normalizeActivoTextInput(value);
  }

  onExistingActivoTextChange(
    field: 'descripcion' | 'fabricante' | 'establecimiento_comercial',
    value: string,
  ): void {
    this.existingActivo[field] = this.normalizeActivoTextInput(value);
  }

  onClientSelect(clientId: number): void {
    const client = this.clients.find((item) => item.id === clientId);
    this.selectedClientId = client?.id ?? null;
    this.newActivo.cliente_id = client ? String(client.id) : '';
    this.newActivo.nombre_cliente = client?.name ?? '';
  }

  private loadClients(): void {
    this.loadingClients = true;
    this.clientLoadError = '';
    this.monitoringService.clients().subscribe({
      next: (clients) => {
        this.clients = [...(clients ?? [])].sort((a, b) => a.name.localeCompare(b.name));
        this.loadingClients = false;
      },
      error: (error) => {
        console.error('Error loading clients', error);
        this.clients = [];
        this.loadingClients = false;
        this.clientLoadError = 'No fue posible cargar los clientes.';
      },
    });
  }

  canConfirm(): boolean {
    if (this.saving) return false;
    if (this.showCreateActivo) {
      return Boolean(this.normalizeActivoId(this.newActivo.id) && this.selectedClientId);
    }
    return true; // Installation fields are optional
  }

  confirm(): void {
    if (this.saving) return;
    this.saveError = '';
    const doSave = (activoId: string, createdActivo = false) => {
      this.dialogRef.close({
        activo_id: activoId || null,
        equipo_placa: this.instEquipoPlaca || null,
        equipo_modelo: this.instEquipoModelo || null,
        limite_inferior_celsius: this.instLimiteInferior,
        limite_superior_celsius: this.instLimiteSuperior,
        ubicacion: this.instUbicacion || null,
        observaciones: this.instObservaciones || null,
        kwhPrice: this.kwhPrice,
        createdActivo,
      } as ActivoDialogResult);
    };

    const newActivoId = this.normalizeActivoId(this.newActivo.id);
    if (this.showCreateActivo && newActivoId) {
      this.newActivo.id = newActivoId;
      this.saving = true;
      this.monitoringService
        .createAndAssignSessionActivo(this.data.deviceId, this.data.sessionId, {
          id: newActivoId,
          descripcion: this.normalizeActivoTextValue(this.newActivo.descripcion),
          fabricante: this.normalizeActivoTextValue(this.newActivo.fabricante),
          capacidad: this.newActivo.capacidad || null,
          cliente_id: this.selectedClientId,
          nombre_cliente: this.newActivo.nombre_cliente || null,
          establecimiento_comercial: this.normalizeActivoTextValue(this.newActivo.establecimiento_comercial),
        })
        .subscribe({
          next: () => doSave(newActivoId, true),
          error: (error) => {
            console.error('Error creating monitoring activo', error);
            this.saving = false;
            this.saveError = 'No fue posible crear el activo. Verifique los datos e intente nuevamente.';
          },
        });
    } else if (this.showEditActivo) {
      const selectedActivoId = this.normalizeActivoId(this.selectedId);
      this.saving = true;
      this.monitoringService
        .updateMonitoringActivo(this.data.deviceId, this.data.sessionId, selectedActivoId, {
          descripcion: this.normalizeActivoTextValue(this.existingActivo.descripcion),
          fabricante: this.normalizeActivoTextValue(this.existingActivo.fabricante),
          capacidad: this.existingActivo.capacidad ?? null,
          establecimiento_comercial: this.normalizeActivoTextValue(
            this.existingActivo.establecimiento_comercial,
          ),
        })
        .subscribe({
          next: () => doSave(selectedActivoId),
          error: (error) => {
            console.error('Error updating monitoring activo', error);
            this.saving = false;
            this.saveError = 'No fue posible actualizar el activo. Verifique los datos e intente nuevamente.';
          },
        });
    } else if (this.selectedId) {
      doSave(this.selectedId);
    } else {
      // No activo selected, just save installation fields
      doSave('');
    }
  }

  private normalizeActivoId(value?: string | null): string {
    return (value ?? '').trim().toUpperCase();
  }

  private normalizeActivoTextInput(value?: string | null): string {
    return (value ?? '').toUpperCase();
  }

  private normalizeActivoTextValue(value?: string | null): string | null {
    const normalized = this.normalizeActivoTextInput(value).trim();
    return normalized || null;
  }

  private setExistingActivo(activo: Partial<ActivoItem>): void {
    this.existingActivo = {
      ...this.existingActivo,
      ...activo,
      descripcion: this.normalizeActivoTextInput(activo.descripcion),
      fabricante: this.normalizeActivoTextInput(activo.fabricante),
      establecimiento_comercial: this.normalizeActivoTextInput(
        activo.establecimiento_comercial,
      ),
    };
  }
}
