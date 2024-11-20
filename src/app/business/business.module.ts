import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusinessComponent } from './business.component';
import { BusinessRoutingModule } from './business-routing.module';
import { ComponentsModule } from '@shared/components/components.module';
import { AssetsComponent } from './assets/assets.component';
import { SharedModule } from '@shared';
import { FormDialogComponent } from './assets/dialogs/form-dialog/form-dialog.component';
import { DeleteDialogComponent } from './assets/dialogs/delete/delete.component';
import { ClientsComponent } from './clients/clients.component';
import { FormDialogClientComponent } from './clients/dialogs/form-dialog/form-dialog-client.component';
import { DeleteDialogClientComponent } from './clients/dialogs/delete/delete-client.component';


@NgModule({
  declarations: [BusinessComponent, AssetsComponent, ClientsComponent, FormDialogComponent, DeleteDialogComponent, DeleteDialogClientComponent, FormDialogClientComponent],
  imports: [
    CommonModule,
    BusinessRoutingModule,
    ComponentsModule,
    SharedModule
  ],
})
export class BusinessModule { }
