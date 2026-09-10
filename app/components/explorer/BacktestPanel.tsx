"use client";

import { useState, type ReactNode } from "react";

type BaselineResult = {
	cutoff: number;
	trades: number;
	wins: number;
	losses: number;
	winRatePct: number;
	avgEntryPrice: number | null;
	totalPnl: number;
	avgPnl: number | null;
	roiPct: number | null;
};

type HedgeResult = {
	strategy: string;
	trigger: number;
	trades: number;
	profitableTrades: number;
	nonProfitableTrades: number;
	hedgedTrades: number;
	hedgeOnEventualWinner: number;
	hedgeOnEventualLoser: number;
	profitableRatePct: number;
	avgEntryPrice: number | null;
	avgHedgePrice: number | null;
	totalPnl: number;
	avgPnl: number | null;
};

interface BacktestResponse {
	marketsConsidered: number;
	marketsWithEntry: number;
	baseline: BaselineResult[];
	hedge: HedgeResult[];
}

function range(start: number, end: number, step: number): number[] {
	if (
		!Number.isFinite(start) ||
		!Number.isFinite(end) ||
		!Number.isFinite(step) ||
		step <= 0
	) {
		return [];
	}

	const result: number[] = [];
	const direction = start <= end ? 1 : -1;
	const delta = Math.abs(step) * direction;

	for (
		let value = start;
		direction > 0 ? value <= end + 1e-9 : value >= end - 1e-9;
		value += delta
	) {
		result.push(Math.round(value * 10000) / 10000);

		if (result.length > 1000) break;
	}

	return result;
}

function money(value: number | null): string {
	return value === null ? "—" : value.toFixed(4);
}

