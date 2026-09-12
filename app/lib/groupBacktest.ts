import { sql } from "drizzle-orm";
import { db } from "@/db";

export type HedgeTriggerMode = "original" | "opposite";

export interface GroupBacktestConfig {
	marketIdFrom: number;
	marketIdTo: number;
	entryPriceMin: number;
	entryPriceMax: number;
	entryCutoff: number;
	groupSize: number;
	hedgeEnabled: boolean;
	hedgeAsk: number;
	hedgeTriggerMode: HedgeTriggerMode;
}

export interface GroupBaselineResult {
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
}

export interface GroupHedgeResult {
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
}

export interface GroupBacktestResponse {
	marketsConsidered: number;
	groupCount: number;
	baseline: GroupBaselineResult[];
	hedge: GroupHedgeResult[];
}

type BaselineRow = {
	group_no: number;
	market_from: number;
	market_to: number;
	market_count: number;
	markets_with_entry: number;
	trades: number;
	wins: number;
	losses: number;
	win_rate_pct: string | number | null;
	avg_entry_price: string | number | null;
	total_pnl: string | number;
	avg_pnl: string | number | null;
	roi_pct: string | number | null;
};

type HedgeRow = {
	group_no: number;
	market_from: number;
	market_to: number;
	market_count: number;
	markets_with_entry: number;
	trades: number;
	profitable_trades: number;
	non_profitable_trades: number;
	hedged_trades: number;
	hedge_on_eventual_winner: number;
	hedge_on_eventual_loser: number;
	profitable_rate_pct: string | number | null;
	avg_entry_price: string | number | null;
	avg_hedge_price: string | number | null;
	total_pnl: string | number;
	avg_pnl: string | number | null;
	delta_vs_baseline: string | number | null;
};

function toNumber(value: string | number | null): number | null {
	return value === null ? null : Number(value);
}

function normalizeBaseline(row: BaselineRow): GroupBaselineResult {
	return {
		group: Number(row.group_no),
		marketFrom: Number(row.market_from),
		marketTo: Number(row.market_to),
		marketCount: Number(row.market_count),
		marketsWithEntry: Number(row.markets_with_entry),
		trades: Number(row.trades),
		wins: Number(row.wins),
		losses: Number(row.losses),
		winRatePct: toNumber(row.win_rate_pct) ?? 0,
		avgEntryPrice: toNumber(row.avg_entry_price),
		totalPnl: Number(row.total_pnl),
		avgPnl: toNumber(row.avg_pnl),
		roiPct: toNumber(row.roi_pct),
	};
}

