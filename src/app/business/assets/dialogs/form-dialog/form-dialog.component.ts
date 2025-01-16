import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import {
  UntypedFormControl,
  Validators,
  UntypedFormGroup,
  UntypedFormBuilder,
} from '@angular/forms';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { AssetsService } from '../../assets.service';
import { AssetModel } from 'app/models/assets.model';

export interface DialogData {
  id: number;
  action: string;
  assetModel: AssetModel,
  lastId: number;
}

@Component({
  selector: 'app-form-dialog',
  templateUrl: './form-dialog.component.html',
  styleUrls: ['./form-dialog.component.scss'],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-ES' }],
})
export class FormDialogComponent {
  action: string;
  dialogTitle: string;
  assetModelForm: UntypedFormGroup;
  assetModel: AssetModel;
  lastId = 0;
  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private assetService: AssetsService,
    private fb: UntypedFormBuilder
  ) {
    // Set the defaults
    this.action = data.action;
    if (this.action === 'edit') {
      this.dialogTitle =
        data.assetModel.id + ' ' + data.assetModel.plaque + ' ' + data.assetModel.model;
      this.assetModel = data.assetModel;
    } else {
      this.lastId = data.lastId + 1;
      this.dialogTitle = 'Nuevo registro';
      const blankObject = {} as AssetModel;
      this.assetModel = new AssetModel(blankObject);
    }
    this.assetModelForm = this.createAssetForm();
  }
  formControl = new UntypedFormControl('', [
    Validators.required,
    // Validators.email,
  ]);

  getErrorMessage() {
    return this.formControl.hasError('required')
      ? 'Required field'
      : this.formControl.hasError('email')
        ? 'Not a valid email'
        : '';
  }
  createAssetForm(): UntypedFormGroup {
    return this.fb.group({
      id: [this.lastId, [Validators.required]],
      plaque: [this.assetModel.plaque, [Validators.required]],
      serie: [this.assetModel.serie, [Validators.required]],
      model: [this.assetModel.model, [Validators.required]],
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
      this.assetService.addAssetRow(
        this.assetModelForm.getRawValue()
      );
    } else {
      this.assetService.updateAssetRow(
        this.assetModelForm.getRawValue()
      );
    }
  }
}
