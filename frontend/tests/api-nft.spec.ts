import {test, expect} from "@playwright/test";

const EVM = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
const SUI = "0x" + "1".repeat(64);

test.describe("/api/nft/{chain}/{address}", () => {
    test("returns an empty list for a valid EVM holder", async ({request}) => {
        const res = await request.get(`/api/nft/sepolia/${EVM}`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body).toEqual({
            chain: "sepolia",
            address: EVM,
            items: [],
            nextCursor: null,
        });
    });

    test("returns an empty list for a valid Sui holder", async ({request}) => {
        const res = await request.get(`/api/nft/sui-testnet/${SUI}`);
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.chain).toBe("sui-testnet");
        expect(body.items).toEqual([]);
    });

    test("rejects unsupported chains", async ({request}) => {
        const res = await request.get(`/api/nft/avalanche/${EVM}`);
        expect(res.status()).toBe(400);
    });

    test("rejects malformed EVM addresses", async ({request}) => {
        const res = await request.get("/api/nft/sepolia/0xnothex");
        expect(res.status()).toBe(400);
    });

    test("rejects malformed Sui addresses", async ({request}) => {
        const res = await request.get("/api/nft/sui-testnet/notasuiaddress");
        expect(res.status()).toBe(400);
    });
});
