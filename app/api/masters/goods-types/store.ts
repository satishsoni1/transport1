export interface GoodsType {
  id: number;
  type_name: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export const goodsTypes: GoodsType[] = [];

let nextId = 1;

export function getNextId() {
  return nextId++;
}
