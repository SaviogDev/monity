"use client";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  GripVertical,
  Eye,
  EyeOff,
  Settings2,
  RotateCcw,
  Check,
} from "lucide-react";
import { WidgetConfig, WidgetId } from "@/hooks/useDashboardLayout";
interface Props {
  isOpen: boolean;
  onClose: () => void;
  layout: WidgetConfig[];
  onToggle: (id: WidgetId) => void;
  onReorder: (startIndex: number, endIndex: number) => void;
  onReset: () => void;
}
export function DashboardCustomizer({
  isOpen,
  onClose,
  layout,
  onToggle,
  onReorder,
  onReset,
}: Props) {
  // Drag and Drop handlers (Native HTML5) const handleDragStart = (e: React.DragEvent, index: number) => { e.dataTransfer.setData('widgetIndex', index.toString()); e.dataTransfer.effectAllowed = 'move'; }; const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }; const handleDrop = (e: React.DragEvent, targetIndex: number) => { e.preventDefault(); const sourceIndex = parseInt(e.dataTransfer.getData('widgetIndex')); if (sourceIndex !== targetIndex) { onReorder(sourceIndex, targetIndex); } }; return ( <AnimatePresence> {isOpen && ( <> {/* Backdrop */} <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-[110] bg-slate-900/40" /> {/* Drawer */} <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring' as const, damping: 25, stiffness: 200 }} className="fixed inset-y-0 right-0 z-[111] w-full max-w-sm border-l border-[var(--border)]/60 dark:border-white/5 dark:border-white/10 bg-[var(--bg-card)] dark:bg-slate-900/80 shadow-2xl -2xl" > <div className="flex h-full flex-col"> {/* Header */} <div className="flex items-center justify-between border-b border-[var(--border)] dark:border-white/5 px-6 py-6"> <div className="flex items-center gap-3"> <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3498DB]/10 text-[#3498DB]"> <Settings2 size={20} /> </div> <div> <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Personalizar Painel</h2> <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Layout e Widgets</p> </div> </div> <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-[var(--bg-card)]/5 transition-colors" > <X size={20} /> </button> </div> {/* List */} <div className="flex-1 overflow-y-auto p-4 scrollbar-hide"> <div className="space-y-2"> <p className="px-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400"> Arraste para reordenar </p> {layout.map((widget, index) => ( <div key={widget.id} draggable onDragStart={(e) => handleDragStart(e, index)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, index)} className={`group flex items-center justify-between rounded-2xl border-2 p-3 transition-all ${ widget.visible ? 'border-transparent bg-[var(--bg-card)] dark:bg-[var(--bg-card)]/5 shadow-sm' : 'border-dashed border-[var(--border)] dark:border-white/5 opacity-50 bg-[var(--bg-surface)] dark:bg-transparent' }`} > <div className="flex items-center gap-3"> <div className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-400"> <GripVertical size={18} /> </div> <span className="text-sm font-bold text-slate-900 dark:text-white dark:text-slate-200"> {widget.label} </span> </div> <button onClick={() => onToggle(widget.id)} className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${ widget.visible ? 'bg-[#2ECC71]/10 text-[#2ECC71]' : 'bg-slate-100 dark:bg-[var(--bg-card)]/5 text-slate-400' }`} > {widget.visible ? <Eye size={16} /> : <EyeOff size={16} />} </button> </div> ))} </div> </div> {/* Footer */} <div className="border-t border-[var(--border)] dark:border-white/5 bg-[var(--bg-surface)] dark:bg-[var(--bg-card)]/5 p-6"> <div className="flex flex-col gap-3"> <button onClick={onReset} className="flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--border)] dark:border-white/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 transition-all hover:bg-slate-100 dark:hover:bg-[var(--bg-card)]/5" > <RotateCcw size={14} /> Restaurar Padrão </button> <button onClick={onClose} className="flex items-center justify-center gap-2 rounded-xl bg-[#34495E] px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-[#34495E]/20 transition-all hover:scale-[1.02] active:scale-[0.98]" > <Check size={14} /> Salvar Alterações </button> </div> </div> </div> </motion.div> </> )} </AnimatePresence> );
}
