use aiken.{Data}
use aiken/transaction.{ScriptContext}
use hotels/kernel.{VerificationKeyHash}

type ShareholdingDatum {
  share_cost: Int,
  total_shares: Int,
}

validator(owner_pkh: VerificationKeyHash) {
  fn stake(datum: ShareholdingDatum, _r: Data, _ctx: ScriptContext) {
    expect ShareholdingDatum(share_cost, total_shares) = datum

    True
  }
}
