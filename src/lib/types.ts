export type Role = "OWNER" | "PASABUYER";
export type ItemStatus = "SECURED" | "JP_ADDRESS" | "ONHAND" | "DELIVERED";

export const STATUS_LABEL: Record<ItemStatus, string> = {
  SECURED: "Secured",
  JP_ADDRESS: "JP Address",
  ONHAND: "Onhand",
  DELIVERED: "Delivered",
};
export const STATUSES: ItemStatus[] = ["SECURED", "JP_ADDRESS", "ONHAND", "DELIVERED"];

export type Profile = { id: string; company_id: string; name: string; email: string; role: Role };

export type Customer = { id: string; name: string; shipping_address: string; created_at: string };

export type Item = {
  id: string;
  customer_id: string;
  mercari_url: string;
  mercari_item_id: string | null;
  image_url: string | null;
  jp_price: number;
  rate: number;
  pasabuyer_rate: number;
  total_price: string | number;
  pasabuyer_cost: string | number;
  profit: string | number;
  status: ItemStatus;
  /** The separate "Packed" checkbox (the column keeps its original name; not the same as the Secured status). */
  secured: boolean;
  notes: string;
  created_at: string;
  delivered_at: string | null;
  customers?: { name: string } | null;
};

/** What a Pasabuyer is allowed to see (from the pasabuyer_items view). */
export type PasabuyerItem = {
  id: string;
  mercari_url: string;
  mercari_item_id: string | null;
  image_url: string | null;
  customer_name: string;
  notes: string;
  status: ItemStatus;
  secured: boolean;
  created_at: string;
};

