"use client";

import { useEffect, useState } from "react";
import MarketSidebar from "./MarketSidebar";
import MarketChart, { type MarketSnapshot } from "./MarketChart";
import BacktestPanel from "./BacktestPanel";

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
	const [sidebarOpen, setSidebarOpen] = useState(true);

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
		<div className="flex h-screen overflow-hidden bg-zinc-950 text-white">
			{page == "charts" && (
				<MarketSidebar
					markets={markets}
					selectedMarketId={selectedMarket.id}
					onSelectMarket={setSelectedMarketId}
					open={sidebarOpen}
					onToggle={() => setSidebarOpen((open) => !open)}
				/>
			)}

			<main className="min-w-0 flex-1 overflow-auto">
				<div className="flex min-h-full flex-col">
					<header className="border-b border-zinc-800 px-8 py-5 flex justify-between">
						<div>
							<div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
								Polymarket
							</div>

							<h1 className="mt-1 text-xl font-semibold">
								Market Explorer
							</h1>
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
							className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{page == "charts" ? "Run Backtest" : " See Chart"}
						</button>
					</header>

					{page == "backtests" && <BacktestPanel />}

					{page == "charts" && (
						<section className="flex flex-1 p-8">
							<div className="w-full">
								<div className="text-sm text-zinc-500 mt-8">
									Market #{selectedMarket.id}
								</div>

								<h2 className="mt-2 text-3xl font-semibold">
									{selectedMarket.question}
								</h2>

								<p className="mt-2 text-sm text-zinc-500">
									{selectedMarket.startTime.toISOString()} →{" "}
									{selectedMarket.endTime.toISOString()}
								</p>

								<div className="mt-8 h-130 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
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