function normalizeHedge(row: HedgeRow): GroupHedgeResult {
	return {
		group: Number(row.group_no),
		marketFrom: Number(row.market_from),
		marketTo: Number(row.market_to),
		marketCount: Number(row.market_count),
		marketsWithEntry: Number(row.markets_with_entry),
		trades: Number(row.trades),
		profitableTrades: Number(row.profitable_trades),
		nonProfitableTrades: Number(row.non_profitable_trades),
		hedgedTrades: Number(row.hedged_trades),
		hedgeOnEventualWinner: Number(row.hedge_on_eventual_winner),
		hedgeOnEventualLoser: Number(row.hedge_on_eventual_loser),
		profitableRatePct: toNumber(row.profitable_rate_pct) ?? 0,
		avgEntryPrice: toNumber(row.avg_entry_price),
		avgHedgePrice: toNumber(row.avg_hedge_price),
		totalPnl: Number(row.total_pnl),
		avgPnl: toNumber(row.avg_pnl),
		deltaVsBaseline: toNumber(row.delta_vs_baseline),
	};
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

function validateConfig(config: GroupBacktestConfig): void {
	if (!Number.isInteger(config.marketIdFrom) || config.marketIdFrom <= 0) {
		throw new Error("From market ID must be a positive integer");
	}

	if (!Number.isInteger(config.marketIdTo) || config.marketIdTo <= 0) {
		throw new Error("To market ID must be a positive integer");
	}

	if (config.marketIdFrom > config.marketIdTo) {
		throw new Error("From market ID cannot be greater than To market ID");
	}

	if (
		!Number.isFinite(config.entryPriceMin) ||
		!Number.isFinite(config.entryPriceMax)
	) {
		throw new Error("Entry ASK range must contain valid numbers");
	}

	if (config.entryPriceMin > config.entryPriceMax) {
		throw new Error("Minimum entry ASK cannot be greater than maximum");
	}

	if (!Number.isInteger(config.entryCutoff) || config.entryCutoff < 0) {
		throw new Error("Entry cutoff must be a non-negative integer");
	}

	if (!Number.isInteger(config.groupSize) || config.groupSize <= 0) {
		throw new Error("Group size must be a positive integer");
	}

	if (
		!Number.isFinite(config.hedgeAsk) ||
		config.hedgeAsk < 0 ||
		config.hedgeAsk > 1
	) {
		throw new Error("Hedge ASK must be between 0 and 1");
	}

	if (
		config.hedgeTriggerMode !== "original" &&
		config.hedgeTriggerMode !== "opposite"
	) {
		throw new Error("Invalid hedge trigger mode");
	}
}

export async function runGroupBacktest(
	config: GroupBacktestConfig,
): Promise<GroupBacktestResponse> {
	validateConfig(config);

	const triggerOriginal = config.hedgeTriggerMode === "original";

	const result = await db.execute(sql`
		WITH selected_markets AS (
			SELECT
				id,
				ROW_NUMBER() OVER (ORDER BY id) AS market_position
			FROM markets
			WHERE id BETWEEN ${config.marketIdFrom} AND ${config.marketIdTo}
			ORDER BY id
		),

		grouped_markets AS (
			SELECT
				id AS market_id,
				((market_position - 1) / ${config.groupSize})::int + 1 AS group_no
			FROM selected_markets
		),

		group_info AS (
			SELECT
				group_no,
				MIN(market_id)::int AS market_from,
				MAX(market_id)::int AS market_to,
				COUNT(*)::int AS market_count
			FROM grouped_markets
			GROUP BY group_no
		),

		final_state AS (
			SELECT DISTINCT ON (s.market_id)
				s.market_id,

				CASE
					WHEN s.up_mid > s.down_mid THEN 'UP'
					WHEN s.down_mid > s.up_mid THEN 'DOWN'
				END AS winner

			FROM market_snapshots s

			JOIN grouped_markets gm
				ON gm.market_id = s.market_id

			ORDER BY s.market_id, s.time DESC
		),

		/*
		 * Find the FIRST qualifying entry in the entire market.
		 *
		 * IMPORTANT:
		 * The cutoff is applied AFTER this first entry is found.
		 * This preserves the baseline strategy semantics.
		 */
		all_entries AS (
			SELECT DISTINCT ON (s.market_id)
				s.market_id,
				s.time AS entry_time,
				s.remaining_seconds AS entry_remaining,

				CASE
					WHEN s.up_ask BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
						AND (
							s.down_ask NOT BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
							OR s.up_ask <= s.down_ask
						)
					THEN 'UP'

					WHEN s.down_ask BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
					THEN 'DOWN'
				END AS side,

				CASE
					WHEN s.up_ask BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
						AND (
							s.down_ask NOT BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
							OR s.up_ask <= s.down_ask
						)
					THEN s.up_ask

					WHEN s.down_ask BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
					THEN s.down_ask
				END AS entry_price

			FROM market_snapshots s

			JOIN grouped_markets gm
				ON gm.market_id = s.market_id

			WHERE
				s.up_ask BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}
				OR s.down_ask BETWEEN ${config.entryPriceMin} AND ${config.entryPriceMax}

			ORDER BY s.market_id, s.time
		),

		/*
		 * Markets which have a qualifying entry, regardless of cutoff.
		 * This is kept separate from base_trades so the displayed
		 * "Markets with entry" number does not accidentally become
		 * "Markets that passed the cutoff".
		 */
		entry_markets AS (
			SELECT
				e.market_id,
				gm.group_no
			FROM all_entries e
			JOIN grouped_markets gm
				ON gm.market_id = e.market_id
			WHERE e.side IS NOT NULL
		),

		base_trades AS (
			SELECT
				e.market_id,
				gm.group_no,
				e.entry_time,
				e.entry_remaining,
				e.side,
				e.entry_price,
				f.winner,

				e.side = f.winner AS won,

				CASE
					WHEN e.side = f.winner
					THEN 1.0 - e.entry_price
					ELSE -e.entry_price
				END AS baseline_pnl

			FROM all_entries e

			JOIN grouped_markets gm
				ON gm.market_id = e.market_id

			JOIN final_state f
				ON f.market_id = e.market_id

			WHERE
				e.side IS NOT NULL
				AND e.entry_remaining <= ${config.entryCutoff}
		),

        baseline_grouped AS (
            SELECT
                gi.group_no,

                (
                    SELECT COUNT(*)
                    FROM entry_markets em
                    WHERE em.group_no = gi.group_no
                )::int AS markets_with_entry,

                (
                    SELECT COUNT(*)
                    FROM base_trades bt
                    WHERE bt.group_no = gi.group_no
                )::int AS trades,

                (
                    SELECT COUNT(*)
                    FROM base_trades bt
                    WHERE bt.group_no = gi.group_no
                        AND bt.won
                )::int AS wins,

                (
                    SELECT COUNT(*)
                    FROM base_trades bt
                    WHERE bt.group_no = gi.group_no
                        AND NOT bt.won
                )::int AS losses,

                (
                    SELECT ROUND(
                        100.0 * COUNT(*) FILTER (WHERE bt.won)
                        / NULLIF(COUNT(*), 0),
                        2
                    )
                    FROM base_trades bt
                    WHERE bt.group_no = gi.group_no
                ) AS win_rate_pct,

                (
                    SELECT ROUND(AVG(bt.entry_price)::numeric, 4)
                    FROM base_trades bt
                    WHERE bt.group_no = gi.group_no
                ) AS avg_entry_price,

                (
                    SELECT ROUND(COALESCE(SUM(bt.baseline_pnl), 0)::numeric, 4)
                    FROM base_trades bt
                    WHERE bt.group_no = gi.group_no
                ) AS total_pnl,

                (
                    SELECT ROUND(AVG(bt.baseline_pnl)::numeric, 4)
                    FROM base_trades bt
                    WHERE bt.group_no = gi.group_no
                ) AS avg_pnl,

                (
                    SELECT CASE
                        WHEN COALESCE(SUM(bt.entry_price), 0) = 0
                        THEN NULL
                        ELSE ROUND(
                            100.0 * SUM(bt.baseline_pnl)
                            / SUM(bt.entry_price),
                            2
                        )
                    END
                    FROM base_trades bt
                    WHERE bt.group_no = gi.group_no
                ) AS roi_pct

            FROM group_info gi
        ),

		/*
		 * Hedge trigger:
		 *
		 * ORIGINAL:
		 *   UP entry   -> watch UP ASK
		 *   DOWN entry -> watch DOWN ASK
		 *
		 * OPPOSITE:
		 *   UP entry   -> watch DOWN ASK
		 *   DOWN entry -> watch UP ASK
		 *
		 * Hedge price is ALWAYS the opposite-side ASK.
		 */
		hedge_candidates AS (
			SELECT DISTINCT ON (bt.market_id)
				bt.market_id,
				bt.group_no,
				bt.entry_time,
				bt.entry_price,
				bt.side,
				bt.winner,
				bt.baseline_pnl,

				s.time AS hedge_time,

				CASE
					WHEN bt.side = 'UP'
					THEN s.down_ask
					ELSE s.up_ask
				END AS hedge_price

			FROM base_trades bt

			JOIN market_snapshots s
				ON s.market_id = bt.market_id
				AND s.time > bt.entry_time

			WHERE ${config.hedgeEnabled}
				AND (
					(
						${triggerOriginal}
						AND bt.side = 'UP'
						AND s.up_ask <= ${config.hedgeAsk}
					)

					OR

					(
						${triggerOriginal}
						AND bt.side = 'DOWN'
						AND s.down_ask <= ${config.hedgeAsk}
					)

					OR

					(
						NOT ${triggerOriginal}
						AND bt.side = 'UP'
						AND s.down_ask <= ${config.hedgeAsk}
					)

					OR

					(
						NOT ${triggerOriginal}
						AND bt.side = 'DOWN'
						AND s.up_ask <= ${config.hedgeAsk}
					)
				)

			ORDER BY bt.market_id, s.time
		),

		hedge_trades AS (
			SELECT
				bt.market_id,
				bt.group_no,
				bt.entry_price,
				bt.side,
				bt.winner,
				bt.baseline_pnl,

				h.hedge_price,

				h.market_id IS NOT NULL AS hedged,

				CASE
					WHEN h.market_id IS NULL
					THEN bt.baseline_pnl

					ELSE 1.0 - bt.entry_price - h.hedge_price
				END AS pnl

			FROM base_trades bt

			LEFT JOIN hedge_candidates h
				ON h.market_id = bt.market_id
		),

        hedge_grouped AS (
            SELECT
                gi.group_no,

                (
                    SELECT COUNT(*)
                    FROM entry_markets em
                    WHERE em.group_no = gi.group_no
                )::int AS markets_with_entry,

                (
                    SELECT COUNT(*)
                    FROM hedge_trades ht
                    WHERE ht.group_no = gi.group_no
                )::int AS trades,

                (
                    SELECT COUNT(*)
                    FROM hedge_trades ht
                    WHERE ht.group_no = gi.group_no
                        AND ht.pnl > 0
                )::int AS profitable_trades,

                (
                    SELECT COUNT(*)
                    FROM hedge_trades ht
                    WHERE ht.group_no = gi.group_no
                        AND ht.pnl <= 0
                )::int AS non_profitable_trades,

                (
                    SELECT COUNT(*)
                    FROM hedge_trades ht
                    WHERE ht.group_no = gi.group_no
                        AND ht.hedged
                )::int AS hedged_trades,

                (
                    SELECT COUNT(*)
                    FROM hedge_trades ht
                    WHERE ht.group_no = gi.group_no
                        AND ht.hedged
                        AND ht.side = ht.winner
                )::int AS hedge_on_eventual_winner,

                (
                    SELECT COUNT(*)
                    FROM hedge_trades ht
                    WHERE ht.group_no = gi.group_no
                        AND ht.hedged
                        AND ht.side <> ht.winner
                )::int AS hedge_on_eventual_loser,

                (
                    SELECT CASE
                        WHEN COUNT(*) = 0
                        THEN NULL
                        ELSE ROUND(
                            100.0 * COUNT(*) FILTER (WHERE ht.pnl > 0)
                            / COUNT(*),
                            2
                        )
                    END
                    FROM hedge_trades ht
                    WHERE ht.group_no = gi.group_no
                ) AS profitable_rate_pct,

                (
                    SELECT ROUND(
                        AVG(ht.entry_price)::numeric,
                        4
                    )
                    FROM hedge_trades ht
                    WHERE ht.group_no = gi.group_no
                ) AS avg_entry_price,

                (
                    SELECT ROUND(
                        AVG(ht.hedge_price)::numeric,
                        4
                    )
                    FROM hedge_trades ht
                    WHERE ht.group_no = gi.group_no
                ) AS avg_hedge_price,

                (
                    SELECT ROUND(
                        COALESCE(SUM(ht.pnl), 0)::numeric,
                        4
                    )
                    FROM hedge_trades ht
                    WHERE ht.group_no = gi.group_no
                ) AS total_pnl,

                (
                    SELECT ROUND(
                        AVG(ht.pnl)::numeric,
                        4
                    )
                    FROM hedge_trades ht
                    WHERE ht.group_no = gi.group_no
                ) AS avg_pnl

            FROM group_info gi
        )

		SELECT
			'BASELINE' AS result_type,

			gi.group_no AS group_no,
			gi.market_from,
			gi.market_to,
			gi.market_count,

			COALESCE(bg.markets_with_entry, 0)::int
				AS markets_with_entry,

			COALESCE(bg.trades, 0)::int
				AS trades,

			COALESCE(bg.wins, 0)::int
				AS wins,

			COALESCE(bg.losses, 0)::int
				AS losses,

			bg.win_rate_pct,
			bg.avg_entry_price,
			bg.total_pnl,
			bg.avg_pnl,
			bg.roi_pct,

			NULL::int AS profitable_trades,
			NULL::int AS non_profitable_trades,
			NULL::int AS hedged_trades,
			NULL::int AS hedge_on_eventual_winner,
			NULL::int AS hedge_on_eventual_loser,
			NULL::numeric AS profitable_rate_pct,
			NULL::numeric AS avg_hedge_price,
			NULL::numeric AS delta_vs_baseline

		FROM group_info gi

		LEFT JOIN baseline_grouped bg
			ON bg.group_no = gi.group_no

		UNION ALL

		SELECT
			'HEDGE' AS result_type,

			gi.group_no AS group_no,
			gi.market_from,
			gi.market_to,
			gi.market_count,

			COALESCE(hg.markets_with_entry, 0)::int
				AS markets_with_entry,

			COALESCE(hg.trades, 0)::int
				AS trades,

			NULL::int AS wins,
			NULL::int AS losses,
			NULL::numeric AS win_rate_pct,

			hg.avg_entry_price,
			hg.total_pnl,
			hg.avg_pnl,
			NULL::numeric AS roi_pct,

			COALESCE(hg.profitable_trades, 0)::int,
			COALESCE(hg.non_profitable_trades, 0)::int,
			COALESCE(hg.hedged_trades, 0)::int,
			COALESCE(hg.hedge_on_eventual_winner, 0)::int,
			COALESCE(hg.hedge_on_eventual_loser, 0)::int,

			hg.profitable_rate_pct,
			hg.avg_hedge_price,

			ROUND(
				(
					COALESCE(hg.total_pnl, 0)
					- COALESCE(bg.total_pnl, 0)
				)::numeric,
				4
			) AS delta_vs_baseline

		FROM group_info gi

		LEFT JOIN hedge_grouped hg
			ON hg.group_no = gi.group_no

		LEFT JOIN baseline_grouped bg
			ON bg.group_no = gi.group_no

		WHERE ${config.hedgeEnabled}

		ORDER BY result_type, group_no
	`);

	const resultRows = rows<
		BaselineRow &
			HedgeRow & {
				result_type: "BASELINE" | "HEDGE";
			}
	>(result);

	const baseline = resultRows
		.filter((row) => row.result_type === "BASELINE")
		.map(normalizeBaseline);

	const hedge = resultRows
		.filter((row) => row.result_type === "HEDGE")
		.map(normalizeHedge);

	return {
		marketsConsidered: baseline.reduce(
			(total, row) => total + row.marketCount,
			0,
		),
		groupCount: baseline.length,
		baseline,
		hedge,
	};
}
