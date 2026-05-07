import EvmPanel from "@/components/EvmPanel";
import SuiPanel from "@/components/SuiPanel";

export default function Home() {
    return (
        <main className="min-h-screen px-6 py-10 max-w-5xl mx-auto">
            <header className="mb-10">
                <h1 className="text-3xl font-semibold tracking-tight">MultiChain NFT</h1>
                <p className="mt-2 text-zinc-400">
                    One page, two virtual machines. Mint an ERC-721 on Ethereum / Base / Polygon
                    testnets and a Sui Move object on Sui testnet — using the same UI.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <EvmPanel />
                <SuiPanel />
            </div>

            <footer className="mt-12 text-xs text-zinc-500 space-y-1">
                <p>
                    EVM contract: <span className="mono">contracts-evm/src/MultiChainNFT.sol</span>
                </p>
                <p>
                    Sui module: <span className="mono">contracts-sui/sources/nft.move</span>
                </p>
                <p>
                    API spec: <span className="mono">/openapi.yaml</span>
                </p>
            </footer>
        </main>
    );
}
