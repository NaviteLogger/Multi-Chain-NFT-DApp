import {NextResponse} from "next/server";
import {isAddress} from "viem";

interface Params {
    params: Promise<{chain: string; address: string}>;
}

const SUPPORTED_CHAINS = new Set(["sepolia", "base-sepolia", "polygon-amoy", "sui-testnet"]);

const SUI_ADDRESS = /^0x[0-9a-fA-F]{1,64}$/;

export async function GET(_request: Request, {params}: Params) {
    const {chain, address} = await params;

    if (!SUPPORTED_CHAINS.has(chain)) {
        return NextResponse.json({error: `unsupported chain: ${chain}`}, {status: 400});
    }

    const isEvmChain = chain !== "sui-testnet";
    if (isEvmChain && !isAddress(address)) {
        return NextResponse.json({error: "invalid EVM address"}, {status: 400});
    }
    if (!isEvmChain && !SUI_ADDRESS.test(address)) {
        return NextResponse.json({error: "invalid Sui address"}, {status: 400});
    }

    return NextResponse.json({
        chain,
        address,
        items: [],
        nextCursor: null,
    });
}
