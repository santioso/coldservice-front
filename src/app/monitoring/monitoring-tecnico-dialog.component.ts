import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { environment } from 'environments/environment';

export interface TecnicoDialogResult {
  tecnico_nombre: string | null;
  technical_id: number | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  fecha_instalacion: string | null;
}

export interface TecnicoDialogData {
  deviceId: string;
  sessionId: number;
  tecnico_nombre?: string | null;
  technical_id?: number | null;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  fecha_instalacion?: string | null;
}

interface TechnicalItem {
  id: number;
  name: string;
  addres: string;
  position: string;
  phone: string;
}

@Component({
  template: `
    <h2 mat-dialog-title>Técnico de instalación</h2>
    <mat-dialog-content>
      <!-- Búsqueda de técnico existente -->
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Buscar técnico por nombre</mat-label>
        <input
          matInput
          [formControl]="searchCtrl"
          placeholder="Escriba al menos 2 caracteres"
          autocomplete="off"
        />
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>

      <div *ngIf="loading" class="loading">Buscando...</div>

      <div *ngIf="results.length > 0" class="results-list">
        <mat-radio-group [(ngModel)]="selectedTechnicalId">
          <mat-list-item
            *ngFor="let item of results"
            class="result-item"
            [class.selected]="selectedTechnicalId === item.id"
          >
            <mat-radio-button [value]="item.id" class="radio-btn" (change)="selectTechnical(item)">
              <strong>{{ item.name }}</strong>
              <span class="text-muted" *ngIf="item.addres"> — {{ item.addres }}</span>
              <br />
              <small class="text-muted">{{ item.position || '—' }} · {{ item.phone || '—' }}</small>
            </mat-radio-button>
          </mat-list-item>
        </mat-radio-group>
      </div>

      <div *ngIf="searched && results.length === 0 && !loading" class="no-results">
        <p>No se encontraron técnicos.</p>
        <button mat-stroked-button color="primary" type="button" (click)="showCreate = true">
          + Agregar nuevo técnico
        </button>
      </div>

      <div *ngIf="showCreate" class="sub-form">
        <h4>Nuevo técnico</h4>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre *</mat-label>
          <input matInput [(ngModel)]="newTechnical.name" placeholder="Ej: Juan Pérez" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Dirección</mat-label>
          <input matInput [(ngModel)]="newTechnical.addres" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Cargo</mat-label>
          <input matInput [(ngModel)]="newTechnical.position" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Teléfono</mat-label>
          <input matInput [(ngModel)]="newTechnical.phone" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput [(ngModel)]="newTechnical.email" type="email" />
        </mat-form-field>
      </div>

      <!-- Datos propios de la instalación -->
      <h3>Datos de esta instalación</h3>
      <div class="sub-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre del técnico</mat-label>
          <input matInput [(ngModel)]="tecnicoNombre" placeholder="Se usa el nombre del técnico seleccionado" />
        </mat-form-field>
        <div class="row">
          <div class="col">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Cargo</mat-label>
              <input matInput [(ngModel)]="tecnicoCargo" placeholder="Ej: Técnico de refrigeración" />
            </mat-form-field>
          </div>
          <div class="col">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Teléfono</mat-label>
              <input matInput [(ngModel)]="tecnicoPhone" placeholder="Ej: 3001234567" />
            </mat-form-field>
          </div>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput [(ngModel)]="tecnicoEmail" placeholder="Ej: tecnico@email.com" type="email" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Fecha de instalación</mat-label>
          <input matInput type="date" [(ngModel)]="fechaInstalacion" />
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close()">Cancelar</button>
      <button
        mat-raised-button
        color="primary"
        type="button"
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
      .results-list { max-height: 220px; overflow-y: auto; }
      .result-item { padding: 0.3rem 0; border-bottom: 1px solid #eee; }
      .result-item.selected { background: #e3f2fd; }
      .result-item .radio-btn { width: 100%; }
      .sub-form { margin-top: 0.5rem; padding: 0.75rem; background: #f8fafc; border-radius: 8px; }
      h3 { margin: 1rem 0 0.5rem; font-size: 1rem; color: #17375e; }
      h4 { margin: 0.5rem 0; font-size: 0.9rem; color: #555; }
      .text-muted { color: #888; }
      .row { display: flex; gap: 12px; }
      .col { flex: 1; }
    `,
  ],
})
export class MonitoringTecnicoDialogComponent implements OnInit {
  searchCtrl = this.fb.control('');
  results: TechnicalItem[] = [];
  selectedTechnicalId: number | null = null;
  loading = false;
  searched = false;
  showCreate = false;

