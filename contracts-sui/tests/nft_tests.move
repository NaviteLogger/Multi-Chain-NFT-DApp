#[test_only]
module multichain_nft::nft_tests;

use multichain_nft::nft::{Self, MultiChainNFT, MintCap};
use sui::test_scenario as ts;

const ADMIN: address = @0xA11CE;
const ALICE: address = @0xCAFE;
const BOB: address = @0xBEEF;

fun setup_with_cap(scenario: &mut ts::Scenario) {
    let cap = nft::test_only_new_cap(ts::ctx(scenario));
    sui::transfer::public_transfer(cap, ADMIN);
}

#[test]
fun mint_assigns_recipient_and_metadata() {
    let mut scenario = ts::begin(ADMIN);
    setup_with_cap(&mut scenario);

    ts::next_tx(&mut scenario, ADMIN);
    {
        let cap = ts::take_from_sender<MintCap>(&scenario);
        nft::mint(
            &cap,
            b"Genesis",
            b"First NFT in the multi-chain demo",
            b"ipfs://QmExample/0.png",
            ALICE,
            ts::ctx(&mut scenario),
        );
        ts::return_to_sender(&scenario, cap);
    };

    ts::next_tx(&mut scenario, ALICE);
    {
        let nft_obj = ts::take_from_sender<MultiChainNFT>(&scenario);
        assert!(*nft::name(&nft_obj) == std::string::utf8(b"Genesis"), 100);
        assert!(*nft::description(&nft_obj) == std::string::utf8(b"First NFT in the multi-chain demo"), 101);
        assert!(*nft::image_url(&nft_obj) == std::string::utf8(b"ipfs://QmExample/0.png"), 102);
        assert!(nft::creator(&nft_obj) == ADMIN, 103);
        ts::return_to_sender(&scenario, nft_obj);
    };

    ts::end(scenario);
}

#[test]
fun mint_to_sender_routes_back_to_caller() {
    let mut scenario = ts::begin(ADMIN);
    setup_with_cap(&mut scenario);

    ts::next_tx(&mut scenario, ADMIN);
    {
        let cap = ts::take_from_sender<MintCap>(&scenario);
        nft::mint_to_sender(
            &cap,
            b"Self",
            b"d",
            b"u",
            ts::ctx(&mut scenario),
        );
        ts::return_to_sender(&scenario, cap);
    };

    ts::next_tx(&mut scenario, ADMIN);
    {
        let nft_obj = ts::take_from_sender<MultiChainNFT>(&scenario);
        assert!(nft::creator(&nft_obj) == ADMIN, 200);
        ts::return_to_sender(&scenario, nft_obj);
    };

    ts::end(scenario);
}

#[test]
fun mint_multiple_creates_distinct_objects() {
    let mut scenario = ts::begin(ADMIN);
    setup_with_cap(&mut scenario);

    ts::next_tx(&mut scenario, ADMIN);
    {
        let cap = ts::take_from_sender<MintCap>(&scenario);
        nft::mint(&cap, b"A", b"d", b"u", ALICE, ts::ctx(&mut scenario));
        nft::mint(&cap, b"B", b"d", b"u", ALICE, ts::ctx(&mut scenario));
        nft::mint(&cap, b"C", b"d", b"u", ALICE, ts::ctx(&mut scenario));
        ts::return_to_sender(&scenario, cap);
    };

    ts::next_tx(&mut scenario, ALICE);
    {
        let owned_ids = ts::ids_for_sender<MultiChainNFT>(&scenario);
        assert!(std::vector::length(&owned_ids) == 3, 300);
    };

    ts::end(scenario);
}

#[test]
fun creator_can_burn() {
    let mut scenario = ts::begin(ADMIN);
    setup_with_cap(&mut scenario);

    ts::next_tx(&mut scenario, ADMIN);
    {
        let cap = ts::take_from_sender<MintCap>(&scenario);
        nft::mint(&cap, b"Burnable", b"d", b"u", ADMIN, ts::ctx(&mut scenario));
        ts::return_to_sender(&scenario, cap);
    };

    ts::next_tx(&mut scenario, ADMIN);
    {
        let nft_obj = ts::take_from_sender<MultiChainNFT>(&scenario);
        nft::burn(nft_obj, ts::ctx(&mut scenario));
    };

    ts::next_tx(&mut scenario, ADMIN);
    {
        let owned_ids = ts::ids_for_sender<MultiChainNFT>(&scenario);
        assert!(std::vector::length(&owned_ids) == 0, 400);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = nft::ENotCreator)]
fun non_creator_burn_aborts() {
    let mut scenario = ts::begin(ADMIN);
    setup_with_cap(&mut scenario);

    ts::next_tx(&mut scenario, ADMIN);
    {
        let cap = ts::take_from_sender<MintCap>(&scenario);
        nft::mint(&cap, b"Locked", b"d", b"u", ALICE, ts::ctx(&mut scenario));
        ts::return_to_sender(&scenario, cap);
    };

    ts::next_tx(&mut scenario, ALICE);
    {
        let nft_obj = ts::take_from_sender<MultiChainNFT>(&scenario);
        // Alice received the NFT but ADMIN is the creator. Sending the object
        // to BOB lets us simulate a non-creator trying to burn it.
        sui::transfer::public_transfer(nft_obj, BOB);
    };

    ts::next_tx(&mut scenario, BOB);
    {
        let nft_obj = ts::take_from_sender<MultiChainNFT>(&scenario);
        nft::burn(nft_obj, ts::ctx(&mut scenario));
    };

    ts::end(scenario);
}
