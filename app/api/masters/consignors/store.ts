export interface Consignor {
  id: number;
  name: string;
  address: string;
  city: string;
  gst_no: string;
  contact_person: string;
  mobile: string;
  bank_name: string;
  account_no: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export const consignors: Consignor[] = [];

let nextId = 1;

export function getNextId() {
  return nextId++;
}
