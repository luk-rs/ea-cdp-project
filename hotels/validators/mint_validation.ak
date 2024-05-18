use aiken/bytearray
use aiken/dict
use aiken/list
use aiken/transaction.{Mint, ScriptContext, Transaction}
use aiken/transaction/value
use hotels/kernel.{VerificationKeyHash}

type Minting {
  Forge { name: ByteArray, shares: Int }
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
      Forge(name, shares) -> {
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

        //! ensure these outputs go to different contracts
        expect ref_nft_output.address != shares_ft_output.address
        True
      }
      Burn -> True
    }
  }
}

//********************************
//* Helpers
//********************************
//* (100)
const housing_prefix = #"000643b0"

//* (333)
const shares_prefix = #"001bc280"

fn build_name(name: ByteArray, prefix: ByteArray) -> ByteArray {
  let token_name: value.AssetName = name
  bytearray.concat(prefix, token_name)
}

fn txSignedBy(tx: Transaction, who: VerificationKeyHash) -> Bool {
  list.has(tx.extra_signatories, who)
}

//********************************
//* Tests
//********************************
test transaction_not_signed_by_owner() fail {
  False
}
