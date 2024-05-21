use aiken/transaction.{ScriptContext}
use hotels/datum.{ShareholdingDatum}
use hotels/kernel.{VerificationKeyHash, txSignedBy}

type ShareholdingRedeemer {
  Mint { amount: Int }
  Buy { amount: Int }
  Return
}

validator(buyer_pkh: VerificationKeyHash) {
  fn stake(
    datum: ShareholdingDatum,
    redeemer: ShareholdingRedeemer,
    ctx: ScriptContext,
  ) {
    let ScriptContext { transaction, purpose } = ctx

    expect txSignedBy(transaction, buyer_pkh)

    expect ShareholdingDatum(num_shares, share) = datum

    expect txSignedBy(transaction, buyer_pkh)

    when redeemer is {
      Mint(amount) -> True
      Buy(amount) -> True
      Return -> False
    }
  }
}
