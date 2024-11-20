import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import {
  UntypedFormControl,
  Validators,
  UntypedFormGroup,
  UntypedFormBuilder,
} from '@angular/forms';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { ClientsService } from '../../clients.service';
import { ClientModel } from 'app/models/client.model';

export interface DialogData {
  id: number;
  action: string;
  clientModel: ClientModel,
  lastId: number;
}

@Component({
  selector: 'app-form-dialog-client',
  templateUrl: './form-dialog-client.component.html',
  styleUrls: ['./form-dialog-client.component.scss'],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-ES' }],
})
export class FormDialogClientComponent {
  action: string;
  dialogTitle: string;
  clientModelForm: UntypedFormGroup;
  clientModel: ClientModel;
  lastId = 0;
  constructor(
    public dialogRef: MatDialogRef<FormDialogClientComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private clientService: ClientsService,
    private fb: UntypedFormBuilder
  ) {
    // Set the defaults
    this.action = data.action;
    if (this.action === 'edit') {
      this.dialogTitle =
        data.clientModel.id + ' ' + data.clientModel.nit + ' ' + data.clientModel.name;
      this.clientModel = data.clientModel;
    } else {
      this.lastId = data.lastId + 1;
      this.dialogTitle = 'Nuevo registro';
      const blankObject = {} as ClientModel;
      this.clientModel = new ClientModel(blankObject);
    }
    this.clientModelForm = this.createClientForm();
  }
  formControl = new UntypedFormControl('', [
    Validators.required,
  ]);

  getErrorMessage() {
    return this.formControl.hasError('required')
      ? 'Required field'
      : this.formControl.hasError('email')
        ? 'Not a valid email'
        : '';
  }
  createClientForm(): UntypedFormGroup {
    return this.fb.group({
      id: [this.action !== 'edit' ? this.lastId : this.clientModel.id, [Validators.required]],
      nit: [this.clientModel.nit, [Validators.required]],
      name: [this.clientModel.name, [Validators.required]],
    });
  }
  submit() {
    // emppty stuff
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
  public confirmAdd(): void {
    if (this.action !== 'edit') {
      this.clientService.addClientRow(
        this.clientModelForm.getRawValue()
      );
    } else {
      this.clientService.updateClientRow(
        this.clientModelForm.getRawValue()
      );
    }
  }
}
