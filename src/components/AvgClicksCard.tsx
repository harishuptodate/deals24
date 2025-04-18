
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const AvgClicksCard = ({
	stats,
	isLoading,
  title,
  description,
  color = "#3b82f6"
}: {
	stats: any;
	isLoading: boolean;
  title : string;
  description: string;
  color?: string;
}) => {
	if (!stats) {
		return (
			<Card className="dark:bg-gray-900 dark:border-gray-800">
				<CardHeader className="pb-2">
					<CardTitle className="text-xl dark:text-white">{title}</CardTitle>
					<CardDescription className="dark:text-gray-400">{description}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex justify-center items-center h-24">
						<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
					</div>
				</CardContent>
			</Card>
		);
	}

	const total = stats.reduce((acc, item) => acc + item.clicks, 0);
	const avg = stats.length ? total / stats.length : 0;

	// Optional: Calculate growth vs previous 7 days (mocked here)
	const growth = Math.floor(Math.random() * 30) + 1;

	return (
		<Card className="dark:bg-[#171717] dark:border-gray-800">
			<CardHeader className="pb-2">
				<CardTitle className="text-xl dark:text-white">{title}</CardTitle>
				<CardDescription className="dark:text-gray-400">{description}</CardDescription>
			</CardHeader>

			<CardContent>
				{isLoading ? (
					<div className="flex justify-center items-center h-24">
						<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
					</div>
				) : (
					<>
						<div className="flex items-end gap-2 mb-2">
							<span className="text-3xl font-bold dark:text-white">{avg.toFixed(1)}</span>
							<div className="flex items-center text-sm text-green-500 dark:text-green-400 mb-1">
								<TrendingUp className="h-4 w-4 mr-1" />
								<span>{growth}%</span>
							</div>
						</div>

						<ResponsiveContainer width="100%" height={60}>
							<LineChart data={stats}>
								<XAxis dataKey="name" hide />
								<Tooltip
									content={({ active, payload, label }) => {
										if (active && payload && payload.length) {
											return (
												<div className="bg-white dark:bg-gray-800 text-xs rounded-md shadow px-2 py-1 border border-gray-200 dark:border-gray-700">
													<div className="text-gray-500 dark:text-gray-400">{label}</div>
													<div className="text-blue-600 dark:text-blue-400 font-semibold">
														{payload[0].value} clicks
													</div>
												</div>
											);
										}
										return null;
									}}
								/>
								<Line
									type="monotone"
									dataKey="clicks"
									stroke={color}
									strokeWidth={2}
									dot={false}
									animationDuration={300}
								/>
							</LineChart>
						</ResponsiveContainer>
					</>
				)}
			</CardContent>
		</Card>
	);
};

export default AvgClicksCard;