export default function BacktestPanel() {
	const [marketFrom, setMarketFrom] = useState("895");
	const [marketTo, setMarketTo] = useState("");
	const [entryMin, setEntryMin] = useState("0.95");
	const [entryMax, setEntryMax] = useState("0.96");
	const [cutoffFrom, setCutoffFrom] = useState("85");
	const [cutoffTo, setCutoffTo] = useState("25");
	const [cutoffStep, setCutoffStep] = useState("5");
	const [hedgeEnabled, setHedgeEnabled] = useState(true);
	const [hedgeCutoff, setHedgeCutoff] = useState("56");
	const [hedgeFrom, setHedgeFrom] = useState("0.75");
	const [hedgeTo, setHedgeTo] = useState("0.35");
	const [hedgeStep, setHedgeStep] = useState("0.01");
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<BacktestResponse | null>(null);

	async function run() {
		setRunning(true);
		setError(null);

		try {
			const cutoffs = range(
				Number(cutoffFrom),
				Number(cutoffTo),
				Number(cutoffStep),
			);

			const hedgeTriggers = range(
				Number(hedgeFrom),
				Number(hedgeTo),
				Number(hedgeStep),
			);

			if (!cutoffs.length) {
				throw new Error("Invalid cutoff range");
			}

			if (hedgeEnabled && !hedgeTriggers.length) {
				throw new Error("Invalid hedge trigger range");
			}

			const response = await fetch("/api/backtest", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					marketIdFrom:
						marketFrom === "" ? undefined : Number(marketFrom),
					marketIdTo: marketTo === "" ? undefined : Number(marketTo),
					entryPriceMin: Number(entryMin),
					entryPriceMax: Number(entryMax),
					cutoffs,
					hedgeEnabled,
					hedgeCutoff: Number(hedgeCutoff),
					hedgeTriggers: hedgeTriggers,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error ?? "Backtest failed");
			}

			setResult(data);
		} catch (error) {
			setError(
				error instanceof Error ? error.message : "Backtest failed",
			);
		} finally {
			setRunning(false);
		}
	}

	return (
		<section className="my-3 mx-3 flex min-h-full flex-col gap-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:my-4 sm:mx-4 sm:p-6 lg:flex-row lg:gap-12">
			<div className="w-full shrink-0 border-b border-neutral-800 pb-6 lg:max-w-100 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
				<div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
					<div>
						<div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
							Backtest
						</div>

						<h3 className="mt-1 text-xl font-semibold">
							Strategy Lab
						</h3>
					</div>

					<button
						type="button"
						onClick={run}
						disabled={running}
						className="w-full hidden sm:block rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
					>
						{running ? "Running…" : "Run backtest"}
					</button>
				</div>

				<div className="mt-6 grid gap-3">
					<FieldGroup title="Markets">
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<Field
								label="From ID"
								value={marketFrom}
								onChange={setMarketFrom}
							/>

							<Field
								label="To ID"
								value={marketTo}
								onChange={setMarketTo}
								placeholder="No limit"
							/>
						</div>
					</FieldGroup>

					<FieldGroup title="Entry ASK">
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<Field
								label="Min"
								value={entryMin}
								onChange={setEntryMin}
							/>

							<Field
								label="Max"
								value={entryMax}
								onChange={setEntryMax}
							/>
						</div>
					</FieldGroup>

					<FieldGroup title="Cutoff sweep">
						<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
							<Field
								label="From"
								value={cutoffFrom}
								onChange={setCutoffFrom}
							/>

							<Field
								label="To"
								value={cutoffTo}
								onChange={setCutoffTo}
							/>

							<Field
								label="Step"
								value={cutoffStep}
								onChange={setCutoffStep}
							/>
						</div>
					</FieldGroup>
				</div>

				<div className="mt-6 border-t border-zinc-800 pt-6">
					<label className="flex  items-center gap-3 text-sm text-zinc-300">
						<input
							type="checkbox"
							checked={hedgeEnabled}
							onChange={(event) =>
								setHedgeEnabled(event.target.checked)
							}
							className="h-4 w-4"
						/>
						Enable hedge sweep
					</label>

					{hedgeEnabled && (
						<div className="mt-4 grid gap-6 sm:grid-cols-2">
							<FieldGroup title="Hedge cutoff">
								<Field
									label="Entry ≤ seconds"
									value={hedgeCutoff}
									onChange={setHedgeCutoff}
								/>
							</FieldGroup>

							<FieldGroup title="Trigger from">
								<Field
									label="ASK"
									value={hedgeFrom}
									onChange={setHedgeFrom}
								/>
							</FieldGroup>

							<FieldGroup title="Trigger to">
								<Field
									label="ASK"
									value={hedgeTo}
									onChange={setHedgeTo}
								/>
							</FieldGroup>

							<FieldGroup title="Trigger step">
								<Field
									label="Step"
									value={hedgeStep}
									onChange={setHedgeStep}
								/>
							</FieldGroup>
						</div>
					)}
				</div>

				{error && (
					<div className="mt-5 rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">
						{error}
					</div>
				)}

				{result && (
					<div className="mt-8 mb-4 grid gap-3 grid-cols-3">
						<Stat
							label="Markets considered"
							value={result.marketsConsidered.toLocaleString()}
						/>

						<Stat
							label="Markets with entry"
							value={result.marketsWithEntry.toLocaleString()}
						/>

						<Stat
							label="Cutoff results"
							value={result.baseline.length.toLocaleString()}
						/>
					</div>
				)}

				<button
					type="button"
					onClick={run}
					disabled={running}
					className="w-full sm:hidden rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
				>
					{running ? "Running…" : "Run backtest"}
				</button>
			</div>

			{result && <Results result={result} />}
		</section>
	);
}

function FieldGroup({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<div>
			<div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-600">
				{title}
			</div>

			{children}
		</div>
	);
}

function Field({
	label,
	value,
	onChange,
	placeholder,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}) {
	return (
		<label className="block">
			<span className="mb-1 block text-[11px] text-zinc-600">
				{label}
			</span>

			<input
				value={value}
				placeholder={placeholder}
				onChange={(event) => onChange(event.target.value)}
				className="min-h-11 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600"
			/>
		</label>
	);
}

type SortDirection = "asc" | "desc";

type BaselineSortKey =
	| "cutoff"
	| "trades"
	| "wins"
	| "losses"
	| "winRatePct"
	| "avgEntryPrice"
	| "totalPnl"
	| "roiPct";

type HedgeSortKey =
	| "trigger"
	| "trades"
	| "profitableTrades"
	| "nonProfitableTrades"
	| "hedgedTrades"
	| "hedgeOnEventualWinner"
	| "hedgeOnEventualLoser"
	| "profitableRatePct"
	| "avgHedgePrice"
	| "totalPnl";

function SortHeader({
	label,
	active,
	direction,
	onClick,
	className = "",
}: {
	label: string;
	active: boolean;
	direction: SortDirection;
	onClick: () => void;
	className?: string;
}) {
	return (
		<th className={`sticky top-0 z-10 bg-zinc-900 ${className}`}>
			<button
				type="button"
				onClick={onClick}
				className="flex w-full items-center gap-1 text-left text-xs text-zinc-500 transition hover:text-zinc-200"
			>
				<span>{label}</span>

				<span className="text-[10px] text-zinc-600">
					{active ? (direction === "desc" ? "↓" : "↑") : "↕"}
				</span>
			</button>
		</th>
	);
}

