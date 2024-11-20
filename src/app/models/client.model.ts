export class ClientModel {
  id: number;
  nit: string;
  name: string;

  constructor(clientModel: ClientModel) {
    {
      this.id = clientModel.id || 0;
      this.nit = clientModel.nit || '';
      this.name = clientModel.name || '';
    }
  }

}
