import { NextResponse } from "next/server";
import {
	runGroupBacktest,
	type GroupBacktestConfig,
	type HedgeTriggerMode,
} from "@/app/lib/groupBacktest";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	try {
		const body = await request.json();

		const hedgeTriggerMode =
			body.hedgeTriggerMode === "opposite" ? "opposite" : "original";

		const config: GroupBacktestConfig = {
			marketIdFrom: Number(body.marketIdFrom),
			marketIdTo: Number(body.marketIdTo),
			entryPriceMin: Number(body.entryPriceMin),
			entryPriceMax: Number(body.entryPriceMax),
			entryCutoff: Number(body.entryCutoff),
			groupSize: Number(body.groupSize),
			hedgeEnabled: Boolean(body.hedgeEnabled),
			hedgeAsk: Number(body.hedgeAsk),
			hedgeTriggerMode: hedgeTriggerMode as HedgeTriggerMode,
		};

		const result = await runGroupBacktest(config);

		return NextResponse.json(result, {
			headers: {
				"Cache-Control": "no-store",
			},
		});
	} catch (error) {
		console.error("Group backtest failed:", error);

		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Group backtest failed",
			},
			{ status: 400 },
		);
	}
}
