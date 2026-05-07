#[test_only]
module multichain_nft::nft_tests;

use multichain_nft::nft::{Self, MultiChainNFT, MintCap};
use sui::test_scenario as ts;

const ADMIN: address = @0xA11CE;
const ALICE: address = @0xCAFE;

#[test]
fun mint_assigns_recipient_and_metadata() {
    let mut scenario = ts::begin(ADMIN);

    // Publish: in tests we manually create a MintCap for the admin.
    {
        let cap = nft::test_only_new_cap(ts::ctx(&mut scenario));
        sui::transfer::public_transfer(cap, ADMIN);
    };

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
        assert!(nft::creator(&nft_obj) == ADMIN, 101);
        ts::return_to_sender(&scenario, nft_obj);
    };

    ts::end(scenario);
}
