import ExplorerShell from "./components/explorer/ExplorerShell";
import { getMarkets } from "./lib/markets";

export default async function Home() {
	const markets = await getMarkets();

	return <ExplorerShell markets={markets} />;
}
