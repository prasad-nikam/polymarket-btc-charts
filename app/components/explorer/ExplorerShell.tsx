"use client";

import { useEffect, useState } from "react";
import MarketSidebar from "./MarketSidebar";
import MarketChart, { type MarketSnapshot } from "./MarketChart";
import BacktestPanel from "./BacktestPanel";
import GroupAnalysisPanel from "./GroupAnalysisPanel";

interface Market {
	id: number;
	question: string;
	startTime: Date;
	endTime: Date;
}

interface ExplorerShellProps {
	markets: Market[];
}

export default function ExplorerShell({ markets }: ExplorerShellProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	useEffect(() => {
		if (window.innerWidth >= 768) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setSidebarOpen(true);
		}
	}, []);

	const [selectedMarketId, setSelectedMarketId] = useState(markets[0]?.id);

	const [snapshots, setSnapshots] = useState<MarketSnapshot[]>([]);

	const [loading, setLoading] = useState(true);

	const [error, setError] = useState<string | null>(null);

	const [page, setPage] = useState<"charts" | "backtests">("backtests");

	const selectedMarket = markets.find(
		(market) => market.id === selectedMarketId,
	);

	useEffect(() => {
		if (!selectedMarketId) {
			return;
		}

		let cancelled = false;

		async function loadSnapshots() {
			setLoading(true);
			setError(null);
			setSnapshots([]);

			try {
				const response = await fetch(
					`/api/markets/${selectedMarketId}/snapshots`,
				);

				if (!response.ok) {
					throw new Error(
						`Failed to fetch snapshots (${response.status})`,
					);
				}

				const data: MarketSnapshot[] = await response.json();

				if (!cancelled) {
					setSnapshots(data);
				}
			} catch (error) {
				if (!cancelled) {
					setError(
						error instanceof Error
							? error.message
							: "Failed to load snapshots",
					);
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		loadSnapshots();

		return () => {
			cancelled = true;
		};
	}, [selectedMarketId]);

	if (!selectedMarket) {
		return null;
	}

	return (
		<div className="flex min-h-screen bg-zinc-950 text-white">
			{page == "charts" && sidebarOpen && (
				<button
					type="button"
					aria-label="Close market menu"
					onClick={() => setSidebarOpen(false)}
					className="fixed inset-0 z-30 bg-black/60 md:hidden"
				/>
			)}

			{page == "charts" && (
				<MarketSidebar
					markets={markets}
					selectedMarketId={selectedMarket.id}
					onSelectMarket={(marketId) => {
						setSelectedMarketId(marketId);

						if (window.innerWidth < 768) {
							setSidebarOpen(false);
						}
					}}
					open={sidebarOpen}
					onToggle={() => setSidebarOpen((open) => !open)}
				/>
			)}

			<main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
				<div className="flex min-h-full flex-col">
					<header className="flex items-center justify-between gap-3 border-b border-zinc-800  px-4 py-4 sm:px-6 sm:py-5">
						<div className="flex min-w-0 items-center gap-3">
							{page == "charts" && (
								<button
									type="button"
									onClick={() => setSidebarOpen(true)}
									className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white md:hidden"
									aria-label="Open market menu"
								>
									☰
								</button>
							)}

							<div className="min-w-0">
								<div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
									Polymarket
								</div>

								<h1 className="mt-1 truncate text-lg font-semibold sm:text-xl">
									Market Explorer
								</h1>
							</div>
						</div>

						<button
							type="button"
							onClick={() => {
								setPage((prev) =>
									prev == "backtests"
										? "charts"
										: "backtests",
								);
							}}
							className="shrink-0 rounded-lg bg-blue-500/50 px-3.5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
						>
							{page == "charts" ? "Run Backtest" : " See Chart"}
						</button>
					</header>

					{page == "backtests" && (
						<>
							<BacktestPanel />
							<GroupAnalysisPanel />
						</>
					)}

					{page == "charts" && (
						<section className="flex flex-1 p-4 sm:p-6 lg:p-8">
							<div className="w-full">
								<div className="mt-2 text-sm text-zinc-500 sm:mt-8">
									Market #{selectedMarket.id}
								</div>

								<h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
									{selectedMarket.question}
								</h2>

								<p className="mt-2 break-all text-xs text-zinc-500 sm:text-sm">
									{selectedMarket.startTime.toISOString()} →{" "}
									{selectedMarket.endTime.toISOString()}
								</p>

								<div className="mt-6 h-[55vh] min-h-80 max-h-140 rounded-xl border border-zinc-800 bg-zinc-900/40 p-2 sm:mt-8 sm:p-4">
									{loading ? (
										<div className="flex h-full items-center justify-center text-sm text-zinc-600">
											Loading snapshots...
										</div>
									) : error ? (
										<div className="flex h-full items-center justify-center text-sm text-red-400">
											{error}
										</div>
									) : (
										<MarketChart snapshots={snapshots} />
									)}
								</div>

								<div className="mt-3 text-xs text-zinc-600">
									{snapshots.length} snapshots
								</div>
							</div>
						</section>
					)}
				</div>
			</main>
		</div>
	);
}
