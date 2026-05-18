'use client';

import { useState, useEffect } from 'react';

export type WidgetId = 
  | 'summary' 
  | 'cash_flow' 
  | 'recent_transactions' 
  | 'accounts_cards'
  | 'upcoming_bills'
  | 'expenses_pie'
  | 'goals_progress'
  | 'cards_summary';

export interface WidgetConfig {
  id: WidgetId;
  label: string;
  visible: boolean;
  order: number;
}

const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: 'summary', label: 'Resumo de Métricas', visible: true, order: 0 },
  { id: 'cash_flow', label: 'Fluxo de Caixa', visible: true, order: 1 },
  { id: 'recent_transactions', label: 'Transações Recentes', visible: true, order: 2 },
  { id: 'accounts_cards', label: 'Minhas Contas', visible: true, order: 3 },
  { id: 'goals_progress', label: 'Metas em Andamento', visible: true, order: 4 },
  { id: 'cards_summary', label: 'Resumo dos Cartões', visible: true, order: 5 },
  { id: 'upcoming_bills', label: 'Contas Próximas', visible: true, order: 6 },
  { id: 'expenses_pie', label: 'Distribuição de Gastos', visible: true, order: 7 },
];

export function useDashboardLayout() {
  const [layout, setLayout] = useState<WidgetConfig[]>(DEFAULT_LAYOUT);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('monity_dashboard_layout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with DEFAULT_LAYOUT to handle new widgets added in updates
        const merged = DEFAULT_LAYOUT.map(def => {
          const found = parsed.find((p: WidgetConfig) => p.id === def.id);
          return found ? { ...def, ...found } : def;
        }).sort((a, b) => a.order - b.order);
        
        setLayout(merged);
      } catch (e) {
        setLayout(DEFAULT_LAYOUT);
      }
    }
    setIsLoaded(true);
  }, []);

  const updateLayout = (newLayout: WidgetConfig[]) => {
    const sorted = [...newLayout].map((item, index) => ({ ...item, order: index }));
    setLayout(sorted);
    localStorage.setItem('monity_dashboard_layout', JSON.stringify(sorted));
  };

  const toggleWidget = (id: WidgetId) => {
    const newLayout = layout.map(w => 
      w.id === id ? { ...w, visible: !w.visible } : w
    );
    updateLayout(newLayout);
  };

  const reorderWidget = (startIndex: number, endIndex: number) => {
    const result = Array.from(layout);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    updateLayout(result);
  };

  const resetLayout = () => {
    updateLayout(DEFAULT_LAYOUT);
  };

  return {
    layout,
    isLoaded,
    toggleWidget,
    reorderWidget,
    resetLayout,
    updateLayout
  };
}
