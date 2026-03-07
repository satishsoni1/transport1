export interface Consignee {
  id: number;
  name: string;
  address: string;
  city: string;
  gst_no: string;
  contact_person: string;
  mobile: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export const consignees: Consignee[] = [];

let nextId = 1;

export function getNextId() {
  return nextId++;
}
