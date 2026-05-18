'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Receipt, Loader2, CreditCard, ShoppingBag, Calendar } from 'lucide-react';
import { toast } from 'sonner';

type Transaction = {
  _id: string;
  description: string;
  amount: number;
  date: string; 
  installmentNumber?: number; 
  totalInstallments?: number; 
};

type CreditCardHistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  creditCardId: string | null;
  cardName?: string;
};

export function CreditCardHistoryModal({ 
  isOpen, 
  onClose, 
  creditCardId,
  cardName = "Cartão de Crédito"
}: CreditCardHistoryModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !creditCardId) return;

    async function fetchHistory() {
      try {
        setLoading(true);
        const token = localStorage.getItem('token') || localStorage.getItem('monity_token') || '';
        
        // Apontando para o seu backend Node.js
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        
        const response = await fetch(`${apiUrl}/credit-cards/${creditCardId}/transactions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error('Falha ao carregar histórico');

        const result = await response.json();
        
        // Extrai o array do padrão { success: true, data: [...] } do seu backend
        const data = result.data || result;
        setTransactions(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error('Erro ao buscar a fatura do cartão.');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [isOpen, creditCardId]);

  // Formatar Moeda (BRL)
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  // Formatar Data
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
          {/* Fundo escuro com Blur (Overlay) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* O Modal Central */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl"
          >
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)] p-6 sm:p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3498DB]/10 text-[#3498DB]">
                  <CreditCard size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-slate-100">Fatura Aberta</h3>
                  <p className="mt-0.5 text-sm font-bold text-slate-400">{cardName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-400"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Corpo / Lista de Transações */}
            <div className="max-h-[50vh] overflow-y-auto p-4 sm:p-6 bg-[#f4f8fb]/50">
              {loading ? (
                <div className="flex h-40 flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-[#3498DB]" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Descriptografando fatura...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
                  <Receipt size={48} className="text-slate-300" strokeWidth={1.5} />
                  <p className="text-sm font-bold text-slate-500">Nenhuma compra registrada neste cartão ainda.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx._id} className="flex items-center justify-between rounded-[1.25rem] border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--bg-surface)] text-slate-400">
                          <ShoppingBag size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-100">
                            {tx.description || 'Compra'}
                            {/* Renderiza a parcela apenas se houver mais de 1 */}
                            {tx.installmentNumber && tx.totalInstallments && tx.totalInstallments > 1 && (
                              <span className="ml-1.5 text-xs font-bold text-[#3498DB]">
                                ({tx.installmentNumber}/{tx.totalInstallments})
                              </span>
                            )}
                          </p>
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-slate-400">
                            <Calendar size={12} />
                            {formatDate(tx.date)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-slate-100">{formatCurrency(tx.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}