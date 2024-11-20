export class AssetModel {
  id: number;
  plaque: string;
  serie: string;
  model: string;
  assetsType?: number;

  constructor(assetModel: AssetModel) {
    {
      this.id = assetModel.id || 0;
      this.plaque = assetModel.plaque || '';
      this.serie = assetModel.serie || '';
      this.model = assetModel.model || '';
      this.assetsType = assetModel.assetsType || this.id;
    }
  }

}
