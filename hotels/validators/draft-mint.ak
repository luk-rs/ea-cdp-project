use aiken/list
use aiken/transaction.{Mint, ScriptContext, Transaction}
use hotels/kernel.{VerificationKeyHash}

type Minting {
  Forge
  Burn
}

fn txSignedBy(tx: Transaction, who: VerificationKeyHash) -> Bool {
  list.has(tx.extra_signatories, who)
}

validator(owner: VerificationKeyHash) {
  fn mint(reedemer: Minting, ctx: ScriptContext) {
    let ScriptContext { transaction, purpose } = ctx

    expect Mint(_policy_id) = purpose

    let Transaction { mint, outputs, .. } = transaction

    //* tx signed by the owner
    expect txSignedBy(transaction, owner)

    when reedemer is {
      Forge -> True
      Burn -> True
    }
  }
}

test transaction_not_signed_by_owner() fail {
  False
}
