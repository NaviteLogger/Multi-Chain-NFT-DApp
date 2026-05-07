"use client";

import {ConnectButton} from "@rainbow-me/rainbowkit";
import {useAccount, useChainId, useReadContract, useSwitchChain, useWriteContract} from "wagmi";
import {useState} from "react";
import {sepolia} from "wagmi/chains";
import {
    multiChainNftAbi,
    nftAddressByChain,
    chainLabels,
    SUPPORTED_CHAIN_IDS,
    SupportedChainId,
} from "@/lib/contracts";

const ZERO = "0x0000000000000000000000000000000000000000";

function isSupported(chainId: number): chainId is SupportedChainId {
    return (SUPPORTED_CHAIN_IDS as readonly number[]).includes(chainId);
}

export default function EvmPanel() {
    const {address, isConnected} = useAccount();
    const chainId = useChainId();
    const {switchChain} = useSwitchChain();
    const {writeContractAsync, isPending: minting} = useWriteContract();

    const [uri, setUri] = useState("ipfs://QmExampleCID/0.json");
    const [status, setStatus] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

    const supported = isSupported(chainId);
    const contractAddress = supported ? nftAddressByChain[chainId] : ZERO;
    const isContractDeployed = contractAddress !== ZERO;

    const {data: balance} = useReadContract({
        abi: multiChainNftAbi,
        address: contractAddress as `0x${string}`,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        query: {enabled: Boolean(address && isContractDeployed)},
    });

    const handleMint = async () => {
        if (!address || !supported) return;
        setStatus("Requesting signature from backend…");
        try {
            const res = await fetch("/api/sign-mint", {
                method: "POST",
                headers: {"content-type": "application/json"},
                body: JSON.stringify({
                    to: address,
                    uri,
                    chainId,
                    contract: contractAddress,
                }),
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || `signing endpoint returned ${res.status}`);
            }
            const {signature} = (await res.json()) as {signature: `0x${string}`};

            setStatus("Submitting on-chain mint…");
            const hash = await writeContractAsync({
                abi: multiChainNftAbi,
                address: contractAddress as `0x${string}`,
                functionName: "mintWithSignature",
                args: [address, uri, signature],
            });
            setTxHash(hash);
            setStatus("Mint submitted ✓ — confirm in your wallet history.");
        } catch (err) {
            setStatus(`Mint failed: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    return (
        <section
            data-testid="evm-panel"
            className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-6 space-y-4"
        >
            <header className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">EVM (MetaMask + WalletConnect)</h2>
                <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />
            </header>

            {!isConnected && (
                <p className="text-sm text-zinc-400">
                    Connect an EVM wallet to mint on Sepolia, Base Sepolia, or Polygon Amoy.
                </p>
            )}

            {isConnected && (
                <>
                    <div className="text-sm space-y-1">
                        <div>
                            <span className="text-zinc-400">Address: </span>
                            <span className="mono" data-testid="evm-address">
                                {address}
                            </span>
                        </div>
                        <div>
                            <span className="text-zinc-400">Chain: </span>
                            <span data-testid="evm-chain">
                                {supported ? chainLabels[chainId] : `Unsupported (${chainId})`}
                            </span>
                        </div>
                        {supported && (
                            <div>
                                <span className="text-zinc-400">Contract: </span>
                                <span className="mono">{contractAddress}</span>
                            </div>
                        )}
                        {balance !== undefined && (
                            <div>
                                <span className="text-zinc-400">Owned: </span>
                                <span data-testid="evm-balance">{String(balance)} NFT(s)</span>
                            </div>
                        )}
                    </div>

                    {!supported && (
                        <button
                            onClick={() => switchChain({chainId: sepolia.id})}
                            className="rounded-lg bg-indigo-500 hover:bg-indigo-400 px-4 py-2 text-sm font-medium"
                        >
                            Switch to Sepolia
                        </button>
                    )}

                    {supported && (
                        <div className="space-y-3">
                            <label className="block text-sm">
                                <span className="text-zinc-400">Token URI</span>
                                <input
                                    value={uri}
                                    onChange={(e) => setUri(e.target.value)}
                                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 mono text-xs"
                                    data-testid="evm-uri"
                                />
                            </label>
                            <button
                                disabled={!isContractDeployed || minting}
                                onClick={handleMint}
                                data-testid="evm-mint"
                                className="rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-400 px-4 py-2 text-sm font-medium"
                            >
                                {minting ? "Minting…" : "Mint with backend signature"}
                            </button>
                            {!isContractDeployed && (
                                <p className="text-xs text-amber-400">
                                    Set NEXT_PUBLIC_NFT_ADDRESS_* in .env to enable minting.
                                </p>
                            )}
                            {status && (
                                <p className="text-xs text-zinc-400" data-testid="evm-status">
                                    {status}
                                </p>
                            )}
                            {txHash && (
                                <p className="text-xs mono break-all" data-testid="evm-txhash">
                                    {txHash}
                                </p>
                            )}
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
