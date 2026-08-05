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
  email: string | null;
  phone: string | null;
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
            <mat-radio-button [value]="item.id" class="radio-btn" (change)="onClientSelect(item)">
              <strong>{{ item.name }}</strong>
              <span class="text-muted" *ngIf="item.nit"> — {{ item.nit }}</span>
              <br />
              <small class="text-muted">{{ item.ubicacion || 'Sin ubicación' }}</small>
              <br />
              <small class="text-muted" *ngIf="item.email || item.phone">
                {{ item.email || 'Sin email' }} · {{ item.phone || 'Sin teléfono' }}
              </small>
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
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput type="email" [(ngModel)]="newClient.email" placeholder="Ej: contacto@cliente.com" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Teléfono de contacto</mat-label>
          <input matInput [(ngModel)]="newClient.phone" placeholder="Ej: +57 300 000 0000" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Logo para reportes (URL)</mat-label>
          <input matInput [(ngModel)]="newClient.logoUrl" placeholder="Ej: assets/logos/cliente.png" />
        </mat-form-field>
        <div class="file-field">
          <label>Archivo de logo para reportes</label>
          <input type="file" accept="image/png,image/jpeg" (change)="onLogoFileSelected($event, 'new')" />
          <small class="text-muted" *ngIf="newLogoFile">{{ newLogoFile.name }}</small>
        </div>
      </div>

      <div *ngIf="selectedClient" class="create-form">
        <h3>Datos del cliente</h3>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre *</mat-label>
          <input matInput [(ngModel)]="selectedClient.name" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>NIT</mat-label>
          <input matInput [(ngModel)]="selectedClient.nit" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Ubicación</mat-label>
          <input matInput [(ngModel)]="selectedClient.ubicacion" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput type="email" [(ngModel)]="selectedClient.email" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Teléfono de contacto</mat-label>
          <input matInput [(ngModel)]="selectedClient.phone" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Logo para reportes (ruta)</mat-label>
          <input matInput [(ngModel)]="selectedClient.logoUrl" placeholder="Ej: /uploads/client-logos/logo.png" />
        </mat-form-field>
        <div class="file-field">
          <label>Nuevo archivo de logo para reportes</label>
          <input type="file" accept="image/png,image/jpeg" (change)="onLogoFileSelected($event, 'existing')" />
          <small class="text-muted" *ngIf="existingLogoFile">{{ existingLogoFile.name }}</small>
        </div>
      </div>
      <div *ngIf="saveError" class="error-message">{{ saveError }}</div>
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
      .file-field { display: grid; gap: 0.35rem; margin: 0.5rem 0 1rem; }
      .error-message { margin-top: 0.75rem; color: #c62828; font-size: 0.85rem; }
      .text-muted { color: #888; }
    `,
  ],
})
export class MonitoringClienteDialogComponent implements OnInit {
  private readonly clientsApiUrl = `${environment.apiUrl}/api/v1/monitoring/clients`;
  searchCtrl = this.fb.control('');
  results: ClienteItem[] = [];
  selectedId: number | null = null;
  selectedClient: ClienteItem | null = null;
  loading = false;
  searched = false;
  showCreate = false;
  saveError = '';
  newLogoFile: File | null = null;
  existingLogoFile: File | null = null;

  newClient: Partial<ClienteItem> = {
    name: '',
    nit: '',
    ubicacion: '',
    email: '',
    phone: '',
    logoUrl: '',
  };

  constructor(
    public dialogRef: MatDialogRef<MonitoringClienteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { currentClient?: Partial<ClienteItem> & { logo_url?: string | null }; currentClientId?: number },
    private readonly fb: FormBuilder,
    private readonly http: HttpClient,
  ) {
    this.selectedId = data?.currentClient?.id ?? data?.currentClientId ?? null;
    this.selectedClient = data?.currentClient?.id
      ? {
          id: data.currentClient.id,
          name: data.currentClient.name ?? '',
          nit: data.currentClient.nit ?? null,
          ubicacion: data.currentClient.ubicacion ?? null,
          email: data.currentClient.email ?? null,
          phone: data.currentClient.phone ?? null,
          logoUrl: data.currentClient.logoUrl ?? data.currentClient.logo_url ?? null,
        }
      : null;
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
            `${this.clientsApiUrl}/search?q=${encodeURIComponent(q)}`,
          );
        }),
      )
      .subscribe({
        next: (items) => {
          this.results = items ?? [];
          const selected = this.results.find((item) => item.id === this.selectedId);
          this.selectedClient = selected ? { ...selected } : null;
          this.searched = true;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error searching clients', error);
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
    return this.selectedClient != null || this.selectedId != null;
  }

  onClientSelect(client: ClienteItem): void {
    this.selectedId = client.id;
    this.selectedClient = { ...client };
  }

  onLogoFileSelected(event: Event, target: 'new' | 'existing'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (target === 'new') {
      this.newLogoFile = file;
    } else {
      this.existingLogoFile = file;
    }
  }

  confirm(): void {
    if (this.showCreate) {
      const name = (this.newClient.name ?? '').trim();
      const nit = (this.newClient.nit ?? '').trim() || null;
      const ubicacion = (this.newClient.ubicacion ?? '').trim() || null;
      const email = (this.newClient.email ?? '').trim() || null;
      const phone = (this.newClient.phone ?? '').trim() || null;
      const logoUrl = (this.newClient.logoUrl ?? '').trim() || null;

      const formData = this.buildClientFormData({
        name,
        nit,
        ubicacion,
        email,
        phone,
        logoUrl,
      }, this.newLogoFile);

      this.http
        .post<ClienteItem & { message?: string }>(`${this.clientsApiUrl}`, formData)
        .subscribe({
          next: (res) => {
            if (res?.id) {
              this.dialogRef.close({ cliente_id: res.id } as ClienteDialogResult);
              return;
            }

            this.findCreatedClientByName(name);
          },
          error: (error) => {
            console.error('Error creating client', error);
            this.saveError = 'No fue posible crear el cliente.';
          },
        });
    } else {
      if (!this.selectedClient) {
        this.dialogRef.close({ cliente_id: this.selectedId! } as ClienteDialogResult);
        return;
      }

      const formData = this.buildClientFormData({
        name: this.selectedClient.name,
        nit: this.selectedClient.nit,
        ubicacion: this.selectedClient.ubicacion,
        email: this.selectedClient.email,
        phone: this.selectedClient.phone,
        logoUrl: this.selectedClient.logoUrl,
      }, this.existingLogoFile);

      this.http
        .patch(`${this.clientsApiUrl}/${this.selectedClient.id}`, formData)
        .subscribe({
          next: () => this.dialogRef.close({ cliente_id: this.selectedClient!.id } as ClienteDialogResult),
          error: (error) => {
            console.error('Error updating client', error);
            this.saveError = 'No fue posible actualizar el cliente.';
          },
        });
    }
  }

  private buildClientFormData(client: Partial<ClienteItem>, logoFile: File | null): FormData {
    const formData = new FormData();
    formData.append('name', (client.name ?? '').trim());
    formData.append('nit', (client.nit ?? '').trim());
    formData.append('ubicacion', (client.ubicacion ?? '').trim());
    formData.append('email', (client.email ?? '').trim());
    formData.append('phone', (client.phone ?? '').trim());
    formData.append('logoUrl', (client.logoUrl ?? '').trim());
    if (logoFile) {
      formData.append('logoFile', logoFile);
    }
    return formData;
  }

  private findCreatedClientByName(name: string): void {
    this.http
      .get<ClienteItem[]>(`${this.clientsApiUrl}/search?q=${encodeURIComponent(name)}`)
      .subscribe({
        next: (items) => {
          const found = items.find((i) => i.name.trim().toLowerCase() === name.toLowerCase());
          if (found) {
            this.dialogRef.close({ cliente_id: found.id } as ClienteDialogResult);
            return;
          }

          console.error('Created client response did not include an id and search did not find it');
        },
        error: (error) => {
          console.error('Error searching created client', error);
        },
      });
  }
}
