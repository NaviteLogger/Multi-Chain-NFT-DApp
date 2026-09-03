import {NextResponse} from "next/server";

interface Params {
    params: Promise<{tokenId: string}>;
}

const TOKEN_ID_PATTERN = /^(0|[1-9][0-9]{0,77})$/;

export async function GET(_request: Request, {params}: Params) {
    const {tokenId} = await params;
    if (!TOKEN_ID_PATTERN.test(tokenId)) {
        return NextResponse.json({error: "invalid tokenId"}, {status: 400});
    }

    return NextResponse.json({
        name: `MultiChain NFT #${tokenId}`,
        description:
            "An ERC-721 token from the MultiChain demo. Same metadata schema across chains.",
        image: `https://example.com/nfts/${tokenId}.png`,
        external_url: `https://example.com/nfts/${tokenId}`,
        attributes: [
            {trait_type: "Edition", value: Number(tokenId)},
            {trait_type: "Origin", value: "multichain-demo"},
        ],
    });
}
