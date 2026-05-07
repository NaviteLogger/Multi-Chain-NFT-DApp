import {test, expect} from "@playwright/test";
import {encodePacked, keccak256, recoverMessageAddress, type Hex} from "viem";
import {privateKeyToAddress} from "viem/accounts";

const SIGNER_PK =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;

const TO = "0xabc0000000000000000000000000000000000001" as const;
const URI = "ipfs://QmExampleCID/0.json";
const CHAIN_ID_SEPOLIA = 11155111;
const ALLOWED_CONTRACT = "0x1234567890123456789012345678901234567890" as const;

test.describe("/api/sign-mint validation", () => {
    test("signature recovers to the configured signer", async ({request}) => {
        const res = await request.post("/api/sign-mint", {
            data: {to: TO, uri: URI, chainId: CHAIN_ID_SEPOLIA, contract: ALLOWED_CONTRACT},
        });
        expect(res.status()).toBe(200);
        const body = await res.json();

        const expected = keccak256(
            encodePacked(
                ["address", "string", "uint256", "address"],
                [TO, URI, BigInt(CHAIN_ID_SEPOLIA), ALLOWED_CONTRACT],
            ),
        );
        expect(body.digest.toLowerCase()).toBe(expected.toLowerCase());

        const recovered = await recoverMessageAddress({
            message: {raw: body.digest as Hex},
            signature: body.signature,
        });
        expect(recovered.toLowerCase()).toBe(privateKeyToAddress(SIGNER_PK).toLowerCase());
    });

    test("rejects unsupported chainId", async ({request}) => {
        const res = await request.post("/api/sign-mint", {
            data: {to: TO, uri: URI, chainId: 1, contract: ALLOWED_CONTRACT},
        });
        expect(res.status()).toBe(400);
    });

    test("rejects mismatched contract address", async ({request}) => {
        const res = await request.post("/api/sign-mint", {
            data: {
                to: TO,
                uri: URI,
                chainId: CHAIN_ID_SEPOLIA,
                contract: "0x0000000000000000000000000000000000000bad",
            },
        });
        expect(res.status()).toBe(400);
    });

    test("rejects empty uri", async ({request}) => {
        const res = await request.post("/api/sign-mint", {
            data: {to: TO, uri: "", chainId: CHAIN_ID_SEPOLIA, contract: ALLOWED_CONTRACT},
        });
        expect(res.status()).toBe(400);
    });

    test("rejects oversized uri", async ({request}) => {
        const res = await request.post("/api/sign-mint", {
            data: {
                to: TO,
                uri: "x".repeat(513),
                chainId: CHAIN_ID_SEPOLIA,
                contract: ALLOWED_CONTRACT,
            },
        });
        expect(res.status()).toBe(400);
    });

    test("rejects malformed JSON", async ({request}) => {
        const res = await request.post("/api/sign-mint", {
            data: "not-json",
            headers: {"content-type": "application/json"},
        });
        expect(res.status()).toBe(400);
    });

    test("rejects malformed 'to' address", async ({request}) => {
        const res = await request.post("/api/sign-mint", {
            data: {to: "0xnope", uri: URI, chainId: CHAIN_ID_SEPOLIA, contract: ALLOWED_CONTRACT},
        });
        expect(res.status()).toBe(400);
    });
});
