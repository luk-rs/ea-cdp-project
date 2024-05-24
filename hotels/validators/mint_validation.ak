use aiken/dict
use aiken/list
use aiken/transaction.{InlineDatum, Mint, ScriptContext, Transaction}
use aiken/transaction/value
use hotels/datum.{HoldingsDatum, ShareholdingDatum}
use hotels/kernel.{
  VerificationKeyHash, build_name, housing_prefix, shares_prefix, txSignedBy,
}

type Minting {
  Forge {
    name: ByteArray,
    shares: Int,
    share_cost: Int,
    cost_per_night: Int,
    profitablity_share: Int,
  }
  Burn
}

validator(owner: VerificationKeyHash) {
  fn mint(reedemer: Minting, ctx: ScriptContext) {
    let ScriptContext { transaction, purpose } = ctx

    //! it is a minting transaction
    expect Mint(policy_id) = purpose

    let Transaction { mint, outputs, .. } = transaction

    //! tx signed by the owner of the minting address
    expect txSignedBy(transaction, owner)

    when reedemer is {
      Forge(name, shares, share_cost, cost_per_night, profitablity_share) -> {
        //! there are only two items being minted
        expect [
          (ref_nft_name, ref_nft_amount),
          (shares_ft_name, shares_ft_amount),
        ] =
          mint
            |> value.from_minted_value
            |> value.tokens(policy_id)
            |> dict.to_list()

        //! minting the correct amount of items
        expect ref_nft_amount == 1
        expect shares_ft_amount == shares

        //! there are two outputs
        //? one is the housing contract for the owner
        let ref_nft_expected_name = build_name(name, housing_prefix)
        expect ref_nft_name == ref_nft_expected_name
        expect Some(ref_nft_output) =
          list.find(
            outputs,
            fn(output) {
              value.quantity_of(output.value, policy_id, ref_nft_name) == 1
            },
          )

        expect InlineDatum(inline_datum) = ref_nft_output.datum
        expect datum: HoldingsDatum = inline_datum

        expect
          datum.shares_amount == shares && datum.share_cost == share_cost && datum.profitablity_share == profitablity_share && datum.cost_per_night == cost_per_night
        //? another is the distribution contract of the owner
        let shares_ft_expected_name = build_name(name, shares_prefix)

        expect shares_ft_name == shares_ft_expected_name
        expect Some(shares_ft_output) =
          list.find(
            outputs,
            fn(output) {
              value.quantity_of(output.value, policy_id, shares_ft_name) == shares
            },
          )

        expect InlineDatum(inline_datum) = shares_ft_output.datum
        expect datum: ShareholdingDatum = inline_datum

        expect
          datum.num_shares == shares && datum.share == 100 && datum.owner == owner

        //! ensure these outputs go to different contracts
        expect ref_nft_output.address != shares_ft_output.address

        True
      }

      //todo not implemented at all but the idea is to only allow burn if owner is the holder of all tokens
      //todo so this means if he has sold some shares he has to buy them back in order to be able to burn the collection
      Burn -> True
    }
  }
}

//********************************
//* Tests
//********************************
test transaction_not_signed_by_owner() fail {
  False
}
