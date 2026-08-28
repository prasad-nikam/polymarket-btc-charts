import {
	pgTable,
	serial,
	integer,
	text,
	timestamp,
	numeric,
} from "drizzle-orm/pg-core";

export const markets = pgTable("markets", {
	id: serial("id").primaryKey(),
	conditionId: text("condition_id").notNull(),
	slug: text("slug").notNull(),
	question: text("question").notNull(),
	startTime: timestamp("start_time", { withTimezone: true }).notNull(),
	endTime: timestamp("end_time", { withTimezone: true }).notNull(),
	upTokenId: text("up_token_id").notNull(),
	downTokenId: text("down_token_id").notNull(),
});

export const marketSnapshots = pgTable("market_snapshots", {
	marketId: integer("market_id").notNull(),
	time: timestamp("time", { withTimezone: true }).notNull(),
	elapsedSeconds: integer("elapsed_seconds").notNull(),
	remainingSeconds: integer("remaining_seconds").notNull(),

	upBid: numeric("up_bid"),
	upAsk: numeric("up_ask"),
	upMid: numeric("up_mid"),
	upLast: numeric("up_last"),

	downBid: numeric("down_bid"),
	downAsk: numeric("down_ask"),
	downMid: numeric("down_mid"),
	downLast: numeric("down_last"),
});
