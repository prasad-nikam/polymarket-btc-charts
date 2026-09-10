"use client";

import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

export interface MarketSnapshot {
	time: string;
	elapsedSeconds: number;

	upBid: number | null;
	upAsk: number | null;
	upMid: number | null;
	upLast: number | null;

	downBid: number | null;
	downAsk: number | null;
	downMid: number | null;
	downLast: number | null;
}

interface MarketChartProps {
	snapshots: MarketSnapshot[];
}

export default function MarketChart({ snapshots }: MarketChartProps) {
	if (snapshots.length === 0) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-zinc-600">
				No snapshot data available.
			</div>
		);
	}

	return (
		<ResponsiveContainer width="100%" height="100%">
			<LineChart
				data={snapshots}
				margin={{
					top: 12,
					right: 8,
					bottom: 8,
					left: 0,
				}}
			>
				<CartesianGrid strokeDasharray="3 3" stroke="#27272a" />

				<XAxis
					dataKey="elapsedSeconds"
					tick={{ fill: "#71717a", fontSize: 10 }}
					tickLine={false}
					axisLine={{ stroke: "#27272a" }}
					tickFormatter={(value) => `${value}s`}
				/>

				<YAxis
					domain={[0, 1]}
					ticks={[0, 0.25, 0.5, 0.75, 1]}
					tick={{ fill: "#71717a", fontSize: 10 }}
					tickLine={false}
					axisLine={{ stroke: "#27272a" }}
					tickFormatter={(value) => `${Math.round(value * 100)}¢`}
				/>

				<Tooltip
					contentStyle={{
						backgroundColor: "#18181b",
						border: "1px solid #3f3f46",
						borderRadius: "8px",
					}}
					labelStyle={{
						color: "#a1a1aa",
					}}
					formatter={(value, name) => {
						if (typeof value !== "number") {
							return [value, name];
						}

						return [
							`${(value * 100).toFixed(1)}¢`,
							name === "upMid" ? "UP" : "DOWN",
						];
					}}
					labelFormatter={(value) => `${value}s`}
				/>

				<Line
					type="monotone"
					dataKey="upMid"
					name="upMid"
					dot={false}
					strokeWidth={2}
					stroke="#fafafa"
					connectNulls
				/>

				<Line
					type="monotone"
					dataKey="downMid"
					name="downMid"
					dot={false}
					strokeWidth={2}
					stroke="#71717a"
					connectNulls
				/>
			</LineChart>
		</ResponsiveContainer>
	);
}
