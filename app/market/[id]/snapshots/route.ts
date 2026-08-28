import { NextResponse } from "next/server";
import { getMarketSnapshots } from "@/app/lib/markets";

export const dynamic = "force-dynamic";

interface RouteContext {
	params: Promise<{
		id: string;
	}>;
}

export async function GET(_request: Request, { params }: RouteContext) {
	const { id } = await params;

	const marketId = Number(id);

	if (!Number.isInteger(marketId) || marketId <= 0) {
		return NextResponse.json(
			{ error: "Invalid market ID" },
			{ status: 400 },
		);
	}

	try {
		const snapshots = await getMarketSnapshots(marketId);

		return NextResponse.json(
			snapshots.map((snapshot) => ({
				time: snapshot.time.toISOString(),
				elapsedSeconds: snapshot.elapsedSeconds,

				upBid: snapshot.upBid === null ? null : Number(snapshot.upBid),
				upAsk: snapshot.upAsk === null ? null : Number(snapshot.upAsk),
				upMid: snapshot.upMid === null ? null : Number(snapshot.upMid),
				upLast:
					snapshot.upLast === null ? null : Number(snapshot.upLast),

				downBid:
					snapshot.downBid === null ? null : Number(snapshot.downBid),
				downAsk:
					snapshot.downAsk === null ? null : Number(snapshot.downAsk),
				downMid:
					snapshot.downMid === null ? null : Number(snapshot.downMid),
				downLast:
					snapshot.downLast === null
						? null
						: Number(snapshot.downLast),
			})),
			{
				headers: {
					"Cache-Control": "no-store",
				},
			},
		);
	} catch (error) {
		console.error("Failed to fetch market snapshots:", error);

		return NextResponse.json(
			{ error: "Failed to fetch market snapshots" },
			{ status: 500 },
		);
	}
}
