use aiken.{Data}
use aiken/transaction.{ScriptContext}
use hotels/kernel.{VerificationKeyHash}

validator(owner_pkh: VerificationKeyHash) {
  fn hold(_d: Data, _r: Data, _ctx: ScriptContext) {
    True
  }
}
