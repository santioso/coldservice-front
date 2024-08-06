import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AssetsComponent } from './assets/assets.component';
import { Page404Component } from 'app/authentication/page404/page404.component';

const routes: Routes = [
  {
    path: 'assets',
    component: AssetsComponent
   },
  { path: "**", component: Page404Component },
];
@NgModule({
  imports: [ RouterModule.forChild(routes)],
  exports: [ RouterModule]
})
export class BusinessRoutingModule { }

