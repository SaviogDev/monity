"use client";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart as BarChartIcon } from "lucide-react";
interface CashFlowData {
  date: string;
  saldo: number;
}
interface Props {
  data: CashFlowData[];
  selectedDate?: Date;
}
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};
const fmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
export function CashFlowWidget({ data, selectedDate }: Props) {
  const finalSaldo = data.length > 0 ? data[data.length - 1].saldo : 0;
  const isPositive = finalSaldo >= 0;
  const color = isPositive ? "#2ECC71" : "#FF3366";
  const title = selectedDate
    ? `${MONTH_NAMES[selectedDate.getMonth()]} / ${selectedDate.getFullYear()}`
    : "Mês atual";
  const hasData = data.some((d) => d.saldo !== 0);
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
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl transition-colors"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {" "}
            <BarChartIcon size={24} />{" "}
          </div>{" "}
          <div>
            {" "}
            <h2 className="text-xl font-black tracking-tight text-slate-100 dark:text-white">
              {" "}
              Fluxo de Caixa{" "}
            </h2>{" "}
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {" "}
              Saldo acumulado — {title}{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <div className="text-right">
          {" "}
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {" "}
            Saldo final{" "}
          </p>{" "}
          <p className="text-lg font-black" style={{ color }}>
            {" "}
            {fmt.format(finalSaldo)}{" "}
          </p>{" "}
        </div>{" "}
      </div>{" "}
      <div className="h-[280px] w-full">
        {" "}
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            {" "}
            <AreaChart data={data}>
              {" "}
              <defs>
                {" "}
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  {" "}
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />{" "}
                  <stop offset="95%" stopColor={color} stopOpacity={0} />{" "}
                </linearGradient>{" "}
              </defs>{" "}
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E2E8F0"
                opacity={0.3}
              />{" "}
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: "#94A3B8" }}
                dy={10}
              />{" "}
              <YAxis hide domain={["dataMin - 200", "dataMax + 200"]} />{" "}
              <Tooltip
                contentStyle={{
                  borderRadius: "1rem",
                  border: "none",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  background: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(8px)",
                }}
                labelStyle={{
                  fontWeight: 900,
                  color: "#1E293B",
                  marginBottom: "4px",
                }}
                itemStyle={{ fontWeight: 700, color }}
                formatter={(value: any) => [
                  fmt.format(value as number),
                  "Saldo",
                ]}
              />{" "}
              <Area
                type="monotone"
                dataKey="saldo"
                stroke={color}
                strokeWidth={4}
                fillOpacity={1}
                fill="url(#colorSaldo)"
                animationDuration={1200}
              />{" "}
            </AreaChart>{" "}
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center flex-col gap-2">
            {" "}
            <BarChartIcon
              size={40}
              className="text-slate-200 dark:text-slate-900 dark:text-white"
            />{" "}
            <p className="text-sm font-bold text-slate-400">
              {" "}
              Nenhuma transação neste mês{" "}
            </p>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </motion.div>
  );
}
