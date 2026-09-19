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
  // Price and rates are optional, so the values computed from them are NULL until they are set.
  jp_price: number | null;
  rate: number | null;
  pasabuyer_rate: number | null;
  total_price: string | number | null;
  pasabuyer_cost: string | number | null;
  profit: string | number | null;
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
  notes: string;
  status: ItemStatus;
  created_at: string;
};

