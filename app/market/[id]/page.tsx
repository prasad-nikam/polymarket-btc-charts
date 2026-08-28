import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { markets } from "@/db/schema";

interface MarketPageProps {
	params: Promise<{
		id: string;
	}>;
}

export default async function MarketPage({ params }: MarketPageProps) {
	const { id } = await params;

	const marketId = Number(id);

	if (!Number.isInteger(marketId)) {
		notFound();
	}

	const [market] = await db
		.select()
		.from(markets)
		.where(eq(markets.id, marketId))
		.limit(1);

	if (!market) {
		notFound();
	}

	return (
		<main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
			<div className="mx-auto max-w-6xl">
				{/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
				<a href="/" className="text-sm text-zinc-400 hover:text-white">
					← Back to markets
				</a>
				<div className="mt-8">
					<div className="text-sm text-zinc-500">
						Market #{market.id}
					</div>

					<h1 className="mt-2 text-3xl font-semibold">
						{market.question}
					</h1>

					<div className="mt-4 flex gap-6 text-sm text-zinc-400">
						<div>Start: {market.startTime.toISOString()}</div>

						<div>End: {market.endTime.toISOString()}</div>
					</div>
				</div>
				<div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900 p-8">
					<div className="text-zinc-500">Chart coming next...</div>
				</div>
			</div>
		</main>
	);
}
