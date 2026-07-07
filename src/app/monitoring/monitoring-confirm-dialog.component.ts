import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p [innerHTML]="data.message"></p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close(false)">{{ data.cancelText || 'Cancelar' }}</button>
      <button mat-raised-button color="warn" type="button" (click)="dialogRef.close(true)">{{ data.confirmText || 'Eliminar' }}</button>
    </mat-dialog-actions>
  `,
})
export class MonitoringConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<MonitoringConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
  ) {}
}
