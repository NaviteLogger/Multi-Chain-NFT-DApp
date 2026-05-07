import {test, expect} from "@playwright/test";
import {encodePacked, keccak256, recoverMessageAddress, type Hex} from "viem";
import {privateKeyToAddress} from "viem/accounts";

/**
 * Wallet + signing flow:
 *
 *   1. The dApp page renders both wallet panels.
 *   2. Clicking the EVM "Connect Wallet" button opens RainbowKit's modal,
 *      which is the start of the user's MetaMask flow.
 *   3. The Sui dapp-kit ConnectButton is rendered and reachable.
 *   4. The backend `/api/sign-mint` route signs an EIP-191 message that
 *      recovers to the configured `MINT_SIGNER_PRIVATE_KEY`. This is the
 *      exact signature the EVM contract verifies in `mintWithSignature`,
 *      so this test exercises the full signing path even though we don't
 *      drive a live wallet (which would require Synpress / MetaMask).
 */

const SIGNER_PK =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;

test.describe("MultiChain NFT — wallet + signing flow", () => {
    test("home page renders both wallet panels", async ({page}) => {
        await page.goto("/");
        await expect(page.getByRole("heading", {name: /MultiChain NFT/})).toBeVisible();
        await expect(page.getByTestId("evm-panel")).toBeVisible();
        await expect(page.getByTestId("sui-panel")).toBeVisible();
    });

    test("EVM Connect Wallet button opens RainbowKit modal", async ({page}) => {
        await page.goto("/");

        const evmConnect = page
            .getByTestId("evm-panel")
            .getByRole("button", {name: /Connect Wallet/i});
        await expect(evmConnect).toBeVisible();
        await evmConnect.click();

        // RainbowKit modal renders inside its own portal — the title is "Connect a Wallet"
        const modalTitle = page.getByRole("heading", {name: /Connect a Wallet/i});
        await expect(modalTitle).toBeVisible({timeout: 10_000});

        await page.keyboard.press("Escape");
        await expect(modalTitle).toBeHidden();
    });

    test("Sui Connect button is rendered", async ({page}) => {
        await page.goto("/");
        const suiConnect = page
            .getByTestId("sui-panel")
            .getByRole("button", {name: /Connect/i});
        await expect(suiConnect).toBeVisible();
    });

    test("backend /api/sign-mint produces a signature recoverable to the configured signer", async ({
        request,
    }) => {
        const to = "0xabc0000000000000000000000000000000000001" as const;
        const uri = "ipfs://QmExampleCID/0.json";
        const chainId = 11155111; // Sepolia
        const contract = "0x0000000000000000000000000000000000000123" as const;

        const res = await request.post("/api/sign-mint", {
            data: {to, uri, chainId, contract},
        });
        expect(res.status()).toBe(200);

        const body = (await res.json()) as {
            signer: `0x${string}`;
            digest: `0x${string}`;
            signature: `0x${string}`;
        };

        expect(body.signature).toMatch(/^0x[0-9a-fA-F]{130}$/);
        expect(body.digest).toMatch(/^0x[0-9a-fA-F]{64}$/);

        // Recompute the inner digest the way Solidity does and recover the signer.
        const expectedDigest = keccak256(
            encodePacked(
                ["address", "string", "uint256", "address"],
                [to, uri, BigInt(chainId), contract],
            ),
        );
        expect(body.digest.toLowerCase()).toBe(expectedDigest.toLowerCase());

        const recovered = await recoverMessageAddress({
            message: {raw: body.digest as Hex},
            signature: body.signature,
        });
        expect(recovered.toLowerCase()).toBe(body.signer.toLowerCase());

        // And that signer matches the test private key the server is using.
        const expectedSigner = privateKeyToAddress(SIGNER_PK);
        expect(body.signer.toLowerCase()).toBe(expectedSigner.toLowerCase());
    });

    test("backend /api/sign-mint rejects unsupported chains", async ({request}) => {
        const res = await request.post("/api/sign-mint", {
            data: {
                to: "0xabc0000000000000000000000000000000000001",
                uri: "ipfs://x",
                chainId: 1, // mainnet — not allowed in this dApp
                contract: "0x0000000000000000000000000000000000000123",
            },
        });
        expect(res.status()).toBe(400);
    });
});
