import { apiJson } from "./api";

export type AccountType = "checking" | "wallet" | "cash" | "savings";

export type Account = {
  _id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  bankCode?: string | null;
  color?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AccountWithBalance = Account & {
  totalIncome: number;
  totalExpense: number;
  currentBalance: number;
};

export type CreateAccountPayload = {
  name: string;
  type: AccountType;
  initialBalance: number;
  bankCode?: string | null;
  color?: string;
  isActive?: boolean;
};

export type UpdateAccountPayload = Partial<CreateAccountPayload>;

type ApiListResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type ApiMessageResponse = {
  success: boolean;
  message?: string;
  data?: unknown;
};

export async function fetchAccounts(): Promise<Account[]> {
  const response = await apiJson<ApiListResponse<Account[]>>("/accounts");
  return response.data;
}

export async function fetchAccountsWithBalance(): Promise<AccountWithBalance[]> {
  const response = await apiJson<ApiListResponse<AccountWithBalance[]>>(
    "/accounts/with-balance"
  );
  return response.data;
}

export async function fetchAccountByIdWithBalance(
  id: string
): Promise<AccountWithBalance> {
  const response = await apiJson<ApiListResponse<AccountWithBalance>>(
    `/accounts/${id}/with-balance`
  );
  return response.data;
}

export async function createAccount(
  payload: CreateAccountPayload
): Promise<Account> {
  const response = await apiJson<ApiListResponse<Account>>("/accounts", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function updateAccount(
  id: string,
  payload: UpdateAccountPayload
): Promise<Account> {
  const response = await apiJson<ApiListResponse<Account>>(`/accounts/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return response.data;
}

export async function deleteAccount(id: string): Promise<{ message?: string }> {
  const response = await apiJson<ApiMessageResponse>(`/accounts/${id}`, {
    method: "DELETE",
  });

  return {
    message: response.message,
  };
}