use hotels/kernel.{VerificationKeyHash}

pub type ShareholdingDatum {
  num_shares: Int,
  share_cost: Int,
  // [0-100] %
  share: Int,
  owner: VerificationKeyHash,
}

pub type HoldingsDatum {
  shares_amount: Int,
  share_cost: Int,
  profitablity_share: Int,
  cost_per_night: Int,
}
