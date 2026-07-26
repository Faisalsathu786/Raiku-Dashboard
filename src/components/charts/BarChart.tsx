'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface BarChartProps {
  data: Array<Record<string, unknown>>;
  dataKey: string;
  xKey?: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  tooltipFormatter?: (value: number) => string;
}

export function BarChart({
  data,
  dataKey,
  xKey = 'label',
  color = '#6366f1',
  height = 300,
  showGrid = true,
  tooltipFormatter,
}: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        )}
        <XAxis
          dataKey={xKey}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          dy={8}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          dx={-8}
          tickFormatter={tooltipFormatter}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#111827',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            fontSize: '13px',
          }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(value: number) => [
            tooltipFormatter ? tooltipFormatter(value) : value,
            dataKey,
          ]}
        />
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={color} />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
