import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { MonitoringDeviceDetailComponent } from './monitoring-device-detail.component';
import { MonitoringService } from '../monitoring.service';
import {
  MonitoringAlarmConfiguration,
  MonitoringNotificationRecipientsResponse,
} from '../monitoring.models';
import { MonitoringWhatsappRecipientsDialogResult } from '../monitoring-whatsapp-recipients-dialog.component';

describe('MonitoringDeviceDetailComponent dialog result handling', () => {
  let component: MonitoringDeviceDetailComponent;

  beforeEach(() => {
    component = new MonitoringDeviceDetailComponent(
      {} as ActivatedRoute,
      {} as Router,
      {} as MonitoringService,
      {} as MatDialog,
      {} as MatSnackBar,
    );
  });

  it('updates alarm and recipient state from independent successful saves', () => {
    const alarmConfiguration = {
      device_id: 'device-1',
      temperature_metric: 'T1',
      minimum_celsius: -5,
      maximum_celsius: 8,
      enabled: true,
      out_of_range_duration_minutes: 10,
      in_range_resolution_duration_minutes: 5,
      stale_data_after_minutes: 5,
      repeat_interval_minutes: 30,
      repeat_count: 4,
      post_repeat_interval_minutes: 60,
    } satisfies MonitoringAlarmConfiguration;
    const notificationRecipients = {
      device_id: 'device-1',
      levels: {
        level_1: { email: [], whatsapp: [], sms: [] },
        level_2: { email: [], whatsapp: [], sms: [] },
      },
    } satisfies MonitoringNotificationRecipientsResponse;
    const result: MonitoringWhatsappRecipientsDialogResult = {
      alarmConfiguration,
      notificationRecipients,
    };

    (component as unknown as {
      applyDialogResult: (dialogResult: MonitoringWhatsappRecipientsDialogResult) => void;
    }).applyDialogResult(result);

    expect(component.alarmConfiguration).toBe(alarmConfiguration);
    expect(component.notificationRecipients).toBe(notificationRecipients);
    expect(component.alarmConfigurationError).toBe('');
  });
});
