
import React from 'react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Loader2 } from 'lucide-react';

interface ChartData {
  name: string;
  clicks: number;
  date: string;
  [key: string]: any;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

interface PerformanceMetricsChartProps {
  data: ChartData[];
  isLoading: boolean;
  period: 'day' | 'week' | 'month' | 'year';
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-semibold dark:text-white">{label}</p>
        <p className="text-green-600 dark:text-green-400">Total Clicks: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const PerformanceMetricsChart: React.FC<PerformanceMetricsChartProps> = ({
  data,
  isLoading,
  period,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex justify-center items-center h-[300px] text-gray-500 dark:text-gray-400">
        No data available for this period
      </div>
    );
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(120, 120, 120, 0.2)" 
            vertical={true} 
            horizontal={true} 
          />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12, fill: 'rgba(160, 160, 160, 0.8)' }} 
            tickMargin={10} 
            stroke="rgba(160, 160, 160, 0.2)"
          />
          <YAxis 
            allowDecimals={false}
            tick={{ fontSize: 12, fill: 'rgba(160, 160, 160, 0.8)' }} 
            tickMargin={10} 
            stroke="rgba(160, 160, 160, 0.2)"
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="clicks"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4, fill: "#3b82f6", stroke: "#3b82f6" }}
            activeDot={{ r: 6, fill: "#60a5fa", stroke: "#3b82f6" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceMetricsChart;
