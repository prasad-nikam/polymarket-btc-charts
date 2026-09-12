"use client";

import { useState, type ReactNode } from "react";

type BaselineResult = {
	group: number;
	marketFrom: number;
	marketTo: number;
	marketCount: number;
	marketsWithEntry: number;
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
	group: number;
	marketFrom: number;
	marketTo: number;
	marketCount: number;
	marketsWithEntry: number;
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
	deltaVsBaseline: number | null;
};

interface GroupBacktestResponse {
	marketsConsidered: number;
	groupCount: number;
	baseline: BaselineResult[];
	hedge: HedgeResult[];
}

type SortDirection = "asc" | "desc";

type BaselineSortKey =
	| "group"
	| "marketFrom"
	| "marketTo"
	| "marketCount"
	| "marketsWithEntry"
	| "trades"
	| "wins"
	| "losses"
	| "winRatePct"
	| "avgEntryPrice"
	| "totalPnl"
	| "avgPnl"
	| "roiPct";

type HedgeSortKey =
	| "group"
	| "marketFrom"
	| "marketTo"
	| "marketCount"
	| "marketsWithEntry"
	| "trades"
	| "profitableTrades"
	| "nonProfitableTrades"
	| "hedgedTrades"
	| "hedgeOnEventualWinner"
	| "hedgeOnEventualLoser"
	| "profitableRatePct"
	| "avgHedgePrice"
	| "totalPnl"
	| "deltaVsBaseline"
	| "avgPnl";

function money(value: number | null): string {
	return value === null ? "—" : value.toFixed(4);
}

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
				className="flex w-full items-center gap-1 whitespace-nowrap text-left text-xs text-zinc-500 transition hover:text-zinc-200"
			>
				<span>{label}</span>
				<span className="text-[10px] text-zinc-600">
					{active ? (direction === "desc" ? "↓" : "↑") : "↕"}
				</span>
			</button>
		</th>
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
				className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-600"
			/>
		</label>
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

