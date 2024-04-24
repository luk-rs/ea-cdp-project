use aiken.{Data}
use aiken/hash.{Blake2b_224, Hash}
use aiken/transaction.{ScriptContext}
use aiken/transaction/credential.{VerificationKey}

type VerifactionKeyHash =
  Hash<Blake2b_224, VerificationKey>

validator {
  fn mintHotelAndShares(_r: Data, _ctx: ScriptContext) {
    True
  }
}

validator {
  fn buySharesStake(_d: Data, _r: Data, _ctx: ScriptContext) {
    True
  }
}

validator {
  fn rentRoomHotel(_d: Data, _r: Data, _ctx: ScriptContext) {
    True
  }
}