  newTechnical: { name: string; addres: string; position: string; phone: string; email: string } = {
    name: '',
    addres: '',
    position: '',
    phone: '',
    email: '',
  };

  // Installation-specific fields
  tecnicoNombre = '';
  tecnicoCargo = '';
  tecnicoPhone = '';
  tecnicoEmail = '';
  fechaInstalacion = '';

  constructor(
    public dialogRef: MatDialogRef<MonitoringTecnicoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TecnicoDialogData,
    private readonly fb: FormBuilder,
    private readonly http: HttpClient,
  ) {
    this.tecnicoNombre = data.tecnico_nombre ?? '';
    this.tecnicoCargo = data.position ?? '';
    this.tecnicoPhone = data.phone ?? '';
    this.tecnicoEmail = data.email ?? '';
    this.selectedTechnicalId = data.technical_id ?? null;
    const rawDate = data.fecha_instalacion;
    this.fechaInstalacion = rawDate
      ? new Date(rawDate).toISOString().split('T')[0]
      : '';
  }

  ngOnInit(): void {
    this.searchCtrl.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((term) => {
          const q = (term ?? '').trim();
          if (q.length < 2) {
            this.results = [];
            this.searched = false;
            this.loading = false;
            return [];
          }
          this.loading = true;
          return this.http.get<TechnicalItem[]>(
            `${environment.apiUrl}/technicals/search?q=${encodeURIComponent(q)}`,
          );
        }),
      )
      .subscribe({
        next: (items) => {
          this.results = items ?? [];
          this.searched = true;
          this.loading = false;
          if (items?.length === 1) {
            this.selectTechnical(items[0]);
          }
        },
        error: () => {
          this.results = [];
          this.searched = true;
          this.loading = false;
        },
      });
  }

  selectTechnical(t: TechnicalItem): void {
    this.selectedTechnicalId = t.id;
    this.tecnicoNombre = t.name;
    if (t.position) this.tecnicoCargo = t.position;
    if (t.phone) this.tecnicoPhone = t.phone;
  }

  confirm(): void {
    const doSave = () => {
      let fecha: string | null = null;
      if (this.fechaInstalacion) {
        fecha = `${this.fechaInstalacion}T12:00:00`;
      }
      this.dialogRef.close({
        tecnico_nombre: this.tecnicoNombre.trim() || null,
        technical_id: this.selectedTechnicalId,
        position: this.tecnicoCargo.trim() || null,
        phone: this.tecnicoPhone.trim() || null,
        email: this.tecnicoEmail.trim() || null,
        fecha_instalacion: fecha,
      } as TecnicoDialogResult);
    };

    if (this.showCreate && this.newTechnical.name.trim()) {
      this.http
        .post(`${environment.apiUrl}/technicals`, {
          name: this.newTechnical.name,
          addres: this.newTechnical.addres || null,
          position: this.newTechnical.position || null,
          phone: this.newTechnical.phone || null,
          email: this.newTechnical.email || null,
        })
        .subscribe({
          next: (created: any) => {
            // Auto-fill installation fields with the new technician's data
            this.tecnicoNombre = this.newTechnical.name;
            this.tecnicoCargo = this.newTechnical.position;
            this.tecnicoPhone = this.newTechnical.phone;
            this.tecnicoEmail = this.newTechnical.email;
            this.selectedTechnicalId = created?.id ?? null;
            doSave();
          },
          error: () => doSave(),
        });
    } else {
      doSave();
    }
  }
}
