import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, Subject, throwError } from 'rxjs';
import {
  MonitoringAlarmConfiguration,
  MonitoringNotificationRecipientsResponse,
} from './monitoring.models';
import {
  MonitoringWhatsappRecipientsDialogComponent,
  WhatsappRecipientsDialogData,
} from './monitoring-whatsapp-recipients-dialog.component';
import { MonitoringService } from './monitoring.service';

describe('MonitoringWhatsappRecipientsDialogComponent', () => {
  const alarmConfiguration: MonitoringAlarmConfiguration = {
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
  };
  const notificationConfiguration: MonitoringNotificationRecipientsResponse = {
    device_id: 'device-1',
    levels: {
      level_1: { email: [], whatsapp: [], sms: [] },
      level_2: { email: [], whatsapp: [], sms: [] },
    },
  };

  let component: MonitoringWhatsappRecipientsDialogComponent;
  let dialogRef: jasmine.SpyObj<MatDialogRef<MonitoringWhatsappRecipientsDialogComponent>>;
  let monitoringService: jasmine.SpyObj<MonitoringService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    monitoringService = jasmine.createSpyObj('MonitoringService', [
      'replaceNotificationRecipients',
      'saveAlarmConfiguration',
    ]);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    const data: WhatsappRecipientsDialogData = {
      configuration: notificationConfiguration,
      alarmConfiguration,
    };
    component = new MonitoringWhatsappRecipientsDialogComponent(
      dialogRef,
      data,
      monitoringService,
      snackBar,
    );
    component.whatsappLevel1 = '+573001234567';
    component.whatsappLevel1Enabled = true;
  });

  it('initializes both sections and keeps a local alarm configuration copy', () => {
    expect(component.alarmConfiguration).toEqual(alarmConfiguration);

    component.alarmConfiguration.repeat_count = 7;

    expect(alarmConfiguration.repeat_count).toBe(4);
    expect(component.whatsappLevel1).toBe('+573001234567');
    expect(component.whatsappLevel2).toBe('');
  });

  it('updates the WhatsApp notification notice for each enabled-level state', () => {
    expect(component.whatsappNotificationNotice).toBe(
      'Las notificaciones de WhatsApp de las repeticiones y avisos posteriores se enviarán al nivel 1.',
    );

    component.whatsappLevel2Enabled = true;
    expect(component.whatsappNotificationNotice).toBe(
      'Las notificaciones de WhatsApp de las repeticiones y avisos posteriores se enviarán a los niveles 1 y 2.',
    );

    component.whatsappLevel1Enabled = false;
    expect(component.whatsappNotificationNotice).toBe(
      'Las notificaciones de WhatsApp de las repeticiones y avisos posteriores no se enviarán a ningún destinatario hasta que habilites un nivel.',
    );
  });

  it('validates both sections before calling either endpoint', () => {
    component.alarmConfiguration.repeat_count = 0;

    component.save();

    expect(monitoringService.saveAlarmConfiguration).not.toHaveBeenCalled();
    expect(monitoringService.replaceNotificationRecipients).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('keeps a populated WhatsApp number while sending disabled in the payload', () => {
    const savedConfiguration = { ...alarmConfiguration };
    const savedRecipients = { ...notificationConfiguration };
    monitoringService.saveAlarmConfiguration.and.returnValue(of(savedConfiguration));
    monitoringService.replaceNotificationRecipients.and.returnValue(of(savedRecipients));
    component.whatsappLevel1Enabled = false;

    component.save();

    expect(monitoringService.replaceNotificationRecipients).toHaveBeenCalledWith('device-1', [
      {
        level: 'level_1',
        channel: 'whatsapp',
        address: '+573001234567',
        enabled: false,
      },
    ]);
  });

  it('ignores an invalid number when its WhatsApp level is disabled', () => {
    component.whatsappLevel1 = 'invalid-number';
    component.whatsappLevel1Enabled = false;

    expect(component.whatsappNumberError(component.whatsappLevel1, false)).toBe('');
    expect(component.isWhatsappFormValid()).toBeTrue();
  });

  it('saves alarm configuration before recipients and closes after both succeed', () => {
    const savedConfiguration = { ...alarmConfiguration, repeat_count: 6 };
    const savedRecipients = { ...notificationConfiguration };
    const alarmSave = new Subject<MonitoringAlarmConfiguration>();
    const recipientSave = new Subject<MonitoringNotificationRecipientsResponse>();
    monitoringService.saveAlarmConfiguration.and.returnValue(alarmSave.asObservable());
    monitoringService.replaceNotificationRecipients.and.returnValue(recipientSave.asObservable());
    component.alarmConfiguration.repeat_count = 6;

    component.save();

    expect(monitoringService.saveAlarmConfiguration).toHaveBeenCalledWith('device-1', {
      enabled: true,
      out_of_range_duration_minutes: 10,
      in_range_resolution_duration_minutes: 5,
      stale_data_after_minutes: 5,
      repeat_interval_minutes: 30,
      repeat_count: 6,
      post_repeat_interval_minutes: 60,
    });
    expect(monitoringService.replaceNotificationRecipients).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();

    alarmSave.next(savedConfiguration);

    expect(monitoringService.replaceNotificationRecipients).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
    component.close();
    expect(dialogRef.close).not.toHaveBeenCalled();

    recipientSave.next(savedRecipients);

    expect(dialogRef.close).toHaveBeenCalledWith({
      alarmConfiguration: savedConfiguration,
      notificationRecipients: savedRecipients,
    });
  });

  it('keeps the dialog open and does not attempt recipients when alarm save fails', () => {
    monitoringService.saveAlarmConfiguration.and.returnValue(
      throwError(() => new Error('alarm failure')),
    );

    component.save();

    expect(monitoringService.replaceNotificationRecipients).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.alarmConfigurationError).toContain('No se intentó guardar');
  });

  it('keeps the dialog open and explains partial success when recipient save fails', () => {
    const savedConfiguration = { ...alarmConfiguration };
    monitoringService.saveAlarmConfiguration.and.returnValue(of(savedConfiguration));
    monitoringService.replaceNotificationRecipients.and.returnValue(
      throwError(() => new Error('recipient failure')),
    );

    component.save();

    expect(monitoringService.saveAlarmConfiguration).toHaveBeenCalled();
    expect(monitoringService.replaceNotificationRecipients).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.whatsappError).toContain('sí se guardó');
  });
});
