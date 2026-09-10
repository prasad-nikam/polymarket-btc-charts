import { sql } from "drizzle-orm";
import { db } from "@/db";

export type BacktestSide = "UP" | "DOWN";

export interface BacktestConfig {
	marketIdFrom?: number;
	marketIdTo?: number;
	entryPriceMin: number;
	entryPriceMax: number;
	cutoffs: number[];
	hedgeEnabled: boolean;
	hedgeCutoff: number;
	hedgeTriggers: number[];
}

export interface BacktestSummary {
	cutoff: number;
	trades: number;
	wins: number;
	losses: number;
	winRatePct: number;
	avgEntryPrice: number | null;
	totalPnl: number;
	avgPnl: number | null;
	roiPct: number | null;
}

export interface HedgeSummary {
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
}

type BaselineRow = {
	cutoff: number;
	trades: number;
	wins: number;
	losses: number;
	winRatePct: string | number;
	avgEntryPrice: string | number | null;
	totalPnl: string | number;
	avgPnl: string | number | null;
	roiPct: string | number | null;
};

type HedgeRow = {
	strategy: string;
	trigger: string | number;
	trades: number;
	profitableTrades: number;
	nonProfitableTrades: number;
	hedgedTrades: number;
	hedgeOnEventualWinner: number;
	hedgeOnEventualLoser: number;
	profitableRatePct: string | number;
	avgEntryPrice: string | number | null;
	avgHedgePrice: string | number | null;
	totalPnl: string | number;
	avgPnl: string | number | null;
};

function toNumber(value: string | number | null): number | null {
	return value === null ? null : Number(value);
}

function normalizeBaseline(row: BaselineRow): BacktestSummary {
	return {
		cutoff: Number(row.cutoff),
		trades: Number(row.trades),
		wins: Number(row.wins),
		losses: Number(row.losses),
		winRatePct: Number(row.winRatePct),
		avgEntryPrice: toNumber(row.avgEntryPrice),
		totalPnl: Number(row.totalPnl),
		avgPnl: toNumber(row.avgPnl),
		roiPct: toNumber(row.roiPct),
	};
}

function normalizeHedge(row: HedgeRow): HedgeSummary {
	return {
		strategy: row.strategy,
		trigger: Number(row.trigger),
		trades: Number(row.trades),
		profitableTrades: Number(row.profitableTrades),
		nonProfitableTrades: Number(row.nonProfitableTrades),
		hedgedTrades: Number(row.hedgedTrades),
		hedgeOnEventualWinner: Number(row.hedgeOnEventualWinner),
		hedgeOnEventualLoser: Number(row.hedgeOnEventualLoser),
		profitableRatePct: Number(row.profitableRatePct),
		avgEntryPrice: toNumber(row.avgEntryPrice),
		avgHedgePrice: toNumber(row.avgHedgePrice),
		totalPnl: Number(row.totalPnl),
		avgPnl: toNumber(row.avgPnl),
	};
}

function validateConfig(config: BacktestConfig): void {
	if (
		!Number.isFinite(config.entryPriceMin) ||
		!Number.isFinite(config.entryPriceMax)
	) {
		throw new Error("Entry price range must contain valid numbers");
	}

	if (config.entryPriceMin > config.entryPriceMax) {
		throw new Error("Entry price minimum cannot be greater than maximum");
	}

	if (
		config.marketIdFrom !== undefined &&
		config.marketIdTo !== undefined &&
		config.marketIdFrom > config.marketIdTo
	) {
		throw new Error("Market ID minimum cannot be greater than maximum");
	}

	if (
		config.cutoffs.length === 0 ||
		config.cutoffs.some((value) => !Number.isInteger(value) || value < 0)
	) {
		throw new Error(
			"Cutoffs must contain at least one non-negative integer",
		);
	}

	if (config.hedgeEnabled) {
		if (!Number.isInteger(config.hedgeCutoff) || config.hedgeCutoff < 0) {
			throw new Error("Hedge cutoff must be a non-negative integer");
		}

		if (
			config.hedgeTriggers.length === 0 ||
			config.hedgeTriggers.some(
				(value) => !Number.isFinite(value) || value < 0 || value > 1,
			)
		) {
			throw new Error(
				"Hedge triggers must contain numbers between 0 and 1",
			);
		}
	}
}

function marketFilter(config: BacktestConfig) {
	const from =
		config.marketIdFrom === undefined
			? sql`TRUE`
			: sql`market_snapshots.market_id >= ${config.marketIdFrom}`;
	const to =
		config.marketIdTo === undefined
			? sql`TRUE`
			: sql`market_snapshots.market_id <= ${config.marketIdTo}`;

	return sql`${from} AND ${to}`;
}

