import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  buildNotificationRecipientsPayload,
  getWhatsappRecipient,
  MonitoringAlarmConfiguration,
  MonitoringNotificationRecipientsResponse,
} from './monitoring.models';
import { MonitoringService } from './monitoring.service';

export interface WhatsappRecipientsDialogData {
  configuration: MonitoringNotificationRecipientsResponse;
  alarmConfiguration: MonitoringAlarmConfiguration;
  alarmConfigurationNotice?: string;
}

export interface MonitoringWhatsappRecipientsDialogResult {
  notificationRecipients?: MonitoringNotificationRecipientsResponse;
  alarmConfiguration?: MonitoringAlarmConfiguration;
}

@Component({
  selector: 'app-monitoring-whatsapp-recipients-dialog',
  templateUrl: './monitoring-whatsapp-recipients-dialog.component.html',
  styleUrls: ['./monitoring-whatsapp-recipients-dialog.component.scss'],
})
export class MonitoringWhatsappRecipientsDialogComponent {
  whatsappLevel1 = '';
  whatsappLevel1Enabled = false;
  whatsappLevel2 = '';
  whatsappLevel2Enabled = false;
  whatsappSaving = false;
  whatsappError = '';
  alarmConfiguration: MonitoringAlarmConfiguration;
  alarmConfigurationSaving = false;
  alarmConfigurationError = '';
  alarmConfigurationNotice = '';
  private readonly dialogResult: MonitoringWhatsappRecipientsDialogResult = {};
  readonly alarmConfigurationLimits = {
    durationMax: 10080,
    repeatCountMax: 100,
  };

  constructor(
    private readonly dialogRef: MatDialogRef<MonitoringWhatsappRecipientsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private readonly data: WhatsappRecipientsDialogData,
    private readonly monitoringService: MonitoringService,
    private readonly snackBar: MatSnackBar,
  ) {
    this.alarmConfiguration = { ...data.alarmConfiguration };
    this.alarmConfigurationNotice = data.alarmConfigurationNotice ?? '';
    const level1 = getWhatsappRecipient(data.configuration, 'level_1');
    const level2 = getWhatsappRecipient(data.configuration, 'level_2');
    this.whatsappLevel1 = level1?.address ?? '';
    this.whatsappLevel1Enabled = level1?.enabled ?? false;
    this.whatsappLevel2 = level2?.address ?? '';
    this.whatsappLevel2Enabled = level2?.enabled ?? false;
    this.syncWhatsappLevel2State();
  }

  close(): void {
    if (!this.whatsappSaving && !this.alarmConfigurationSaving) {
      this.dialogRef.close(this.dialogResult);
    }
  }

  onWhatsappLevel1Change(): void {
    this.syncWhatsappLevel2State();
  }

  get canEnableWhatsappLevel2(): boolean {
    return this.whatsappLevel1Enabled
      && !this.whatsappNumberError(this.whatsappLevel1, true);
  }

  get isSaving(): boolean {
    return this.whatsappSaving || this.alarmConfigurationSaving;
  }

  get whatsappNotificationNotice(): string {
    if (this.whatsappLevel1Enabled && this.whatsappLevel2Enabled) {
      return 'Las notificaciones de WhatsApp de las repeticiones y avisos posteriores se enviarán a los niveles 1 y 2.';
    }
    if (this.whatsappLevel1Enabled) {
      return 'Las notificaciones de WhatsApp de las repeticiones y avisos posteriores se enviarán al nivel 1.';
    }
    return 'Las notificaciones de WhatsApp de las repeticiones y avisos posteriores no se enviarán a ningún destinatario hasta que habilites un nivel.';
  }

  whatsappNumberError(address: string, enabled: boolean): string {
    if (!enabled) {
      return '';
    }

    const normalized = address.trim();
    if (!normalized) {
      return 'Ingresa un número para activar este nivel';
    }
    if (normalized && !/^\+[1-9]\d{6,14}$/.test(normalized)) {
      return 'Usa un número internacional válido, por ejemplo +573001234567';
    }
    return '';
  }

