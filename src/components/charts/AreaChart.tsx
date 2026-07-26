'use client';

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AreaChartProps {
  data: Array<Record<string, unknown>>;
  dataKey: string;
  xKey?: string;
  color?: string;
  gradientId?: string;
  height?: number;
  tooltipFormatter?: (value: number) => string;
}

export function AreaChart({
  data,
  dataKey,
  xKey = 'label',
  color = '#6366f1',
  gradientId = 'areaGradient',
  height = 300,
  tooltipFormatter,
}: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
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
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
