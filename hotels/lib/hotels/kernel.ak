use aiken/bytearray
use aiken/hash.{Blake2b_224, Hash}
use aiken/list
use aiken/transaction.{Transaction}
use aiken/transaction/credential.{VerificationKey}
use aiken/transaction/value

pub type VerificationKeyHash =
  Hash<Blake2b_224, VerificationKey>

pub fn txSignedBy(tx: Transaction, who: VerificationKeyHash) -> Bool {
  list.has(tx.extra_signatories, who)
}

pub fn build_name(name: ByteArray, prefix: ByteArray) -> ByteArray {
  let token_name: value.AssetName = name
  bytearray.concat(prefix, token_name)
}

//* (100)
pub const housing_prefix = #"000643b0"

//* (333)
pub const shares_prefix = #"0014df10"
