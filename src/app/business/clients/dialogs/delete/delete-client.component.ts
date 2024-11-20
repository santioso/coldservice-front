import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { ClientsService } from '../../clients.service';
import { ClientModel } from 'app/models/client.model';


@Component({
  selector: 'app-delete-client',
  templateUrl: './delete-client.component.html',
  styleUrls: ['./delete-client.component.scss'],
})
export class DeleteDialogClientComponent {
  constructor(
    public dialogRef: MatDialogRef<DeleteDialogClientComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ClientModel,
    private clientService: ClientsService,
  ) { }
  onNoClick(): void {
    this.dialogRef.close();
  }
  confirmDelete(): void {
    this.clientService.deleteClientRow(this.data.id);
  }
}
