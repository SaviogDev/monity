'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, AlertTriangle, Loader2 } from 'lucide-react';

type BudgetData = {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  limit: number;
  spent: number;
  percentage: number;
  isOverBudget: boolean;
};

export function BudgetSummary() {
  const [budgets, setBudgets] = useState<BudgetData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBudgets() {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('monity_token') || '';
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        
        // Puxando o orçamento do mês atual
        const response = await fetch(`${apiUrl}/categories/budgets/summary`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const result = await response.json();
          setBudgets(result.data || []);
        }
      } catch (error) {
        console.error('Erro ao carregar orçamentos:', error);
      } finally {
        setLoading(false);
      }
    }

    loadBudgets();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] shadow-sm backdrop-blur-xl">
        <Loader2 className="animate-spin text-[#3498DB]" size={28} />
      </div>
    );
  }

  if (budgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center shadow-sm backdrop-blur-xl">
        <Target size={40} className="mb-3 text-slate-300" />
        <p className="text-sm font-black text-slate-100">Nenhum orçamento definido</p>
        <p className="mt-1 text-xs font-bold text-slate-400">Edite suas categorias para adicionar limites de gastos mensais.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[2.5rem] border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm backdrop-blur-xl sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-500 shadow-inner">
          <Target size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-xl font-black tracking-tight text-slate-100">Meus Orçamentos</h3>
          <p className="text-xs font-bold text-slate-400">Controle de limites por categoria neste mês</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {budgets.map((budget, index) => {
          // Lógica de cores da barra
          let barColor = 'bg-[#2ECC71]'; // Verde (tranquilo)
          if (budget.percentage >= 80) barColor = 'bg-[#F1C40F]'; // Amarelo (alerta)
          if (budget.percentage >= 100) barColor = 'bg-[#FF3366]'; // Vermelho (estourou)

          // Impede a barra visual de passar de 100% para não quebrar o layout
          const visualPercentage = Math.min(budget.percentage, 100);

          return (
            <motion.div
              key={budget.categoryId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative overflow-hidden rounded-[1.5rem] border bg-[var(--bg-card)] p-5 shadow-sm transition-all hover:shadow-md ${
                budget.isOverBudget ? 'border-[#FF3366]/30 bg-rose-50/30' : 'border-[var(--border)]'
              }`}
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl shadow-sm" style={{ backgroundColor: `${budget.color}20` }}>
                    <span className="text-lg">{budget.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-100">{budget.name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Limite: {formatCurrency(budget.limit)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-base font-black ${budget.isOverBudget ? 'text-[#FF3366]' : 'text-slate-100'}`}>
                    {formatCurrency(budget.spent)}
                  </p>
                  {budget.isOverBudget && (
                    <div className="mt-1 flex items-center gap-1 text-[9px] font-black uppercase text-[#FF3366]">
                      <AlertTriangle size={10} /> Estourado
                    </div>
                  )}
                </div>
              </div>

              {/* Barra de Progresso */}
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>Progresso</span>
                  <span className={budget.isOverBudget ? 'text-[#FF3366]' : ''}>
                    {budget.percentage.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${visualPercentage}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${barColor} ${budget.isOverBudget ? 'animate-pulse' : ''}`}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}