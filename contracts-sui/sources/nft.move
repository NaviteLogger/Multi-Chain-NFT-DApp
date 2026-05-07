/// MultiChain NFT — Sui Move side.
///
/// Mirrors the EVM ERC-721 in spirit: a named NFT object minted by the holder
/// of a `MintCap` capability. Sui's object model gives us first-class display,
/// publisher, and capability primitives, which we use here.
module multichain_nft::nft;

use std::string::{Self, String};
use sui::display;
use sui::event;
use sui::package;

// ---------- One-time witness ----------

/// One-time witness used at publish time to claim a `Publisher`.
public struct NFT has drop {}

// ---------- Objects ----------

/// The NFT object itself.
public struct MultiChainNFT has key, store {
    id: UID,
    name: String,
    description: String,
    image_url: String,
    creator: address,
}

/// Capability authorising mints. Held by the deployer; can be transferred.
public struct MintCap has key, store {
    id: UID,
}

// ---------- Events ----------

public struct NFTMinted has copy, drop {
    nft_id: ID,
    recipient: address,
    creator: address,
    name: String,
}

public struct NFTBurned has copy, drop {
    nft_id: ID,
    burner: address,
}

// ---------- Errors ----------

const ENotCreator: u64 = 1;

// ---------- Init ----------

/// Runs once at package publish. Sets up `Display` and transfers the
/// `Publisher` and `MintCap` to the publisher.
fun init(otw: NFT, ctx: &mut TxContext) {
    let publisher = package::claim(otw, ctx);

    let keys = vector[
        string::utf8(b"name"),
        string::utf8(b"description"),
        string::utf8(b"image_url"),
        string::utf8(b"creator"),
    ];
    let values = vector[
        string::utf8(b"{name}"),
        string::utf8(b"{description}"),
        string::utf8(b"{image_url}"),
        string::utf8(b"{creator}"),
    ];

    let mut display = display::new_with_fields<MultiChainNFT>(&publisher, keys, values, ctx);
    display::update_version(&mut display);

    let sender = ctx.sender();
    transfer::public_transfer(publisher, sender);
    transfer::public_transfer(display, sender);
    transfer::public_transfer(MintCap { id: object::new(ctx) }, sender);
}

// ---------- Public API ----------

/// Mint a new NFT and transfer it to `recipient`. Caller must hold a `MintCap`.
public fun mint(
    _cap: &MintCap,
    name: vector<u8>,
    description: vector<u8>,
    image_url: vector<u8>,
    recipient: address,
    ctx: &mut TxContext,
) {
    let nft = MultiChainNFT {
        id: object::new(ctx),
        name: string::utf8(name),
        description: string::utf8(description),
        image_url: string::utf8(image_url),
        creator: ctx.sender(),
    };
    let nft_id = object::id(&nft);
    event::emit(NFTMinted {
        nft_id,
        recipient,
        creator: ctx.sender(),
        name: nft.name,
    });
    transfer::public_transfer(nft, recipient);
}

/// Self-mint convenience for demo: caller mints for themselves.
public fun mint_to_sender(
    cap: &MintCap,
    name: vector<u8>,
    description: vector<u8>,
    image_url: vector<u8>,
    ctx: &mut TxContext,
) {
    mint(cap, name, description, image_url, ctx.sender(), ctx);
}

/// Burn an NFT. Only the original creator can burn.
public fun burn(nft: MultiChainNFT, ctx: &TxContext) {
    assert!(nft.creator == ctx.sender(), ENotCreator);
    let nft_id = object::id(&nft);
    let MultiChainNFT { id, name: _, description: _, image_url: _, creator: _ } = nft;
    event::emit(NFTBurned { nft_id, burner: ctx.sender() });
    object::delete(id);
}

// ---------- Read-only accessors ----------

public fun name(nft: &MultiChainNFT): &String { &nft.name }
public fun description(nft: &MultiChainNFT): &String { &nft.description }
public fun image_url(nft: &MultiChainNFT): &String { &nft.image_url }
public fun creator(nft: &MultiChainNFT): address { nft.creator }

// ---------- Test helpers ----------

#[test_only]
public fun test_only_new_cap(ctx: &mut TxContext): MintCap {
    MintCap { id: object::new(ctx) }
}
