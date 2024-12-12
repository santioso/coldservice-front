import { RouterModule, Routes } from "@angular/router";
import { OrdenesServicioComponent } from "./ordenes-servicio.component";
import { NgModule } from "@angular/core";


const routes: Routes = [
  {
    path: "",
    component: OrdenesServicioComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OrdenesServicioRoutingModule { }
