import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrdenesSalidaComponent } from './ordenes-salida.component';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormDialogComponent } from './dialogs/form-dialog/form-dialog.component';
import { DeleteDialogComponent } from './dialogs/delete/delete-dialog.component';
import { OrdenesSalidaRoutingModule } from './ordenes-salida-routing.module';
import { ComponentsModule } from '@shared/components/components.module';
import { SharedModule } from '@shared';
import { OrdenesSalidaService } from './ordenes-salida.service';
import { ActivosService } from 'app/activos/activos.service';

@NgModule({
  declarations: [
    OrdenesSalidaComponent,
    DeleteDialogComponent,
    FormDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    OrdenesSalidaRoutingModule,
    ComponentsModule,
    SharedModule,
  ],
  providers: [
    OrdenesSalidaService,
    ActivosService,
  ],
})
export class OrdenesSalidaModule {}
