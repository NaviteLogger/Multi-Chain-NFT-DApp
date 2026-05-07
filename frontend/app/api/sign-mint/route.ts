import {NextResponse} from "next/server";
import {keccak256, encodePacked, isAddress, isHex, getAddress, type Hex} from "viem";
import {privateKeyToAccount} from "viem/accounts";

interface SignBody {
    to: `0x${string}`;
    uri: string;
    chainId: number;
    contract: `0x${string}`;
}

const ALLOWED_CONTRACT_BY_CHAIN: Record<number, string | undefined> = {
    11155111: process.env.NEXT_PUBLIC_NFT_ADDRESS_SEPOLIA,
    84532: process.env.NEXT_PUBLIC_NFT_ADDRESS_BASE_SEPOLIA,
    80002: process.env.NEXT_PUBLIC_NFT_ADDRESS_POLYGON_AMOY,
};

const MAX_URI_LENGTH = 512;

function badRequest(message: string) {
    return NextResponse.json({error: message}, {status: 400});
}

export async function POST(request: Request) {
    let body: Partial<SignBody>;
    try {
        body = (await request.json()) as Partial<SignBody>;
    } catch {
        return badRequest("invalid JSON body");
    }

    const {to, uri, chainId, contract} = body;

    if (!to || !isAddress(to)) return badRequest("invalid 'to' address");
    if (!contract || !isAddress(contract)) return badRequest("invalid 'contract' address");
    if (typeof uri !== "string" || uri.length === 0 || uri.length > MAX_URI_LENGTH) {
        return badRequest("invalid 'uri'");
    }
    if (typeof chainId !== "number" || !(chainId in ALLOWED_CONTRACT_BY_CHAIN)) {
        return badRequest("unsupported 'chainId'");
    }

    const expectedContract = ALLOWED_CONTRACT_BY_CHAIN[chainId];
    if (!expectedContract || !isAddress(expectedContract)) {
        return NextResponse.json(
            {error: `no NFT contract configured for chainId ${chainId}`},
            {status: 503},
        );
    }
    if (getAddress(contract) !== getAddress(expectedContract)) {
        return badRequest("'contract' does not match deployed address for this chain");
    }

    const pk = process.env.MINT_SIGNER_PRIVATE_KEY;
    if (!pk || !isHex(pk) || pk.length !== 66) {
        return NextResponse.json(
            {error: "MINT_SIGNER_PRIVATE_KEY is not configured"},
            {status: 503},
        );
    }

    const account = privateKeyToAccount(pk as Hex);

    const innerHash = keccak256(
        encodePacked(
            ["address", "string", "uint256", "address"],
            [to, uri, BigInt(chainId), contract],
        ),
    );

    const signature = await account.signMessage({message: {raw: innerHash}});

    return NextResponse.json({
        signer: account.address,
        digest: innerHash,
        signature,
    });
}
