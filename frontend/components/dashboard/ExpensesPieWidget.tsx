"use client";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
interface ExpenseCategory {
  name: string;
  value: number;
  color: string;
}
interface Props {
  data: ExpenseCategory[];
}
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};
export function ExpensesPieWidget({ data }: Props) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex flex-col rounded-[2.5rem] border border-[var(--border)]/60 dark:border-white/5 bg-[var(--bg-card)] dark:bg-[#101216] p-8 shadow-sm"
    >
      {" "}
      <div className="flex items-center justify-between mb-8">
        {" "}
        <div className="flex items-center gap-4">
          {" "}
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
            {" "}
            <PieChartIcon size={24} />{" "}
          </div>{" "}
          <div>
            {" "}
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Gastos por Categoria
            </h2>{" "}
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Distribuição mensal
            </p>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <div className="h-[300px] w-full">
        {" "}
        {data.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
            {" "}
            <PieChartIcon size={40} className="mb-3 opacity-20" />{" "}
            <p className="text-sm font-bold">Sem dados para exibir</p>{" "}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {" "}
            <PieChart>
              {" "}
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {" "}
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}{" "}
              </Pie>{" "}
              <Tooltip
                contentStyle={{
                  borderRadius: "1rem",
                  border: "none",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  background: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(8px)",
                }}
                labelStyle={{ fontWeight: 900, color: "#1E293B" }}
                formatter={(value: any) => [
                  new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(value as number),
                  "Gasto",
                ]}
              />{" "}
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value) => (
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {value}
                  </span>
                )}
              />{" "}
            </PieChart>{" "}
          </ResponsiveContainer>
        )}{" "}
      </div>{" "}
    </motion.div>
  );
}