  isWhatsappFormValid(): boolean {
    const level2Enabled = this.whatsappLevel2Enabled && this.canEnableWhatsappLevel2;
    return !this.whatsappNumberError(this.whatsappLevel1, this.whatsappLevel1Enabled)
      && !this.whatsappNumberError(this.whatsappLevel2, level2Enabled);
  }

  save(): void {
    if (this.isSaving || !this.isWhatsappFormValid() || !this.isAlarmConfigurationValid()) {
      return;
    }

    this.alarmConfigurationSaving = true;
    this.whatsappSaving = true;
    this.whatsappError = '';
    this.alarmConfigurationError = '';
    const recipients = buildNotificationRecipientsPayload(this.data.configuration, [
      { level: 'level_1', address: this.whatsappLevel1, enabled: this.whatsappLevel1Enabled },
      {
        level: 'level_2',
        address: this.whatsappLevel2,
        enabled: this.whatsappLevel2Enabled && this.canEnableWhatsappLevel2,
      },
    ]);

    this.monitoringService.saveAlarmConfiguration(this.alarmConfiguration.device_id, {
      enabled: this.alarmConfiguration.enabled,
      out_of_range_duration_minutes: this.alarmConfiguration.out_of_range_duration_minutes,
      in_range_resolution_duration_minutes: this.alarmConfiguration.in_range_resolution_duration_minutes,
      stale_data_after_minutes: this.alarmConfiguration.stale_data_after_minutes,
      repeat_interval_minutes: this.alarmConfiguration.repeat_interval_minutes,
      repeat_count: this.alarmConfiguration.repeat_count,
      post_repeat_interval_minutes: this.alarmConfiguration.post_repeat_interval_minutes,
    }).subscribe({
      next: (configuration) => {
        this.alarmConfiguration = { ...configuration };
        this.alarmConfigurationNotice = '';
        this.dialogResult.alarmConfiguration = configuration;

        this.monitoringService.replaceNotificationRecipients(this.data.configuration.device_id, recipients).subscribe({
          next: (response) => {
            this.dialogResult.notificationRecipients = response;
            this.setSaving(false);
            this.snackBar.open('Configuración de alarmas y destinatarios guardada', 'Cerrar', { duration: 4000 });
            this.dialogRef.close({ ...this.dialogResult });
          },
          error: () => {
            this.setSaving(false);
            this.whatsappError =
              'No fue posible guardar los destinatarios de WhatsApp. La configuración de alarmas sí se guardó; vuelve a intentarlo para completar.';
            this.snackBar.open(this.whatsappError, 'Cerrar', { duration: 5000 });
          },
        });
      },
      error: () => {
        this.setSaving(false);
        this.alarmConfigurationError =
          'No fue posible guardar la configuración de alarmas. No se intentó guardar los destinatarios de WhatsApp.';
        this.snackBar.open(this.alarmConfigurationError, 'Cerrar', { duration: 5000 });
      },
    });
  }

  isAlarmConfigurationValid(): boolean {
    const configuration = this.alarmConfiguration;
    const positiveIntegers = [
      configuration.out_of_range_duration_minutes,
      configuration.in_range_resolution_duration_minutes,
      configuration.stale_data_after_minutes,
      configuration.repeat_interval_minutes,
      configuration.repeat_count,
      configuration.post_repeat_interval_minutes,
    ];
    return positiveIntegers.every((value) => Number.isInteger(value) && value > 0)
      && configuration.out_of_range_duration_minutes <= this.alarmConfigurationLimits.durationMax
      && configuration.in_range_resolution_duration_minutes <= this.alarmConfigurationLimits.durationMax
      && configuration.stale_data_after_minutes <= this.alarmConfigurationLimits.durationMax
      && configuration.repeat_interval_minutes <= this.alarmConfigurationLimits.durationMax
      && configuration.repeat_count <= this.alarmConfigurationLimits.repeatCountMax
      && configuration.post_repeat_interval_minutes <= this.alarmConfigurationLimits.durationMax;
  }

  private setSaving(saving: boolean): void {
    this.alarmConfigurationSaving = saving;
    this.whatsappSaving = saving;
  }

  private syncWhatsappLevel2State(): void {
    if (!this.canEnableWhatsappLevel2) {
      this.whatsappLevel2Enabled = false;
    }
  }
}
