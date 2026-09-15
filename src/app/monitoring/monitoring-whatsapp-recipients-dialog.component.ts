import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  buildNotificationRecipientsPayload,
  getWhatsappRecipient,
  MonitoringNotificationLevel,
  MonitoringNotificationRecipientsResponse,
} from './monitoring.models';
import { MonitoringService } from './monitoring.service';

export interface WhatsappRecipientsDialogData {
  configuration: MonitoringNotificationRecipientsResponse;
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

  constructor(
    private readonly dialogRef: MatDialogRef<MonitoringWhatsappRecipientsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private readonly data: WhatsappRecipientsDialogData,
    private readonly monitoringService: MonitoringService,
    private readonly snackBar: MatSnackBar,
  ) {
    const level1 = getWhatsappRecipient(data.configuration, 'level_1');
    const level2 = getWhatsappRecipient(data.configuration, 'level_2');
    this.whatsappLevel1 = level1?.address ?? '';
    this.whatsappLevel1Enabled = level1?.enabled ?? false;
    this.whatsappLevel2 = level2?.address ?? '';
    this.whatsappLevel2Enabled = level2?.enabled ?? false;
    this.syncWhatsappLevel2State();
  }

  close(): void {
    if (!this.whatsappSaving) {
      this.dialogRef.close();
    }
  }

  clearWhatsappLevel(level: MonitoringNotificationLevel): void {
    if (level === 'level_1') {
      this.whatsappLevel1 = '';
      this.whatsappLevel1Enabled = false;
      this.syncWhatsappLevel2State();
      return;
    }
    this.whatsappLevel2 = '';
    this.whatsappLevel2Enabled = false;
  }

  onWhatsappLevel1Change(): void {
    this.syncWhatsappLevel2State();
  }

  get canEnableWhatsappLevel2(): boolean {
    return this.whatsappLevel1Enabled
      && !this.whatsappNumberError(this.whatsappLevel1, true);
  }

  whatsappNumberError(address: string, enabled: boolean): string {
    const normalized = address.trim();
    if (!normalized && enabled) {
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
    if (this.whatsappSaving || !this.isWhatsappFormValid()) {
      return;
    }

    this.whatsappSaving = true;
    this.whatsappError = '';
    const recipients = buildNotificationRecipientsPayload(this.data.configuration, [
      { level: 'level_1', address: this.whatsappLevel1, enabled: this.whatsappLevel1Enabled },
      {
        level: 'level_2',
        address: this.whatsappLevel2,
        enabled: this.whatsappLevel2Enabled && this.canEnableWhatsappLevel2,
      },
    ]);

    this.monitoringService.replaceNotificationRecipients(this.data.configuration.device_id, recipients).subscribe({
      next: (response) => {
        this.whatsappSaving = false;
        this.snackBar.open('Destinatarios de WhatsApp guardados', 'Cerrar', { duration: 4000 });
        this.dialogRef.close(response);
      },
      error: () => {
        this.whatsappSaving = false;
        this.whatsappError = 'No fue posible guardar los destinatarios de WhatsApp';
        this.snackBar.open(this.whatsappError, 'Cerrar', { duration: 5000 });
      },
    });
  }

  private syncWhatsappLevel2State(): void {
    if (!this.canEnableWhatsappLevel2) {
      this.whatsappLevel2Enabled = false;
    }
  }
}
