import {test, expect} from "@playwright/test";

test.describe("/api/metadata/{tokenId}", () => {
    test("returns ERC-721 metadata for a valid id", async ({request}) => {
        const res = await request.get("/api/metadata/42");
        expect(res.status()).toBe(200);

        const body = await res.json();
        expect(body.name).toBe("MultiChain NFT #42");
        expect(typeof body.description).toBe("string");
        expect(body.image).toMatch(/^https?:\/\//);
        expect(Array.isArray(body.attributes)).toBe(true);
        expect(body.attributes).toEqual(
            expect.arrayContaining([
                expect.objectContaining({trait_type: "Edition", value: 42}),
            ]),
        );
    });

    test("supports tokenId 0", async ({request}) => {
        const res = await request.get("/api/metadata/0");
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.name).toBe("MultiChain NFT #0");
    });

    test("rejects non-numeric tokenId", async ({request}) => {
        const res = await request.get("/api/metadata/abc");
        expect(res.status()).toBe(400);
    });

    test("rejects decimal tokenId", async ({request}) => {
        const res = await request.get("/api/metadata/1.5");
        expect(res.status()).toBe(400);
    });

    test("rejects tokenId with leading zeros", async ({request}) => {
        const res = await request.get("/api/metadata/0042");
        expect(res.status()).toBe(400);
    });
});
