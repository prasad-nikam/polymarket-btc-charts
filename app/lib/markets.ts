import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { marketSnapshots, markets } from "@/db/schema";

export async function getMarkets() {
	return db
		.select({
			id: markets.id,
			question: markets.question,
			startTime: markets.startTime,
			endTime: markets.endTime,
		})
		.from(markets)
		.orderBy(desc(markets.id))
		.limit(100);
}

export async function getMarketSnapshots(marketId: number) {
	return db
		.select({
			time: marketSnapshots.time,
			elapsedSeconds: marketSnapshots.elapsedSeconds,

			upBid: marketSnapshots.upBid,
			upAsk: marketSnapshots.upAsk,
			upMid: marketSnapshots.upMid,
			upLast: marketSnapshots.upLast,

			downBid: marketSnapshots.downBid,
			downAsk: marketSnapshots.downAsk,
			downMid: marketSnapshots.downMid,
			downLast: marketSnapshots.downLast,
		})
		.from(marketSnapshots)
		.where(eq(marketSnapshots.marketId, marketId))
		.orderBy(asc(marketSnapshots.time));
}
