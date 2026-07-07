import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { environment } from 'environments/environment';

export interface ClienteDialogResult {
  cliente_id: number;
}

interface ClienteItem {
  id: number;
  name: string;
  nit: string | null;
  ubicacion: string | null;
  logoUrl: string | null;
}

@Component({
  template: `
    <h2 mat-dialog-title>Seleccionar cliente</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Buscar por nombre, NIT o ubicación</mat-label>
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
        <mat-radio-group [(ngModel)]="selectedId">
          <mat-list-item
            *ngFor="let item of results"
            class="result-item"
            [class.selected]="selectedId === item.id"
          >
            <mat-radio-button [value]="item.id" class="radio-btn">
              <strong>{{ item.name }}</strong>
              <span class="text-muted" *ngIf="item.nit"> — {{ item.nit }}</span>
              <br />
              <small class="text-muted">{{ item.ubicacion || 'Sin ubicación' }}</small>
            </mat-radio-button>
          </mat-list-item>
        </mat-radio-group>
      </div>

      <div *ngIf="searched && results.length === 0 && !loading" class="no-results">
        <p>No se encontraron clientes con ese criterio.</p>
        <button mat-stroked-button color="primary" type="button" (click)="showCreate = true">
          + Agregar nuevo cliente
        </button>
      </div>

      <div *ngIf="showCreate" class="create-form">
        <h3>Nuevo cliente</h3>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre *</mat-label>
          <input matInput [(ngModel)]="newClient.name" placeholder="Ej: Cliente S.A.S." />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>NIT</mat-label>
          <input matInput [(ngModel)]="newClient.nit" placeholder="Ej: 123456789-0" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Ubicación</mat-label>
          <input matInput [(ngModel)]="newClient.ubicacion" placeholder="Ej: Bogotá" />
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
        {{ showCreate ? 'Crear y seleccionar' : 'Seleccionar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .full-width { width: 100%; }
      .loading, .no-results { padding: 1rem; text-align: center; color: #666; }
      .results-list { max-height: 320px; overflow-y: auto; }
      .result-item { padding: 0.5rem 0; border-bottom: 1px solid #eee; }
      .result-item.selected { background: #e3f2fd; }
      .result-item .radio-btn { width: 100%; }
      .create-form { margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #e0e0e0; }
      .text-muted { color: #888; }
    `,
  ],
})
export class MonitoringClienteDialogComponent implements OnInit {
  searchCtrl = this.fb.control('');
  results: ClienteItem[] = [];
  selectedId: number | null = null;
  loading = false;
  searched = false;
  showCreate = false;

  newClient: Partial<ClienteItem> = {
    name: '',
    nit: '',
    ubicacion: '',
  };

  constructor(
    public dialogRef: MatDialogRef<MonitoringClienteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { currentClientId?: number },
    private readonly fb: FormBuilder,
    private readonly http: HttpClient,
  ) {
    this.selectedId = data?.currentClientId ?? null;
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
          return this.http.get<ClienteItem[]>(
            `${environment.apiUrl}/clients/search?q=${encodeURIComponent(q)}`,
          );
        }),
      )
      .subscribe({
        next: (items) => {
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
  }

  canConfirm(): boolean {
    if (this.showCreate) {
      return (this.newClient.name ?? '').trim().length > 0;
    }
    return this.selectedId != null;
  }

  confirm(): void {
    if (this.showCreate) {
      this.http
        .post(`${environment.apiUrl}/clients`, {
          name: this.newClient.name,
          nit: this.newClient.nit || null,
          ubicacion: this.newClient.ubicacion || null,
        })
        .subscribe({
          next: (res: any) => {
            if (res?.message) {
              // Need to re-fetch to get the id; use the search
              this.http
                .get<ClienteItem[]>(
                  `${environment.apiUrl}/clients/search?q=${encodeURIComponent(this.newClient.name!)}`,
                )
                .subscribe({
                  next: (items) => {
                    const found = items.find(
                      (i) => i.name.toLowerCase() === this.newClient.name!.toLowerCase(),
                    );
                    if (found) {
                      this.dialogRef.close({ cliente_id: found.id } as ClienteDialogResult);
                    }
                  },
                });
            }
          },
          error: () => {
            // Try to find the client by name anyway
            this.http
              .get<ClienteItem[]>(
                `${environment.apiUrl}/clients/search?q=${encodeURIComponent(this.newClient.name!)}`,
              )
              .subscribe({
                next: (items) => {
                  const found = items.find(
                    (i) => i.name.toLowerCase() === this.newClient.name!.toLowerCase(),
                  );
                  if (found) {
                    this.dialogRef.close({ cliente_id: found.id } as ClienteDialogResult);
                  }
                },
              });
          },
        });
    } else {
      this.dialogRef.close({ cliente_id: this.selectedId! } as ClienteDialogResult);
    }
  }
}
