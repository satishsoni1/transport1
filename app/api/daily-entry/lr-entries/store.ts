export interface GoodsItem {
  description: string;
  qty: number;
  type: string;
  weight_kg: number;
  rate: number;
  amount: number;
}

export interface LREntry {
  id: number;
  lr_no: string;
  lr_date: string;
  consignor_id: number;
  consignee_id: number;
  from_city: string;
  to_city: string;
  delivery_address: string;
  freight: number;
  hamali: number;
  lr_charge: number;
  advance: number;
  balance: number;
  invoice_no: string;
  invoice_date: string;
  truck_no: string;
  driver_name: string;
  driver_mobile: string;
  eway_no: string;
  remarks: string;
  goods_items: GoodsItem[];
  status: 'to_pay' | 'paid' | 'tbb';
  created_at: string;
}

export const lrEntries: LREntry[] = [];

let nextId = 1;

export function getNextId() {
  return nextId++;
}

export function generateLRNo(id: number) {
  return `LR${String(id).padStart(5, '0')}`;
}
