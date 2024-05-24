use aiken/list
use aiken/transaction.{InlineDatum, ScriptContext, Spend, Transaction}
use aiken/transaction/value.{PolicyId}
use hotels/datum.{ShareholdingDatum}
use hotels/kernel.{VerificationKeyHash, build_name, shares_prefix, txSignedBy}

type ShareholdingRedeemer {
  Buy { amount: Int, buyer: VerificationKeyHash, token_name: ByteArray }
  Return
}

validator(owner_pkh: VerificationKeyHash, mint_policy: PolicyId) {
  fn stake(
    datum: ShareholdingDatum,
    redeemer: ShareholdingRedeemer,
    ctx: ScriptContext,
  ) {
    let ScriptContext { transaction, purpose } = ctx
    let Transaction { outputs, .. } = transaction

    //! it is a spending transaction
    expect Spend(_) = purpose

    //! it has the correct datum attached
    let ShareholdingDatum(num_shares, share_cost, _share, shares_owner) = datum

    when redeemer is {
      Buy(amount, buyer, name) -> {
        //! it is signed by the buyer and has a valid amount
        expect amount > 0
        expect txSignedBy(transaction, buyer)

        //! it must have transfer the shares cost to the hotel
        expect [hotel_output] =
          list.filter(
            outputs,
            fn(output) {
              value.quantity_of(output.value, #"", #"") == amount * share_cost * 1000000
            },
          )

        //! it must have transfer the shares to the buyer
        let shares_token = build_name(name, shares_prefix)
        expect [buyer_output] =
          list.filter(
            outputs,
            fn(output) {
              value.quantity_of(output.value, mint_policy, shares_token) == amount
            },
          )

        expect [owner_output] =
          list.filter(
            outputs,
            fn(output) {
              value.quantity_of(output.value, mint_policy, shares_token) == num_shares - amount
            },
          )

        //! buyer and owner resulting share must be updated correctly
        // let total_shares = num_shares * 100 / share
        expect InlineDatum(data) = owner_output.datum
        expect owner_datum: ShareholdingDatum = data
        expect owner_datum.num_shares == num_shares - amount

        // expect owner_datum.share == ( num_shares - amount ) * 100 / total_shares
        expect InlineDatum(data) = buyer_output.datum
        expect buyer_datum: ShareholdingDatum = data
        expect buyer_datum.num_shares == amount

        // expect buyer_datum.share == amount * 100 / total_shares
        //! buyer and owner output addresses must be the same and different from the hotel
        expect buyer_output.address == owner_output.address
        expect hotel_output.address != owner_output.address

        True
      }
      Return -> {
        //! not to be considered as it is not tested! only for recreational purposes
        expect shares_owner != owner_pkh
        expect txSignedBy(transaction, shares_owner)
        True
      }
    }
  }
}
