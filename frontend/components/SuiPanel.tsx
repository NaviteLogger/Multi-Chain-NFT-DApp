"use client";

import {ConnectButton, useCurrentAccount, useSignAndExecuteTransaction} from "@mysten/dapp-kit";
import {Transaction} from "@mysten/sui/transactions";
import {useState} from "react";

const PACKAGE_ID = process.env.NEXT_PUBLIC_SUI_PACKAGE_ID ?? "0x0";
const MINT_CAP_ID = process.env.NEXT_PUBLIC_SUI_MINT_CAP_ID ?? "0x0";
const NETWORK = process.env.NEXT_PUBLIC_SUI_NETWORK ?? "testnet";

export default function SuiPanel() {
    const account = useCurrentAccount();
    const {mutateAsync: signAndExecute, isPending: minting} = useSignAndExecuteTransaction();

    const [name, setName] = useState("Genesis");
    const [imageUrl, setImageUrl] = useState("https://example.com/0.png");
    const [status, setStatus] = useState<string | null>(null);
    const [digest, setDigest] = useState<string | null>(null);

    const ready = PACKAGE_ID !== "0x0" && MINT_CAP_ID !== "0x0";

    const handleMint = async () => {
        if (!account) return;
        setStatus("Building transaction…");
        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${PACKAGE_ID}::nft::mint_to_sender`,
                arguments: [
                    tx.object(MINT_CAP_ID),
                    tx.pure.string(name),
                    tx.pure.string("Multi-chain demo NFT"),
                    tx.pure.string(imageUrl),
                ],
            });
            setStatus("Awaiting wallet signature…");
            const result = await signAndExecute({transaction: tx});
            setDigest(result.digest);
            setStatus("Mint submitted ✓");
        } catch (err) {
            setStatus(`Mint failed: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    return (
        <section
            data-testid="sui-panel"
            className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-6 space-y-4"
        >
            <header className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">Sui (Sui Wallet)</h2>
                <ConnectButton />
            </header>

            {!account && (
                <p className="text-sm text-zinc-400">
                    Connect a Sui wallet (Sui Wallet, Suiet, etc.) to mint on Sui {NETWORK}.
                </p>
            )}

            {account && (
                <>
                    <div className="text-sm space-y-1">
                        <div>
                            <span className="text-zinc-400">Address: </span>
                            <span className="mono break-all" data-testid="sui-address">
                                {account.address}
                            </span>
                        </div>
                        <div>
                            <span className="text-zinc-400">Network: </span>
                            <span>Sui {NETWORK}</span>
                        </div>
                        <div>
                            <span className="text-zinc-400">Package: </span>
                            <span className="mono break-all">{PACKAGE_ID}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-sm">
                            <span className="text-zinc-400">Name</span>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs"
                                data-testid="sui-name"
                            />
                        </label>
                        <label className="block text-sm">
                            <span className="text-zinc-400">Image URL</span>
                            <input
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 mono text-xs"
                                data-testid="sui-image"
                            />
                        </label>
                        <button
                            disabled={!ready || minting}
                            onClick={handleMint}
                            data-testid="sui-mint"
                            className="rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-700 disabled:text-zinc-400 px-4 py-2 text-sm font-medium"
                        >
                            {minting ? "Minting…" : "Mint on Sui"}
                        </button>
                        {!ready && (
                            <p className="text-xs text-amber-400">
                                Set NEXT_PUBLIC_SUI_PACKAGE_ID and NEXT_PUBLIC_SUI_MINT_CAP_ID in
                                .env to enable minting.
                            </p>
                        )}
                        {status && (
                            <p className="text-xs text-zinc-400" data-testid="sui-status">
                                {status}
                            </p>
                        )}
                        {digest && (
                            <p className="text-xs mono break-all" data-testid="sui-digest">
                                {digest}
                            </p>
                        )}
                    </div>
                </>
            )}
        </section>
    );
}
