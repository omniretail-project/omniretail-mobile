// Contratos de /api/v1/me/*, /api/v1/customer/orders y /api/v1/public/{slug}/config.

export type ApiCustomerProfileResponse = {
  id: string;
  tenantId: string;
  userId: string;
  code: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiUpdateCustomerProfileRequest = {
  name: string;
  phone: string | null;
};

export type ApiAddressRequest = {
  label: string;
  recipientName: string;
  line1: string;
  line2?: string | null;
  city: string;
  stateOrDepartment: string;
  postalCode?: string | null;
  country?: string | null;
  references?: string | null;
};

export type ApiAddressResponse = ApiAddressRequest & {
  id: string;
  tenantId: string;
  customerId: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiCreatePaymentMethodRequest = {
  brand: string;
  issuingBank: string;
  last4: string;
  expirationMonth: number;
  expirationYear: number;
  cardholderName?: string | null;
};

export type ApiPaymentMethodResponse = {
  id: string;
  tenantId: string;
  customerId: string;
  type: string;
  brand: string;
  issuingBank: string;
  last4: string;
  expirationMonth: number;
  expirationYear: number;
  cardholderName?: string | null;
  isDefault: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiPageResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type ApiCustomerOrderResponse = {
  id: string;
  orderNumber: string;
  status: string;
  itemCount: number;
  total: number;
  createdAt: string;
  deliveryMethod: string;
};

export type ApiCustomerOrderDetailResponse = {
  orderNumber: string;
  status: string;
  createdAt: string;
  trackingToken?: string | null;
  subtotal: number;
  shippingTotal: number;
  total: number;
  deliveryAddress?: {
    recipientName?: string | null;
    recipientPhone?: string | null;
    city?: string | null;
    department?: string | null;
    country?: string | null;
    references?: string | null;
  } | null;
  items: {
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  payment?: {
    method?: string | null;
    status?: string | null;
    reference?: string | null;
  } | null;
};

export type ApiStorefrontBranch = {
  id: string;
  code?: string | null;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type ApiStorefrontShippingConfig = {
  enabled: boolean;
  deliveryFee: number;
  freeShippingThreshold: number;
};

export type ApiStorefrontConfigResponse = {
  tenantId: string;
  enabled: boolean;
  storeName: string;
  logoUrl?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  requireAccountForCheckout: boolean;
  guestTrackingEnabled: boolean;
  slides: {
    title?: string | null;
    description?: string | null;
    imageUrl?: string | null;
  }[];
  branches: ApiStorefrontBranch[];
  shipping?: ApiStorefrontShippingConfig | null;
};
