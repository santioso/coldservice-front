import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
  FormArray,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { OrdenesServicioService } from 'app/ordenes-servicio/ordenes-servicio.service';
import { TechnicalInterface } from './add-detail-dialog.model';

@Component({
  selector: 'app-add-detail-dialog',
  templateUrl: './add-detail-dialog.component.html',
  styleUrls: ['./add-detail-dialog.component.css'],
})
export class AddDetailDialogComponent {
  addDetailForm: UntypedFormGroup;
  statusOptions: string[] = [];
  technicalOptions: TechnicalInterface[] = [];

  constructor(
    public dialogRef: MatDialogRef<AddDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: UntypedFormBuilder,
    private ordenesServicioService: OrdenesServicioService
  ) {
    this.addDetailForm = this.fb.group({
      id: [data.detail?.id || null],
      serviceOrderId: [
        data.serviceOrderId || data.detail?.serviceOrderId,
      ],
      observaciones: [data.detail?.observaciones || '', Validators.required],
      status: [data.detail?.status || '', Validators.required],
      technicals: this.fb.array(
        Array.isArray(data.detail?.technicals) ? data.detail.technicals.map((tech: any) =>
          this.fb.group({
            id: [tech.id, Validators.required],
          })
        ) : [this.fb.group({ id: ['', Validators.required] })]
      ),
    });
  }

  ngOnInit(): void {
    this.ordenesServicioService.getStatus().subscribe((status: string[]) => {
      this.statusOptions = status;
    });

    this.ordenesServicioService
      .getTechnicals()
      .subscribe((technicals: TechnicalInterface[]) => {
        this.technicalOptions = technicals;
        console.log('this.technicalOptions', this.technicalOptions);
      });
  }

  get technicals(): FormArray {
    return this.addDetailForm.get('technicals') as FormArray;
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  onSaveClick(): void {
    if (this.addDetailForm.valid) {
      this.dialogRef.close(this.addDetailForm.value);
    }
  }
}
