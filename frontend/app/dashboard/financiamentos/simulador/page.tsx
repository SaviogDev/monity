'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp, AlertTriangle } from 'lucide-react';
import { apiJson } from '@/services/api';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export default function FinancingSimulatorPage() {
  const [form, setForm] = useState({
    assetValue: '',
    downPayment: '',
    months: '',
    rate: '',
  });

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const principal = useMemo(() => {
    const total = Number(form.assetValue) || 0;
    const down = Number(form.downPayment) || 0;
    return Math.max(0, total - down);
  }, [form]);

  const handleSimulate = async () => {
    if (!principal || !form.months || !form.rate) return;

    try {
      setLoading(true);

      const data = await apiJson('/financings/simulate', {
        method: 'POST',
        body: JSON.stringify({
          principal,
          rate: Number(form.rate) / 100,
          months: Number(form.months),
        }),
      });

      setResult(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      
      {/* HEADER */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
            <Calculator />
          </div>
          <h1 className="text-3xl font-black">Simulador de Financiamento</h1>
        </div>
        <p className="text-slate-500">
          Compare cenários e descubra o impacto real antes de assumir a dívida.
        </p>
      </div>

      {/* INPUT */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <Input label="Valor do bem" value={form.assetValue} onChange={(v)=>setForm({...form, assetValue:v})}/>
        <Input label="Entrada" value={form.downPayment} onChange={(v)=>setForm({...form, downPayment:v})}/>
        <Input label="Prazo (meses)" value={form.months} onChange={(v)=>setForm({...form, months:v})}/>
        <Input label="Taxa (% ao mês)" value={form.rate} onChange={(v)=>setForm({...form, rate:v})}/>

        <div className="col-span-2 bg-blue-50 p-4 rounded-xl flex justify-between">
          <span className="font-bold text-blue-700">Valor financiado:</span>
          <span className="font-black text-blue-900">
            {formatCurrency(principal)}
          </span>
        </div>

        <button
          onClick={handleSimulate}
          className="col-span-2 h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-black shadow-lg"
        >
          {loading ? 'Simulando...' : 'Simular'}
        </button>
      </div>

      {/* RESULTADO */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-2 gap-6"
        >
          
          <ResultCard
            title="PRICE"
            main={formatCurrency(result.price.installment)}
            details={[
              ['Total Pago', formatCurrency(result.price.totalPaid)],
              ['Juros', formatCurrency(result.price.totalInterest)],
            ]}
            color="blue"
          />

          <ResultCard
            title="SAC"
            main={`${formatCurrency(result.sac.firstInstallment)} → ${formatCurrency(result.sac.lastInstallment)}`}
            details={[
              ['Total Pago', formatCurrency(result.sac.totalPaid)],
              ['Juros', formatCurrency(result.sac.totalInterest)],
            ]}
            color="amber"
          />

        </motion.div>
      )}
    </div>
  );
}

function Input({ label, value, onChange }: any) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-4 rounded-2xl border bg-slate-50 font-bold text-lg"
      />
    </div>
  );
}

function ResultCard({ title, main, details, color }: any) {
  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-lg border">
      <h3 className="text-xl font-black mb-4">{title}</h3>
      <p className="text-2xl font-black mb-4">{main}</p>

      <div className="space-y-2">
        {details.map(([label, value]: any, i: number) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="font-bold">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}