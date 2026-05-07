# MultiChain NFT

A small dApp that mints NFTs on **two virtual machines** from one page:

- **EVM** — an ERC-721 deployed to Ethereum Sepolia, Base Sepolia, and Polygon Amoy testnets.
- **Sui** — a Move object minted on Sui testnet.

The frontend wires **MetaMask / WalletConnect** (via RainbowKit + wagmi) and the
**Sui Wallet** (via `@mysten/dapp-kit`) on the same page. The backend is a thin
Next.js Route Handlers layer that signs EIP-191 mint authorisations, serves
ERC-721 metadata, and exposes a holdings stub.

## Stack

| Layer         | Tooling                                                               |
| ------------- | --------------------------------------------------------------------- |
| EVM contracts | Foundry · Solidity 0.8.24 · OpenZeppelin (ERC-721, ERC-2981, Ownable) |
| Sui contracts | Sui Move (2024 edition) · `display` · capability-gated mint           |
| Frontend      | Next.js 14 (App Router) · React 18 · TypeScript · Tailwind            |
| EVM wallets   | wagmi v2 · viem v2 · `@rainbow-me/rainbowkit`                         |
| Sui wallets   | `@mysten/dapp-kit` · `@mysten/sui`                                    |
| Backend       | Next.js Route Handlers · viem signing (EIP-191)                       |
| API docs      | Hand-written OpenAPI 3 (`frontend/openapi.yaml`)                      |
| Tests         | `forge test` · Sui `move test` · Playwright (Chromium)                |

## Repo layout

```
contracts-evm/          # Foundry project — ERC-721 deployable to multiple chains
  src/MultiChainNFT.sol # ERC-721 + ERC-2981 + signature-gated mint
  test/                 # forge tests
  script/Deploy.s.sol   # multi-chain deploy script

contracts-sui/          # Sui Move package — capability-gated NFT module
  sources/nft.move      # Move module
  tests/                # move tests

frontend/               # Next.js 14 dApp + backend
  app/                  # UI + Route Handlers under /api
  components/           # EvmPanel + SuiPanel
  lib/                  # wagmi config, ABI, contract addresses
  openapi.yaml          # Hand-written backend spec
  tests/                # Playwright wallet + signing flow
  playwright.config.ts
```

## What's verified

| Artifact                                       | Status                         |
| ---------------------------------------------- | ------------------------------ |
| `forge test` — `contracts-evm/`                | **24/24 passing** (incl. fuzz) |
| `sui move test` — `contracts-sui/`             | **5/5 passing**                |
| `npm run build` / `npm run lint` — `frontend/` | **green**                      |
| `npx playwright test` — `frontend/`            | **24/24 passing**              |
| `redocly lint openapi.yaml`                    | **valid** (1 cosmetic warning) |

## Quickstart

### 1. Clone with submodules

```bash
git clone --recurse-submodules <repo-url>
# or, if already cloned:
git submodule update --init --recursive
```

### 2. EVM contracts

```bash
cd contracts-evm
forge build
forge test -vv
```

Deploy to Sepolia (or any configured chain):

```bash
cp .env.example .env
forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --verify
```

### 3. Sui Move module

```bash
cd contracts-sui
sui move build
sui move test
sui client publish --gas-budget 100000000
```

### 4. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Run the wallet/signing flow tests:

```bash
npm run test:e2e:install
npm run test:e2e
```

## Backend API

OpenAPI spec lives at [`frontend/openapi.yaml`](frontend/openapi.yaml). Three
endpoints, implemented as Next.js Route Handlers:

| Method | Path                         | Purpose                                                               |
| ------ | ---------------------------- | --------------------------------------------------------------------- |
| POST   | `/api/sign-mint`             | EIP-191 mint authorisation — verified on-chain in `mintWithSignature` |
| GET    | `/api/metadata/{tokenId}`    | ERC-721 metadata JSON for `tokenURI` redirects                        |
| GET    | `/api/nft/{chain}/{address}` | Holdings stub (wraps Alchemy / Sui RPC in production)                 |

## Mint flow (EVM)

1. Browser asks `/api/sign-mint` for a signed authorisation: `(to, uri, chainId, contract)`.
2. Server signs `keccak256(abi.encodePacked(to, uri, chainId, contract))` as an
   Ethereum signed message with `MINT_SIGNER_PRIVATE_KEY` (held only on the server).
3. Browser submits `MultiChainNFT.mintWithSignature(to, uri, signature)` with
   the user's wallet.
4. Contract recovers the signer, checks it matches `mintSigner`, and ensures
   the digest hasn't been used. Mints on success.

The Playwright suite verifies (4) end-to-end by recovering the signature with
`viem` and comparing against the test signer's address.

## Mint flow (Sui)

1. Browser builds a Move call: `nft::mint_to_sender(MintCap, name, description, image_url)`.
2. The Sui Wallet signs and submits the PTB.
3. The module emits `NFTMinted`; the new object lands in the user's account.

## License

MIT.