function Results({ result }: { result: BacktestResponse }) {
	const [baselineSort, setBaselineSort] = useState<{
		key: BaselineSortKey;
		direction: SortDirection;
	}>({
		key: "cutoff",
		direction: "desc",
	});

	const [hedgeSort, setHedgeSort] = useState<{
		key: HedgeSortKey;
		direction: SortDirection;
	}>({
		key: "trigger",
		direction: "desc",
	});

	function toggleBaselineSort(key: BaselineSortKey) {
		setBaselineSort((current) => ({
			key,
			direction:
				current.key === key && current.direction === "desc"
					? "asc"
					: "desc",
		}));
	}

	function toggleHedgeSort(key: HedgeSortKey) {
		setHedgeSort((current) => ({
			key,
			direction:
				current.key === key && current.direction === "desc"
					? "asc"
					: "desc",
		}));
	}

	const sortedBaseline = [...result.baseline].sort((a, b) => {
		const aValue = a[baselineSort.key] ?? -Infinity;
		const bValue = b[baselineSort.key] ?? -Infinity;

		const comparison = Number(aValue) - Number(bValue);

		return baselineSort.direction === "asc" ? comparison : -comparison;
	});

	const sortedHedge = [...result.hedge].sort((a, b) => {
		const aValue = a[hedgeSort.key] ?? -Infinity;
		const bValue = b[hedgeSort.key] ?? -Infinity;

		const comparison = Number(aValue) - Number(bValue);

		return hedgeSort.direction === "asc" ? comparison : -comparison;
	});

	return (
		<div className="grid w-full min-w-0 grid-cols-1 gap-6 space-y-8 lg:grid-cols-2 lg:gap-4">
			<div className="min-w-0">
				<h4 className="mb-3 text-sm font-semibold text-zinc-300">
					Baseline
				</h4>

				<div className="max-w-full overflow-x-auto overflow-y-auto h-[28rem] rounded-lg border border-zinc-800 scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:h-180">
					<table className="min-w-[760px] w-full border-b border-zinc-800 text-left text-sm">
						<thead className="bg-zinc-900">
							<tr>
								<SortHeader
									label="Cutoff"
									active={baselineSort.key === "cutoff"}
									direction={baselineSort.direction}
									onClick={() => toggleBaselineSort("cutoff")}
									className="px-4 py-3"
								/>

								<SortHeader
									label="Trades"
									active={baselineSort.key === "trades"}
									direction={baselineSort.direction}
									onClick={() => toggleBaselineSort("trades")}
								/>

								<SortHeader
									label="Wins"
									active={baselineSort.key === "wins"}
									direction={baselineSort.direction}
									onClick={() => toggleBaselineSort("wins")}
								/>

								<SortHeader
									label="Losses"
									active={baselineSort.key === "losses"}
									direction={baselineSort.direction}
									onClick={() => toggleBaselineSort("losses")}
								/>

								<SortHeader
									label="Win %"
									active={baselineSort.key === "winRatePct"}
									direction={baselineSort.direction}
									onClick={() =>
										toggleBaselineSort("winRatePct")
									}
								/>

								<SortHeader
									label="Avg entry"
									active={
										baselineSort.key === "avgEntryPrice"
									}
									direction={baselineSort.direction}
									onClick={() =>
										toggleBaselineSort("avgEntryPrice")
									}
								/>

								<SortHeader
									label="Total P&L"
									active={baselineSort.key === "totalPnl"}
									direction={baselineSort.direction}
									onClick={() =>
										toggleBaselineSort("totalPnl")
									}
								/>

								<SortHeader
									label="ROI"
									active={baselineSort.key === "roiPct"}
									direction={baselineSort.direction}
									onClick={() => toggleBaselineSort("roiPct")}
								/>
							</tr>
						</thead>

						<tbody>
							{sortedBaseline.map((row) => (
								<tr
									key={row.cutoff}
									className="border-t border-zinc-800"
								>
									<td className="px-4 py-3">{row.cutoff}s</td>

									<td>{row.trades}</td>
									<td>{row.wins}</td>
									<td>{row.losses}</td>
									<td>{row.winRatePct.toFixed(2)}%</td>
									<td>{money(row.avgEntryPrice)}</td>

									<td
										className={
											row.totalPnl >= 0
												? "text-emerald-400"
												: "text-red-400"
										}
									>
										{money(row.totalPnl)}
									</td>

									<td>
										{row.roiPct === null
											? "—"
											: `${row.roiPct.toFixed(2)}%`}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{result.hedge.length > 0 && (
				<div className="min-w-0">
					<h4 className="mb-3 text-sm font-semibold text-zinc-300">
						Hedge sweep
					</h4>

					<div className="max-w-full overflow-x-auto overflow-y-auto h-[28rem] rounded-lg border border-zinc-800 scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:h-180">
						<table className="min-w-[980px] w-full border-b border-zinc-800 text-left text-sm">
							<thead className="bg-zinc-900">
								<tr>
									<SortHeader
										label="Trigger"
										active={hedgeSort.key === "trigger"}
										direction={hedgeSort.direction}
										onClick={() =>
											toggleHedgeSort("trigger")
										}
										className="px-4 py-3"
									/>

									<SortHeader
										label="Trades"
										active={hedgeSort.key === "trades"}
										direction={hedgeSort.direction}
										onClick={() =>
											toggleHedgeSort("trades")
										}
									/>

									<SortHeader
										label="Profitable"
										active={
											hedgeSort.key === "profitableTrades"
										}
										direction={hedgeSort.direction}
										onClick={() =>
											toggleHedgeSort("profitableTrades")
										}
									/>

									<SortHeader
										label="Non-profit"
										active={
											hedgeSort.key ===
											"nonProfitableTrades"
										}
										direction={hedgeSort.direction}
										onClick={() =>
											toggleHedgeSort(
												"nonProfitableTrades",
											)
										}
									/>

									<SortHeader
										label="Hedged"
										active={
											hedgeSort.key === "hedgedTrades"
										}
										direction={hedgeSort.direction}
										onClick={() =>
											toggleHedgeSort("hedgedTrades")
										}
									/>

									<SortHeader
										label="Hedge on winner"
										active={
											hedgeSort.key ===
											"hedgeOnEventualWinner"
										}
										direction={hedgeSort.direction}
										onClick={() =>
											toggleHedgeSort(
												"hedgeOnEventualWinner",
											)
										}
									/>

									<SortHeader
										label="Hedge on loser"
										active={
											hedgeSort.key ===
											"hedgeOnEventualLoser"
										}
										direction={hedgeSort.direction}
										onClick={() =>
											toggleHedgeSort(
												"hedgeOnEventualLoser",
											)
										}
									/>

									<SortHeader
										label="Profit %"
										active={
											hedgeSort.key ===
											"profitableRatePct"
										}
										direction={hedgeSort.direction}
										onClick={() =>
											toggleHedgeSort("profitableRatePct")
										}
									/>

									<SortHeader
										label="Avg hedge"
										active={
											hedgeSort.key === "avgHedgePrice"
										}
										direction={hedgeSort.direction}
										onClick={() =>
											toggleHedgeSort("avgHedgePrice")
										}
									/>

									<SortHeader
										label="Total P&L"
										active={hedgeSort.key === "totalPnl"}
										direction={hedgeSort.direction}
										onClick={() =>
											toggleHedgeSort("totalPnl")
										}
									/>
								</tr>
							</thead>

							<tbody>
								{sortedHedge.map((row) => (
									<tr
										key={row.trigger}
										className="border-t border-zinc-800"
									>
										<td className="px-4 py-3">
											{(row.trigger * 100).toFixed(0)}¢
										</td>

										<td>{row.trades}</td>
										<td>{row.profitableTrades}</td>
										<td>{row.nonProfitableTrades}</td>
										<td>{row.hedgedTrades}</td>
										<td>{row.hedgeOnEventualWinner}</td>
										<td>{row.hedgeOnEventualLoser}</td>

										<td>
											{row.profitableRatePct.toFixed(2)}%
										</td>

										<td>{money(row.avgHedgePrice)}</td>

										<td
											className={
												row.totalPnl >= 0
													? "text-emerald-400"
													: "text-red-400"
											}
										>
											{money(row.totalPnl)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
			<div className="text-xs text-zinc-600">{label}</div>

			<div className="mt-1 text-xl font-semibold text-zinc-200">
				{value}
			</div>
		</div>
	);
}
