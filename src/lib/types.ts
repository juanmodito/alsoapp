export interface Product {
  product_key: string;
  name: string;
  code: string;
  description: string;
  annual_cost: number;
  monthly_cost: number;
  daily_cost: number;
  annual: boolean;
  sku_id?: string;
  active: boolean;
  category?: string;
  subscriptionId?: string;
  currentSeats?: number;
  licensedSeats?: number;
}

export interface Subscription {
  subscriptionId: string;
  customerDomain: string;
  skuId: string;
  skuName: string;
  status: string;
  plan?: {
    planName: string;
  };
  seats?: {
    numberOfSeats?: number;
    maximumNumberOfSeats?: number;
    licensedNumberOfSeats?: number;
  };
  billingMethod?: string;
  creationTime?: string;
}

export interface UserProfile {
  email: string;
  customerDomain: string;
  organizationName: string;
  roles: string[];
}

export interface OrderRequest {
  user_id: string;
  customer_domain: string;
  organization_name: string;
  product: string;
  product_name: string;
  licenses: number;
  comments?: string;
  cost_each?: number;
  total_cost?: number;
  subscription_id?: string;
}
