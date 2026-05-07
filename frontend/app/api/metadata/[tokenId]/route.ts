import {NextResponse} from "next/server";

interface Params {
    params: {tokenId: string};
}

export async function GET(_request: Request, {params}: Params) {
    const {tokenId} = params;
    const id = Number(tokenId);
    if (!Number.isFinite(id) || id < 0) {
        return NextResponse.json({error: "invalid tokenId"}, {status: 400});
    }

    return NextResponse.json({
        name: `MultiChain NFT #${id}`,
        description: "An ERC-721 token from the MultiChain demo. Same metadata schema across chains.",
        image: `https://example.com/nfts/${id}.png`,
        external_url: `https://example.com/nfts/${id}`,
        attributes: [
            {trait_type: "Edition", value: id},
            {trait_type: "Origin", value: "multichain-demo"},
        ],
    });
}
