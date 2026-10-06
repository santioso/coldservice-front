import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-monitoring-loading-skeleton',
  templateUrl: './monitoring-loading-skeleton.component.html',
  styleUrls: ['./monitoring-loading-skeleton.component.scss'],
})
export class MonitoringLoadingSkeletonComponent {
  @Input() viewMode: 'charts' | 'table' = 'charts';
  @Input() showClientColumn = false;

  readonly chartCards = [1, 2, 3, 4];
  readonly tableRows = [1, 2, 3, 4, 5, 6];
}
