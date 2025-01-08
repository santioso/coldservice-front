export interface DetailOrderServiceModel {
  id: number;
  created_at: Date;
  status: string;
  observaciones: string;
  technicals: TechnicalInterface[];
}


export interface TechnicalInterface {
  id: number;
  name: string;
  address: string;
  position: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}