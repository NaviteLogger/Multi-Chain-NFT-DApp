import {NextResponse} from "next/server";
import {keccak256, encodePacked, isAddress, isHex, type Hex} from "viem";
import {privateKeyToAccount} from "viem/accounts";

interface SignBody {
    to: `0x${string}`;
    uri: string;
    chainId: number;
    contract: `0x${string}`;
}

const ALLOWED_CHAINS = new Set([11155111, 84532, 80002]);

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
    if (typeof uri !== "string" || uri.length === 0 || uri.length > 512) {
        return badRequest("invalid 'uri'");
    }
    if (typeof chainId !== "number" || !ALLOWED_CHAINS.has(chainId)) {
        return badRequest("unsupported 'chainId'");
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
