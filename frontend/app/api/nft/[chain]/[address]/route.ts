import {NextResponse} from "next/server";
import {isAddress} from "viem";

interface Params {
    params: {chain: string; address: string};
}

const SUPPORTED_CHAINS = new Set(["sepolia", "base-sepolia", "polygon-amoy", "sui-testnet"]);

/**
 * Stub holdings endpoint. In production this would query an indexer
 * (Alchemy/QuickNode for EVM, Sui RPC `getOwnedObjects` for Sui).
 * Returned shape is the contract for downstream clients.
 */
export async function GET(_request: Request, {params}: Params) {
    const {chain, address} = params;

    if (!SUPPORTED_CHAINS.has(chain)) {
        return NextResponse.json({error: `unsupported chain: ${chain}`}, {status: 400});
    }

    const isEvmChain = chain !== "sui-testnet";
    if (isEvmChain && !isAddress(address)) {
        return NextResponse.json({error: "invalid EVM address"}, {status: 400});
    }
    if (!isEvmChain && !/^0x[0-9a-fA-F]{1,64}$/.test(address)) {
        return NextResponse.json({error: "invalid Sui address"}, {status: 400});
    }

    return NextResponse.json({
        chain,
        address,
        items: [],
        nextCursor: null,
    });
}
