import { NextResponse } from "next/server";
import { runBacktest, type BacktestConfig } from "@/app/lib/backtest";

export const dynamic = "force-dynamic";

function numberOrUndefined(value: unknown): number | undefined {
	if (value === undefined || value === null || value === "") return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function numbers(value: unknown): number[] {
	if (!Array.isArray(value)) return [];
	return value.map(Number).filter(Number.isFinite);
}

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as Partial<BacktestConfig>;

		const config: BacktestConfig = {
			marketIdFrom: numberOrUndefined(body.marketIdFrom),
			marketIdTo: numberOrUndefined(body.marketIdTo),
			entryPriceMin: Number(body.entryPriceMin),
			entryPriceMax: Number(body.entryPriceMax),
			cutoffs: numbers(body.cutoffs),
			hedgeEnabled: body.hedgeEnabled === true,
			hedgeCutoff: Number(body.hedgeCutoff),
			hedgeTriggers: numbers(body.hedgeTriggers),
		};

		const result = await runBacktest(config);
		return NextResponse.json(result, {
			headers: { "Cache-Control": "no-store" },
		});
	} catch (error) {
		console.error("Backtest failed:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : "Backtest failed",
			},
			{ status: 400 },
		);
	}
}
