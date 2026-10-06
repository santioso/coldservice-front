import { NgModule } from "@angular/core";
import { FileUploadComponent } from "./file-upload/file-upload.component";
import { BreadcrumbComponent } from "./breadcrumb/breadcrumb.component";
import { MonitoringLoadingSkeletonComponent } from "./monitoring-loading-skeleton/monitoring-loading-skeleton.component";
import { SharedModule } from "../shared.module";

@NgModule({
  declarations: [FileUploadComponent, BreadcrumbComponent, MonitoringLoadingSkeletonComponent],
  imports: [SharedModule],
  exports: [FileUploadComponent, BreadcrumbComponent, MonitoringLoadingSkeletonComponent],
})
export class ComponentsModule {}
