import { apiJson } from './api';
import type { Transaction } from './transactions';

export type InvoiceTiming = 'past' | 'current' | 'future';
export type InvoiceStatus = 'open' | 'closed' | 'partial';

export interface Invoice {
  cardId: string;
  cardName: string;
  bankCode?: string | null;
  color?: string | null;
  closingDay: number;
  dueDay: number;
  monthKey: string;
  competencyDate: string;
  timing: InvoiceTiming;
  status: InvoiceStatus;
  total: number;
  confirmedTotal: number;
  plannedTotal: number;
  transactionCount: number;
  availableCardLimit: number;
  transactions: Transaction[];
}

interface InvoicesResponse {
  success: boolean;
  data: Invoice[];
}

interface InvoiceResponse {
  success: boolean;
  data: Invoice;
}

export async function fetchInvoices() {
  const response = await apiJson<InvoicesResponse>('/invoices', {
    method: 'GET',
  });

  return response.data;
}

export async function fetchInvoiceByCardAndMonth(cardId: string, monthKey: string) {
  const response = await apiJson<InvoiceResponse>(`/invoices/${cardId}/${monthKey}`, {
    method: 'GET',
  });

  return response.data;
}