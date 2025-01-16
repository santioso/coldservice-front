export class OrderEntryActivitiesDatesModel {
  totalEntries: number;
  totalOutputs: number;
  totalActives: number;
  entries: EntriesDate[] = [];

  constructor(orderEntryActivitiesDatesModel: OrderEntryActivitiesDatesModel) {
    this.totalEntries = orderEntryActivitiesDatesModel.totalEntries || 0;
    this.totalOutputs = orderEntryActivitiesDatesModel.totalOutputs || 0;
    this.totalActives = orderEntryActivitiesDatesModel.totalActives || 0;
    this.entries = orderEntryActivitiesDatesModel.entries || [];
  }
}

class EntriesDate{
  id: number;
  orderDate: string;
  totalActives: number;

constructor(entriesDate: EntriesDate){
  this.id = entriesDate.id || 0;
  this.orderDate = entriesDate.orderDate;
  this.totalActives = entriesDate.totalActives;
}
}
