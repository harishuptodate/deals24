import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getDealPriceHistory } from '@/services/api';
import { useIsMobile } from '@/hooks/use-mobile';

interface PriceHistoryChartProps {
  dealId?: string;
  enabled: boolean;
}

interface PriceTooltipProps {
  highlights: Array<{ price: number; color: string }>;
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

const PriceTooltip = ({ active, payload, highlights }: PriceTooltipProps) => {
  if (active && payload && payload.length) {
    const color = highlights.find(({ price }) => price === Number(payload[0].value))?.color
      || 'text-gray-700 dark:text-gray-300';
    return (
      <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[10px] leading-4 shadow-md dark:border-gray-700 dark:bg-gray-800">
        <p className={`font-semibold ${color}`}>
          {formatPrice(Number(payload[0].value))}
        </p>
        <p className="font-medium dark:text-white">{payload[0].payload?.fullDate}</p>
      </div>
    );
  }
  return null;
};

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
  const isMobile = useIsMobile();
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

  const points = data.points.map((point, index) => ({
    ...point,
    index,
    name: `${format(new Date(point.observedAt), 'dd MMM yy')}|${format(new Date(point.observedAt), 'h:mm a')}`,
    fullDate: format(new Date(point.observedAt), 'dd MMM yyyy, h:mm a'),
  }));
  const prices = points.map((point) => point.price);
  const dateTickCount = Math.min(points.length, isMobile ? 4 : 7);
  const dateTicks = Array.from({ length: dateTickCount }, (_, index) =>
    dateTickCount === 1 ? 0 : Math.round(index * (points.length - 1) / (dateTickCount - 1)),
  );
  const distinctPrices = [...new Set(prices)].sort((a, b) => a - b);
  const priceHighlights = [
    { label: 'Lowest', price: distinctPrices[0], color: 'text-green-700 dark:text-green-400' },
    ...(distinctPrices.length > 2
      ? [{ label: 'Middle', price: distinctPrices[Math.floor((distinctPrices.length - 1) / 2)], color: 'text-blue-700 dark:text-blue-400' }]
      : []),
    ...(distinctPrices.length > 1
      ? [{ label: 'Highest', price: distinctPrices[distinctPrices.length - 1], color: 'text-amber-700 dark:text-amber-400' }]
      : []),
  ];
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const pricePadding = Math.max(
    (highestPrice - lowestPrice) * 0.2,
    highestPrice * 0.02,
    1,
  );
  const priceDomain: [number, number] = [
    Math.max(0, Math.floor(lowestPrice - pricePadding)),
    Math.ceil(highestPrice + pricePadding),
  ];

  return (
    <div className="min-w-0 w-full overflow-hidden">
      <h3 className="mb-1 px-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Price History
      </h3>
      <dl className="mb-2 grid w-full grid-cols-3 gap-2 px-1">
        {priceHighlights.map(({ label, price, color }) => (
          <div
            key={label}
            className={`min-w-0 break-words ${
              label === 'Lowest' ? 'col-start-1 text-left' :
              label === 'Middle' ? 'col-start-2 text-center' : 'col-start-3 text-right'
            }`}
          >
            <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className={`text-sm font-semibold tabular-nums ${color}`}>
              {formatPrice(price)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mb-2 px-1 text-xs text-gray-500 dark:text-gray-400">
        Hover or tap a point for its exact price and date.
      </p>
      <div className="h-[220px] sm:h-[230px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
			margin={{ top: 24, right: 30, left: 4, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(120, 120, 120, 0.2)"
              vertical={true}
              horizontal={true}
            />
            <XAxis
              dataKey="index"
              ticks={dateTicks}
              tickFormatter={(index) => points[Number(index)]?.name || ''}
              tick={({ x, y, payload }) => (
                <DateTimeTick x={x} y={y} payload={{ value: points[payload.value]?.name }} />
              )}
              tickMargin={4}
              height={40}
              interval="preserveStartEnd"
              minTickGap={20}
              tickLine={false}
              stroke="rgba(160, 160, 160, 0.2)"
            />
			<YAxis
			  domain={priceDomain}
			  width={48}
              allowDecimals={false}
              tickFormatter={(value) => formatCompactPrice(Number(value))}
              tick={{ fontSize: 10, fill: 'rgba(160, 160, 160, 0.8)' }}
              tickMargin={6}
              stroke="rgba(160, 160, 160, 0.2)"
            />
            <Tooltip content={<PriceTooltip highlights={priceHighlights} />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PriceHistoryChart;
