export interface FreightRate {
  id: number;
  from_city: string;
  to_city: string;
  rate_per_kg: number;
  min_rate: number;
  vehicle_type: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export const freightRates: FreightRate[] = [];

let nextId = 1;

export function getNextId() {
  return nextId++;
}
