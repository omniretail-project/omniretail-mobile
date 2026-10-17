export type ApiLoginResponse = {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    type: "customer" | "employee";
    tenantId: string;
    roleId?: string | null;
    branchId?: string | null;
  };
};

export type ApiMfaChallengeResponse = {
  mfaRequired: true;
  challengeToken: string;
  method: "email" | "totp";
  expiresAt: string;
};

export type ApiLoginOutcome = ApiLoginResponse | ApiMfaChallengeResponse;

export type ApiRegisterCustomerResponse = {
  message: string;
  user: {
    name: string;
    email: string;
    type: "customer" | "employee";
  };
};

export type ApiCurrentSessionResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    type: "customer" | "employee";
    status: string;
    tenantId: string;
    customerId?: string | null;
    employeeCode?: string | null;
    roleId?: string | null;
    branchId?: string | null;
    allowedBranchIds: string[];
    createdAt: string;
    updatedAt: string;
  };
  role?: unknown | null;
  tenant: {
    id: string;
    name: string;
    slug: string;
    legalName?: string | null;
    status: string;
    defaultCurrency: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
  };
  session: {
    id: string;
    expiresAt: string;
    rememberMe?: boolean | null;
    activeBranchId?: string | null;
    createdAt: string;
    deviceLabel?: string | null;
  };
};
