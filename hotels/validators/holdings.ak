use aiken/transaction.{ScriptContext}
use hotels/datum.{HoldingsDatum}
use hotels/kernel.{VerificationKeyHash}

type HoldingRedeemer {
  Mint { name: ByteArray }
  Burn
}

validator(_owner_pkh: VerificationKeyHash) {
  fn hold(_d: HoldingsDatum, redeemer: HoldingRedeemer, _ctx: ScriptContext) {
    when redeemer is {
      Mint(_name) -> True
      Burn -> False
    }
  }
}
