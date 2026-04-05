'use client';

import { useState } from 'react';
import { X, Upload, Check, AlertCircle, Loader2 } from 'lucide-react';
// IMPORTAÇÃO CORRIGIDA: Adicionamos o apiRequest aqui
import { apiJson, apiRequest } from '@/services/api'; 
import { useFinancialStore } from '@/stores/financial-store';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const { accounts, loadAll } = useFinancialStore();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file || !selectedAccountId) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Usamos o apiRequest que já sabe lidar com FormData e embute o token perfeitamente
      const result: any = await apiRequest('/import/ofx', {
        method: 'POST',
        body: formData,
      });

      // A nossa apiRequest já formata o erro se der ruim, então só precisamos 
      // lidar com o caminho de sucesso (ou se a sua API retorna {success: true, data: ...})
      if (result.success) {
        setPreview(result.data);
      } else {
        throw new Error(result.message || 'Erro ao processar arquivo.');
      }
      
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Erro ao ler arquivo OFX. Verifique se o formato é válido.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAll = async () => {
    setLoading(true);
    try {
      // Envia as transações confirmadas para o banco
      for (const tx of preview) {
        await apiJson('/transactions', {
          method: 'POST',
          body: JSON.stringify({ ...tx, account: selectedAccountId }),
        });
      }
      loadAll();
      onClose();
      setPreview([]);
      setFile(null);
    } catch (error) {
      alert('Erro ao salvar algumas transações.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-800">Importação Inteligente</h2>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Arquivo OFX do Banco</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>

        <div className="p-6 overflow-y-auto">
          {preview.length === 0 ? (
            <div className="space-y-6">
              {/* Passo 1: Escolher a Conta */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">1. Para qual conta vai esse extrato?</label>
                <select 
                  className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-[#1ABC9C]"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                >
                  <option value="">Selecione a conta...</option>
                  {accounts.map(acc => <option key={acc._id} value={acc._id}>{acc.name}</option>)}
                </select>
              </div>

              {/* Passo 2: Upload */}
              <div 
                className={`border-2 border-dashed rounded-3xl p-10 text-center transition-colors ${file ? 'border-[#1ABC9C] bg-green-50' : 'border-slate-200 hover:border-[#1ABC9C]'}`}
              >
                <input type="file" accept=".ofx" onChange={handleFileChange} className="hidden" id="ofx-upload" />
                <label htmlFor="ofx-upload" className="cursor-pointer flex flex-col items-center">
                  <Upload size={48} className={file ? 'text-[#1ABC9C]' : 'text-slate-300'} />
                  <span className="mt-4 font-bold text-slate-700">
                    {file ? file.name : 'Clique para buscar o arquivo .OFX'}
                  </span>
                  <span className="text-xs text-slate-400 mt-1">Baixe o extrato OFX no app do seu banco</span>
                </label>
              </div>

              <button 
                onClick={handleUpload}
                disabled={!file || !selectedAccountId || loading}
                className="w-full bg-[#1ABC9C] text-white font-black py-4 rounded-2xl disabled:opacity-50 shadow-lg shadow-[#1ABC9C]/20"
              >
                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Analisar Extrato'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-xl mb-4">
                <Check size={20} />
                <span className="font-bold text-sm">Encontramos {preview.length} transações prontas!</span>
              </div>
              
              {preview.map((tx, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-white shadow-sm">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm truncate max-w-[250px]">{tx.description}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(tx.transactionDate).toLocaleDateString('pt-BR')} 
                      {tx.category ? ' • Categoria detectada' : ' • Sem categoria'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-black ${tx.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {tx.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {preview.length > 0 && (
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
            <button 
              onClick={() => setPreview([])} 
              className="flex-1 py-4 font-bold text-slate-500"
            >
              Cancelar
            </button>
            <button 
              onClick={handleConfirmAll} 
              disabled={loading}
              className="flex-[2] bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><Check size={20} /> Confirmar Importação</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}