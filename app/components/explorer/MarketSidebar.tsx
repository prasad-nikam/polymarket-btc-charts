"use client";

interface Market {
	id: number;
	question: string;
	startTime: Date;
	endTime: Date;
}

interface MarketSidebarProps {
	markets: Market[];
	selectedMarketId: number;
	onSelectMarket: (marketId: number) => void;
	open: boolean;
	onToggle: () => void;
}

export default function MarketSidebar({
	markets,
	selectedMarketId,
	onSelectMarket,
	open,
	onToggle,
}: MarketSidebarProps) {
	return (
		<aside
			className={`relative shrink-0 border-r border-zinc-800 bg-zinc-950 transition-all duration-200 ${
				open ? "w-72" : "w-12"
			}`}
		>
			<button
				type="button"
				onClick={onToggle}
				className="absolute -right-3.25 top-6 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-xs text-zinc-400 hover:text-white"
				aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
			>
				{open ? "‹" : "›"}
			</button>

			{open && (
				<div className="flex h-full flex-col">
					<div className="border-b border-zinc-800 px-5 py-5">
						<div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
							Markets
						</div>

						<div className="mt-1 text-sm text-zinc-300">
							BTC · 5 minute
						</div>
					</div>

					<div className="flex-1 overflow-y-auto p-3">
						{markets.map((market) => {
							const selected = market.id === selectedMarketId;

							return (
								<button
									key={market.id}
									type="button"
									onClick={() => onSelectMarket(market.id)}
									className={`mb-1 w-full rounded-lg p-3 text-left transition ${
										selected
											? "border border-zinc-700 bg-zinc-900"
											: "text-zinc-400 hover:bg-zinc-900"
									}`}
								>
									<div
										className={`text-sm font-medium ${
											selected
												? "text-white"
												: "text-zinc-300"
										}`}
									>
										Market #{market.id}
									</div>

									<div className="mt-1 text-xs text-zinc-500">
										{market.startTime.toISOString()}
									</div>
								</button>
							);
						})}
					</div>
				</div>
			)}
		</aside>
	);
}
