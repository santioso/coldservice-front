import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExtraPagesRoutingModule } from './extra-pages-routing.module';
import { BlankComponent } from './blank/blank.component';
import { SharedModule } from '@shared';
import { ComponentsModule } from '@shared/components/components.module';
@NgModule({
  declarations: [BlankComponent],
  imports: [
    CommonModule,
    ExtraPagesRoutingModule,
    ComponentsModule,
    SharedModule,
  ],
})
export class ExtraPagesModule {}
