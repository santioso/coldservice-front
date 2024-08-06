import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BusinessComponent } from './business.component';
import { BusinessRoutingModule } from './business-routing.module';
import { ComponentsModule } from '@shared/components/components.module';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { FeatherIconsModule } from '@shared/components/feather-icons/feather-icons.module';
import { AssetsComponent } from './assets/assets.component';


@NgModule({
  declarations: [BusinessComponent, AssetsComponent],
  imports: [
    CommonModule,
    BusinessRoutingModule,
    ComponentsModule,
    MatIconModule,
    MatTableModule,
   FeatherIconsModule,
  ],
})
export class BusinessModule { }
