import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OrdenesSalidaComponent } from './ordenes-salida.component';

const routes: Routes = [
  { path: '', component: OrdenesSalidaComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrdenesSalidaRoutingModule {}
