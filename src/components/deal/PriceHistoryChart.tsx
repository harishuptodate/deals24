import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getDealPriceHistory } from '@/services/api';

interface PriceHistoryChartProps {
  dealId?: string;
  enabled: boolean;
}

interface PriceTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: { fullDate?: string };
    value?: number | string;
  }>;
}

const formatPrice = (price: number | null | undefined) =>
  typeof price === 'number'
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(price)
    : 'N/A';

const formatCompactPrice = (price: number | null | undefined) =>
  typeof price === 'number'
    ? `₹${new Intl.NumberFormat('en-IN', {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(price)}`
    : '';

const PriceTooltip = ({ active, payload }: PriceTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[10px] leading-4 shadow-md dark:border-gray-700 dark:bg-gray-800">
        <p className="font-semibold text-green-600 dark:text-green-400">
          {formatPrice(Number(payload[0].value))}
        </p>
        <p className="font-medium dark:text-white">{payload[0].payload?.fullDate}</p>
      </div>
    );
  }
  return null;
};

const PriceLabel = ({
  x = 0,
  y = 0,
  value,
}: {
  x?: number;
  y?: number;
  value?: number;
}) => (
  <text
    x={x}
    y={y - 10}
    textAnchor="middle"
    fill="#3b82f6"
    fontSize={10}
    fontWeight={600}>
    {formatCompactPrice(value)}
  </text>
);

const DateTimeTick = ({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
}) => {
  const [date, time] = String(payload?.value || '').split('|');
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        textAnchor="middle"
        fill="rgba(160, 160, 160, 0.8)"
        fontSize={10}>
        <tspan x="0" dy="12">{date}</tspan>
        <tspan x="0" dy="13">{time}</tspan>
      </text>
    </g>
  );
};

const PriceHistoryChart = ({ dealId, enabled }: PriceHistoryChartProps) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['deal-price-history', dealId],
    queryFn: () => getDealPriceHistory(dealId || ''),
    enabled: enabled && Boolean(dealId),
    staleTime: 30_000,
    refetchInterval: enabled ? 30_000 : false,
  });

  if (!dealId) return null;

  if (isLoading) {
    return (
      <div className="flex h-[220px] items-center justify-center sm:h-[260px] lg:h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError || !data?.points.length) {
    return (
      <div className="flex h-[220px] items-center justify-center text-gray-500 sm:h-[260px] lg:h-[300px] dark:text-gray-400">
        No price history available
      </div>
    );
  }

  const points = data.points.map((point) => ({
    ...point,
    name: `${format(new Date(point.observedAt), 'dd MMM yy')}|${format(new Date(point.observedAt), 'h:mm a')}`,
    fullDate: format(new Date(point.observedAt), 'dd MMM yyyy, h:mm a'),
  }));

  return (
    <div className="min-w-0 w-full overflow-hidden">
      <h3 className="mb-1 px-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Price History
      </h3>
      <div className="h-[220px] sm:h-[230px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
			margin={{ top: 24, right: 12, left: 4, bottom: 16 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(120, 120, 120, 0.2)"
              vertical={true}
              horizontal={true}
            />
            <XAxis
              dataKey="name"
              tick={<DateTimeTick />}
              tickMargin={10}
              height={48}
              interval={0}
              stroke="rgba(160, 160, 160, 0.2)"
            />
			<YAxis
			  width={48}
              allowDecimals={false}
              tickFormatter={(value) => formatCompactPrice(Number(value))}
              tick={{ fontSize: 10, fill: 'rgba(160, 160, 160, 0.8)' }}
              tickMargin={6}
              stroke="rgba(160, 160, 160, 0.2)"
            />
            <Tooltip content={<PriceTooltip />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4, fill: '#3b82f6', stroke: '#3b82f6' }}
              activeDot={{ r: 6, fill: '#60a5fa', stroke: '#3b82f6' }}
            >
              <LabelList dataKey="price" content={<PriceLabel />} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PriceHistoryChart;