export default function GroupAnalysisPanel() {
	const [marketFrom, setMarketFrom] = useState("895");
	const [marketTo, setMarketTo] = useState("5138");

	const [entryMin, setEntryMin] = useState("0.95");
	const [entryMax, setEntryMax] = useState("0.96");

	const [entryCutoff, setEntryCutoff] = useState("58");

	const [groupSize, setGroupSize] = useState("100");

	const [hedgeEnabled, setHedgeEnabled] = useState(true);
	const [hedgeAsk, setHedgeAsk] = useState("0.45");

	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [result, setResult] = useState<GroupBacktestResponse | null>(null);

	const [hedgeTriggerMode, setHedgeTriggerMode] = useState<
		"original" | "opposite"
	>("original");

	async function run() {
		setRunning(true);
		setError(null);

		try {
			const response = await fetch("/api/group-backtest", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					marketIdFrom: Number(marketFrom),
					marketIdTo: Number(marketTo),
					entryPriceMin: Number(entryMin),
					entryPriceMax: Number(entryMax),
					entryCutoff: Number(entryCutoff),
					groupSize: Number(groupSize),
					hedgeEnabled,
					hedgeAsk: Number(hedgeAsk),
					hedgeTriggerMode,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error ?? "Group backtest failed");
			}

			setResult(data);
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Group backtest failed",
			);
		} finally {
			setRunning(false);
		}
	}

	return (
		<section className="mx-4 my-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-6">
			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
							Research
						</div>

						<h3 className="mt-1 text-xl font-semibold">
							Market Group Analysis
						</h3>

						<p className="mt-1 max-w-2xl text-sm text-zinc-500">
							Backtest consecutive groups of markets to see how
							strategy performance changes over time.
						</p>
					</div>

					<button
						type="button"
						onClick={run}
						disabled={running}
						className="w-full rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
					>
						{running ? "Running…" : "Run group analysis"}
					</button>
				</div>

				<div className="grid gap-5 border-t border-zinc-800 pt-5 lg:grid-cols-2">
					<div className="grid gap-5">
						<FieldGroup title="Markets">
							<div className="grid grid-cols-2 gap-3">
								<Field
									label="From ID"
									value={marketFrom}
									onChange={setMarketFrom}
								/>

								<Field
									label="To ID"
									value={marketTo}
									onChange={setMarketTo}
								/>
							</div>
						</FieldGroup>

						<FieldGroup title="Group">
							<Field
								label="Markets per group"
								value={groupSize}
								onChange={setGroupSize}
							/>
						</FieldGroup>
					</div>

					<div className="grid gap-5">
						<FieldGroup title="Entry ASK">
							<div className="grid grid-cols-2 gap-3">
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

						<FieldGroup title="Entry cutoff">
							<Field
								label="Remaining seconds ≤"
								value={entryCutoff}
								onChange={setEntryCutoff}
							/>
						</FieldGroup>
					</div>
				</div>

				<div className="border-t border-zinc-800 pt-5">
					<label className="flex items-center gap-3 text-sm text-zinc-300">
						<input
							type="checkbox"
							checked={hedgeEnabled}
							onChange={(event) =>
								setHedgeEnabled(event.target.checked)
							}
						/>

						<span>Enable hedge</span>
					</label>

					{hedgeEnabled && (
						<div className="mt-4">
							<div className="text-xs font-medium uppercase tracking-wider text-zinc-600">
								Hedge
							</div>

							<div className="mt-3 grid gap-4 md:grid-cols-2">
								<div>
									<div className="mb-2 text-[11px] text-zinc-600">
										Trigger by
									</div>

									<div className="space-y-2">
										<label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-300">
											<input
												type="radio"
												name="hedge-trigger-mode"
												value="original"
												checked={
													hedgeTriggerMode ===
													"original"
												}
												onChange={() =>
													setHedgeTriggerMode(
														"original",
													)
												}
											/>
											<span>Original side ASK</span>
										</label>

										<label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-300">
											<input
												type="radio"
												name="hedge-trigger-mode"
												value="opposite"
												checked={
													hedgeTriggerMode ===
													"opposite"
												}
												onChange={() =>
													setHedgeTriggerMode(
														"opposite",
													)
												}
											/>
											<span>Opposite side ASK</span>
										</label>
									</div>
								</div>

								<FieldGroup title="Hedge trigger ASK">
									<Field
										label="ASK"
										value={hedgeAsk}
										onChange={setHedgeAsk}
									/>
								</FieldGroup>
							</div>

							<div className="mt-3 text-xs text-zinc-600">
								{hedgeTriggerMode === "original"
									? "Trigger when the original position reaches the selected ASK. Buy the opposite side at its actual ASK."
									: "Trigger when the opposite side reaches the selected ASK. This is also the price being bought for the hedge."}
							</div>
						</div>
					)}

					{/* {hedgeEnabled && (
						<div className="mt-4 max-w-sm">
							<FieldGroup title="Hedge">
								<Field
									label="Hedge ASK trigger"
									value={hedgeAsk}
									onChange={setHedgeAsk}
								/>

								<div className="mt-2 text-xs text-zinc-600">
									Hedge cutoff automatically uses the entry
									cutoff ({entryCutoff}s).
								</div>
							</FieldGroup>
						</div>
					)} */}
				</div>

				{error && (
					<div className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">
						{error}
					</div>
				)}

				{result && (
					<div className="grid gap-3 border-t border-zinc-800 pt-5 sm:grid-cols-3">
						<Stat
							label="Markets"
							value={result.marketsConsidered.toLocaleString()}
						/>

						<Stat
							label="Groups"
							value={result.groupCount.toLocaleString()}
						/>

						<Stat
							label="Hedge"
							value={
								hedgeEnabled
									? `${Number(hedgeAsk).toFixed(2)} ASK`
									: "Disabled"
							}
						/>
					</div>
				)}

				{result && (
					<Results result={result} hedgeEnabled={hedgeEnabled} />
				)}
			</div>
		</section>
	);
}

