export interface Bank {
  id: number;
  bank_name: string;
  branch: string;
  ifsc_code: string;
  account_no: string;
  account_holder: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export const banks: Bank[] = [];

let nextId = 1;

export function getNextId() {
  return nextId++;
}

