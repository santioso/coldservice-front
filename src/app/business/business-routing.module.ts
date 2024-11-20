import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { Page404Component } from 'app/authentication/page404/page404.component';
import { ClientsComponent } from './clients/clients.component';

const routes: Routes = [
  {
    path: 'clients',
    component: ClientsComponent
   },
  { path: "**", component: Page404Component },
];
@NgModule({
  imports: [ RouterModule.forChild(routes)],
  exports: [ RouterModule]
})
export class BusinessRoutingModule { }