function valueList(items: number[]) {
	return sql.join(
		items.map((item) => sql`${item}`),
		sql`, `,
	);
}

function rows<T>(value: unknown): T[] {
	if (Array.isArray(value)) {
		return value as T[];
	}

	if (
		value &&
		typeof value === "object" &&
		"rows" in value &&
		Array.isArray((value as { rows: unknown }).rows)
	) {
		return (value as { rows: T[] }).rows;
	}

	throw new Error("Unexpected database result shape");
}

/**
 * Run the backtest inside PostgreSQL.
 *
 * This is intentionally based on btest001.sql and hedge001.sql. The UI only
 * supplies parameters; PostgreSQL performs the filtering, DISTINCT ON,
 * trigger search, aggregation, and P&L calculation.
 */
export async function runBacktest(config: BacktestConfig) {
	validateConfig(config);

	const filter = marketFilter(config);
	const cutoffs = valueList(config.cutoffs);

	const countsResult = await db.execute(sql`
		WITH selected_markets AS (
			SELECT id
			FROM markets
			WHERE id >= ${config.marketIdFrom ?? 0}
				${config.marketIdTo === undefined ? sql`` : sql`AND id <= ${config.marketIdTo}`}
		),
		entries AS (
			SELECT DISTINCT ON (market_id)
				market_id
			FROM market_snapshots
			WHERE ${filter}
				AND (
					up_ask BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
					OR down_ask BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
				)
			ORDER BY market_id, time
		)
		SELECT
			(SELECT COUNT(*)::int FROM selected_markets) AS "marketsConsidered",
			(SELECT COUNT(*)::int FROM entries) AS "marketsWithEntry"
	`);

	const countRow = rows<{
		marketsConsidered: number;
		marketsWithEntry: number;
	}>(countsResult)[0];

	const baselineResult = await db.execute(sql`
		WITH final_state AS (
			SELECT DISTINCT ON (market_id)
				market_id,
				CASE
					WHEN up_mid > down_mid THEN 'UP'
					WHEN down_mid > up_mid THEN 'DOWN'
				END AS winner
			FROM market_snapshots
			WHERE ${filter}
			ORDER BY market_id, time DESC
		),

		all_entries AS (
			SELECT DISTINCT ON (market_id)
				market_id,
				time AS entry_time,
				remaining_seconds AS entry_remaining,
				CASE
					WHEN up_ask BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
						AND (
							down_ask NOT BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
							OR up_ask <= down_ask
						)
					THEN 'UP'
					WHEN down_ask BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
					THEN 'DOWN'
				END AS side,
				CASE
					WHEN up_ask BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
						AND (
							down_ask NOT BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
							OR up_ask <= down_ask
						)
					THEN up_ask
					WHEN down_ask BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
					THEN down_ask
				END AS entry_price
			FROM market_snapshots
			WHERE ${filter}
				AND (
					up_ask BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
					OR down_ask BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
				)
			ORDER BY market_id, time
		),

		trades AS (
			SELECT
				e.*,
				f.winner,
				e.side = f.winner AS won,
				CASE
					WHEN e.side = f.winner THEN 1.0 - e.entry_price
					ELSE -e.entry_price
				END AS pnl
			FROM all_entries e
			JOIN final_state f USING (market_id)
			WHERE e.side IS NOT NULL
		),

		cutoffs AS (
			SELECT value AS cutoff
			FROM unnest(ARRAY[${cutoffs}]::integer[]) AS value
		)

		SELECT
			cutoff,
			COUNT(*)::int AS trades,
			COUNT(*) FILTER (WHERE won)::int AS wins,
			COUNT(*) FILTER (WHERE NOT won)::int AS losses,
			ROUND(100.0 * COUNT(*) FILTER (WHERE won) / COUNT(*), 2) AS "winRatePct",
			ROUND(AVG(entry_price)::numeric, 4) AS "avgEntryPrice",
			ROUND(SUM(pnl)::numeric, 4) AS "totalPnl",
			ROUND(AVG(pnl)::numeric, 4) AS "avgPnl",
			ROUND(100.0 * SUM(pnl) / SUM(entry_price), 2) AS "roiPct"
		FROM cutoffs
		JOIN trades t ON t.entry_remaining <= cutoffs.cutoff
		GROUP BY cutoff
		ORDER BY cutoff DESC
	`);

	let hedge: HedgeSummary[] = [];

	if (config.hedgeEnabled) {
		const hedgeTriggers = valueList(config.hedgeTriggers);

		const hedgeResult = await db.execute(sql`
			WITH final_state AS (
				SELECT DISTINCT ON (market_id)
					market_id,
					CASE
						WHEN up_mid > down_mid THEN 'UP'
						WHEN down_mid > up_mid THEN 'DOWN'
					END AS winner
				FROM market_snapshots
				WHERE ${filter}
				ORDER BY market_id, time DESC
			),

			all_entries AS (
				SELECT DISTINCT ON (market_id)
					market_id,
					time AS entry_time,
					remaining_seconds AS entry_remaining,
					CASE
						WHEN up_ask BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
							AND (
								down_ask NOT BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
								OR up_ask <= down_ask
							)
						THEN 'UP'
						WHEN down_ask BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
						THEN 'DOWN'
					END AS side,
					CASE
						WHEN up_ask BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
							AND (
								down_ask NOT BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
								OR up_ask <= down_ask
							)
						THEN up_ask
						WHEN down_ask BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
						THEN down_ask
					END AS entry_price
				FROM market_snapshots
				WHERE ${filter}
					AND (
						up_ask BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
						OR down_ask BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
					)
				ORDER BY market_id, time
			),

			base AS (
				SELECT
					e.*,
					f.winner,
					CASE
						WHEN e.side = f.winner THEN 1.0 - e.entry_price
						ELSE -e.entry_price
					END AS baseline_pnl
				FROM all_entries e
				JOIN final_state f USING (market_id)
				WHERE e.side IS NOT NULL
					AND e.entry_remaining <= ${config.hedgeCutoff}
			),

			hedge_levels AS (
				SELECT value AS trigger
				FROM unnest(ARRAY[${hedgeTriggers}]::numeric[]) AS value
			),

			first_hedges AS (
				SELECT DISTINCT ON (b.market_id, hl.trigger)
					b.market_id,
					hl.trigger,
					s.time AS hedge_time,
					s.remaining_seconds AS hedge_remaining,
					CASE WHEN b.side = 'UP' THEN s.down_ask ELSE s.up_ask END AS hedge_price
				FROM base b
				CROSS JOIN hedge_levels hl
				JOIN market_snapshots s
					ON s.market_id = b.market_id
					AND s.time > b.entry_time
				WHERE (
					b.side = 'UP' AND s.up_ask <= hl.trigger
				) OR (
					b.side = 'DOWN' AND s.down_ask <= hl.trigger
				)
				ORDER BY b.market_id, hl.trigger, s.time
			),

			results AS (
				SELECT
					'HEDGE_' || (hl.trigger * 100)::int || 'c' AS strategy,
					hl.trigger,
					b.market_id,
					b.side,
					b.winner,
					b.entry_price,
					h.hedge_price,
					h.market_id IS NOT NULL AS hedged,
					CASE
						WHEN h.market_id IS NULL THEN b.baseline_pnl
						ELSE 1.0 - b.entry_price - h.hedge_price
					END AS pnl
				FROM base b
				CROSS JOIN hedge_levels hl
				LEFT JOIN first_hedges h
					ON h.market_id = b.market_id
					AND h.trigger = hl.trigger
			)

			SELECT
				strategy,
				trigger,
				COUNT(*)::int AS trades,
				COUNT(*) FILTER (WHERE pnl > 0)::int AS "profitableTrades",
				COUNT(*) FILTER (WHERE pnl <= 0)::int AS "nonProfitableTrades",
				COUNT(*) FILTER (WHERE hedged)::int AS "hedgedTrades",
				COUNT(*) FILTER (WHERE hedged AND side = winner)::int AS "hedgeOnEventualWinner",
				COUNT(*) FILTER (WHERE hedged AND side <> winner)::int AS "hedgeOnEventualLoser",
				ROUND(100.0 * COUNT(*) FILTER (WHERE pnl > 0) / COUNT(*), 2) AS "profitableRatePct",
				ROUND(AVG(entry_price)::numeric, 4) AS "avgEntryPrice",
				ROUND(AVG(hedge_price)::numeric, 4) AS "avgHedgePrice",
				ROUND(SUM(pnl)::numeric, 4) AS "totalPnl",
				ROUND(AVG(pnl)::numeric, 4) AS "avgPnl"
			FROM results
			GROUP BY strategy, trigger
			ORDER BY trigger DESC
		`);

		hedge = rows<HedgeRow>(hedgeResult).map(normalizeHedge);
	}

	return {
		marketsConsidered: Number(countRow?.marketsConsidered ?? 0),
		marketsWithEntry: Number(countRow?.marketsWithEntry ?? 0),
		baseline: rows<BaselineRow>(baselineResult).map(normalizeBaseline),
		hedge: hedge,
	};
}
