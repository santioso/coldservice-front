import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { OrdenesEntradaComponent } from "./ordenes-entrada.component";

const routes: Routes = [
  {
    path: "",
    component: OrdenesEntradaComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OrdenesEntradaRoutingModule { }
