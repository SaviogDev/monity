import { apiJson } from './api';

export type AccountType = 'checking' | 'wallet' | 'cash' | 'savings';

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

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

type ApiMessageResponse = {
  success: boolean;
  message?: string;
  data?: unknown;
};

function normalizeAccount(account: Account): Account {
  return {
    ...account,
    initialBalance: Number(account.initialBalance || 0),
    isActive: account.isActive !== false,
  };
}

function normalizeAccountWithBalance(account: AccountWithBalance): AccountWithBalance {
  return {
    ...normalizeAccount(account),
    totalIncome: Number(account.totalIncome || 0),
    totalExpense: Number(account.totalExpense || 0),
    currentBalance: Number(account.currentBalance || 0),
  };
}

export async function fetchAccounts(): Promise<Account[]> {
  const response = await apiJson<ApiResponse<Account[]>>('/accounts', {
    method: 'GET',
  });

  return Array.isArray(response.data) ? response.data.map(normalizeAccount) : [];
}

export async function fetchAccountsWithBalance(): Promise<AccountWithBalance[]> {
  const response = await apiJson<ApiResponse<AccountWithBalance[]>>('/accounts/with-balance', {
    method: 'GET',
  });

  return Array.isArray(response.data)
    ? response.data.map(normalizeAccountWithBalance)
    : [];
}

export async function fetchAccountByIdWithBalance(
  id: string
): Promise<AccountWithBalance> {
  const response = await apiJson<ApiResponse<AccountWithBalance>>(
    `/accounts/${id}/with-balance`,
    {
      method: 'GET',
    }
  );

  return normalizeAccountWithBalance(response.data);
}

export async function createAccount(
  payload: CreateAccountPayload
): Promise<Account> {
  const response = await apiJson<ApiResponse<Account>>('/accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return normalizeAccount(response.data);
}

export async function updateAccount(
  id: string,
  payload: UpdateAccountPayload
): Promise<Account> {
  const response = await apiJson<ApiResponse<Account>>(`/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return normalizeAccount(response.data);
}

export async function deleteAccount(
  id: string
): Promise<{ message?: string }> {
  const response = await apiJson<ApiMessageResponse>(`/accounts/${id}`, {
    method: 'DELETE',
  });

  return {
    message: response.message,
  };
}