function Results({
	result,
	hedgeEnabled,
}: {
	result: GroupBacktestResponse;
	hedgeEnabled: boolean;
}) {
	const [baselineSort, setBaselineSort] = useState<{
		key: BaselineSortKey;
		direction: SortDirection;
	}>({
		key: "group",
		direction: "asc",
	});

	const [hedgeSort, setHedgeSort] = useState<{
		key: HedgeSortKey;
		direction: SortDirection;
	}>({
		key: "group",
		direction: "asc",
	});

	function toggleBaselineSort(key: BaselineSortSortKey) {
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
		<div className="grid gap-8 border-t border-zinc-800 pt-6">
			<div>
				<div className="mb-3">
					<h4 className="text-sm font-semibold text-zinc-300">
						Baseline by market group
					</h4>

					<p className="mt-1 text-xs text-zinc-600">
						Each row is an independent backtest over one group.
					</p>
				</div>

				<div className="h-[32rem] overflow-auto rounded-lg border border-zinc-800 scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
					<table className="min-w-[1100px] w-full text-left text-sm">
						<thead>
							<tr>
								<SortHeader
									label="Group"
									active={baselineSort.key === "group"}
									direction={baselineSort.direction}
									onClick={() => toggleBaselineSort("group")}
									className="px-4 py-3"
								/>

								<SortHeader
									label="Market range"
									active={false}
									direction="asc"
									onClick={() => {}}
									className="px-4 py-3"
								/>

								<SortHeader
									label="Markets"
									active={baselineSort.key === "marketCount"}
									direction={baselineSort.direction}
									onClick={() =>
										toggleBaselineSort("marketCount")
									}
								/>

								<SortHeader
									label="Entries"
									active={
										baselineSort.key === "marketsWithEntry"
									}
									direction={baselineSort.direction}
									onClick={() =>
										toggleBaselineSort("marketsWithEntry")
									}
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
									label="Avg P&L"
									active={baselineSort.key === "avgPnl"}
									direction={baselineSort.direction}
									onClick={() => toggleBaselineSort("avgPnl")}
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
									key={row.group}
									className="border-t border-zinc-800"
								>
									<td className="px-4 py-3 font-medium">
										#{row.group}
									</td>

									<td className="whitespace-nowrap">
										{row.marketFrom}–{row.marketTo}
									</td>

									<td>{row.marketCount}</td>
									<td>{row.marketsWithEntry}</td>
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

									<td>{money(row.avgPnl)}</td>

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

			{hedgeEnabled && result.hedge.length > 0 && (
				<div>
					<div className="mb-3">
						<h4 className="text-sm font-semibold text-zinc-300">
							Hedge by market group
						</h4>

						<p className="mt-1 text-xs text-zinc-600">
							Hedge cutoff = entry cutoff. Hedge uses the fixed
							ASK trigger from the input.
						</p>
					</div>

					<div className="h-[32rem] overflow-auto rounded-lg border border-zinc-800 scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
						<table className="min-w-[1400px] w-full text-left text-sm">
							<thead>
								<tr>
									<SortHeader
										label="Group"
										active={hedgeSort.key === "group"}
										direction={hedgeSort.direction}
										onClick={() => toggleHedgeSort("group")}
										className="px-4 py-3"
									/>

									<SortHeader
										label="Market range"
										active={false}
										direction="asc"
										onClick={() => {}}
										className="px-4 py-3"
									/>

									<SortHeader
										label="Markets"
										active={hedgeSort.key === "marketCount"}
										direction={hedgeSort.direction}
										onClick={() =>
											toggleHedgeSort("marketCount")
										}
									/>

									<SortHeader
										label="Entries"
										active={
											hedgeSort.key === "marketsWithEntry"
										}
										direction={hedgeSort.direction}
										onClick={() =>
											toggleHedgeSort("marketsWithEntry")
										}
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

									<SortHeader
										label="Avg P&L"
										active={hedgeSort.key === "avgPnl"}
										direction={hedgeSort.direction}
										onClick={() =>
											toggleHedgeSort("avgPnl")
										}
									/>

									<SortHeader
										label="Δ vs baseline"
										active={
											hedgeSort.key === "deltaVsBaseline"
										}
										direction={hedgeSort.direction}
										onClick={() =>
											toggleHedgeSort("deltaVsBaseline")
										}
									/>
								</tr>
							</thead>

							<tbody>
								{sortedHedge.map((row) => (
									<tr
										key={row.group}
										className="border-t border-zinc-800"
									>
										<td className="px-4 py-3 font-medium">
											#{row.group}
										</td>

										<td className="whitespace-nowrap">
											{row.marketFrom}–{row.marketTo}
										</td>

										<td>{row.marketCount}</td>
										<td>{row.marketsWithEntry}</td>
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

										<td>{money(row.avgPnl)}</td>

										<td
											className={
												(row.deltaVsBaseline ?? 0) >= 0
													? "text-emerald-400"
													: "text-red-400"
											}
										>
											{money(row.deltaVsBaseline)}
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

type BaselineSortSortKey = BaselineSortKey;
