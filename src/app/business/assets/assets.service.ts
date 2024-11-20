import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { AssetModel } from 'app/models/assets.model';


@Injectable({
  providedIn: 'root'
})
export class AssetsService extends UnsubscribeOnDestroyAdapter {
  private _notifications: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
  #apiUrl = `${environment.apiUrl}/`;
  isTblLoading = true;

  dataChange: BehaviorSubject<AssetModel[]> = new BehaviorSubject<
  AssetModel[]
>([]);

// Temporarily stores data from dialogs
  dialogData!: AssetModel;


constructor(private _httpClient: HttpClient) {
  super();
}

getAll(): Observable<AssetModel[]> {
  return this._httpClient.get<AssetModel[]>(`${this.#apiUrl}asset`)
}

getDialogData() {
  return this.dialogData;
}


// ***************************************


  // get data(): AdvanceTable[] {
  //   return this.dataChange.value;
  // }

  /** CRUD METHODS */
  getAllAdvanceTables(): void {
    this.subs.sink = this._httpClient
      .get<AssetModel[]>( this.#apiUrl)
      .subscribe({
        next: (data) => {
          this.isTblLoading = false;
          this.dataChange.next(data);
        },
        error: (error: HttpErrorResponse) => {
          this.isTblLoading = false;
          console.log(error.name + ' ' + error.message);
        },
      });
  }

  addAssetRow(asset: AssetModel): void {
    this.dialogData = asset;
    console.log('asset', asset)
    asset.assetsType = asset.id;
    this._httpClient.post(`${this.#apiUrl}asset`, asset)
       .subscribe({
         next: () => {
           this.dialogData = asset;
         },
         error: (error: HttpErrorResponse) => {
          console.error(error);
         },
       });
  }

  updateAssetRow(asset: AssetModel): void {
    asset.assetsType = 2;
    const { id, ...newAsset } = asset;
    this._httpClient.patch(`${this.#apiUrl}asset/${id}`, newAsset)
    .subscribe({
      next: () => {
        this.dialogData = asset;
      },
      error: (error: HttpErrorResponse) => {
       console.error(error);
      },
    });
  }

  deleteAssetRow(id: number): void {
    console.log(id);
    this._httpClient.delete(`${this.#apiUrl}asset/${id}`)
      .subscribe({
        next: () => {
          console.log(id);
        },
        error: (error: HttpErrorResponse) => {
              console.log(error)
        },
    });
  }
}
