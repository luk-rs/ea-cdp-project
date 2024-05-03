use aiken/bytearray
use aiken/dict
use aiken/hash.{Blake2b_224, Hash}
use aiken/interval
use aiken/list
use aiken/transaction.{
  InlineDatum, Mint, Output, ScriptContext, Transaction, TransactionId,
}
use aiken/transaction/credential.{
  Address, VerificationKey, VerificationKeyCredential,
}
use aiken/transaction/value.{from_lovelace, to_minted_value}

type VerificationKeyHash =
  Hash<Blake2b_224, VerificationKey>

//100
const housing_prefix = #"000643b0"

//444
const shares_prefix = #"001bc280"

const housing_addr = #"12cba7cbc00000631cc3e2fecb006824a3085e69dd8f112c9dc7fd4b"

const shareholders_addr =
  #"12cba7cbc33f1f631cc3e2fecb006824a3000009dd8f112c9dc7fd4b"

type Minting {
  Forge {
    name: ByteArray,
    imageUrl: ByteArray,
    shares: Int,
    profitablity_share: Int,
    share_cost: Int,
  }
  //[0-100]
  Burn
}

type HousingDatum {
  HousingDatum
}

fn txSignedBy(tx: Transaction, who: VerificationKeyHash) -> Bool {
  list.has(tx.extra_signatories, who)
}

fn to_asset_names(base_name: ByteArray) -> List<value.AssetName> {
  //enforce token naming
  let token_name: value.AssetName = base_name
  let ref_housing_name = token_name
  let ref_shares_name = token_name

  [ref_housing_name, ref_shares_name]
}

fn build_token_names(base_name: ByteArray) -> List<value.AssetName> {
  let token_names = to_asset_names(base_name)
  let token_names_prefix =
    [housing_prefix, shares_prefix]

  list.map2(
    token_names_prefix,
    token_names,
    fn(prefix, name) { bytearray.concat(prefix, name) },
  )
}

fn compare_token_names(an: value.AssetName, tn: Option<ByteArray>) -> Bool {
  expect Some(tn) = tn
  an == tn
}

fn checkHousingOutput(
  outputs: List<Output>,
  policy_id: ByteArray,
  housing_name: ByteArray,
  housing_amount: Int,
  token_name_list: List<ByteArray>,
) -> Bool {
  //* mint 1x NFT with metadata and house prefix
  //  send to housing validator NFT
  expect
    list.any(
      outputs,
      fn(output) {
        expect InlineDatum(datum) = output.datum
        expect _datum: HousingDatum = datum
        value.quantity_of(output.value, policy_id, housing_name) == 1 && output.address.payment_credential == VerificationKeyCredential(
          housing_addr,
        )
      },
    )

  let housing_name_check =
    compare_token_names(housing_name, list.at(token_name_list, 0))
  let housing_amount_check = housing_amount == 1
  housing_name_check && housing_amount_check
}

fn checkSharesOutput(
  outputs: List<Output>,
  policy_id: ByteArray,
  shares_name: ByteArray,
  shares_amount: Int,
  shares: Int,
  token_name_list: List<ByteArray>,
) -> Bool {
  //* mint 'shares'x FT with shares prefix
  //  send to shareholding validator FTs
  expect
    list.any(
      outputs,
      fn(output) {
        value.quantity_of(output.value, policy_id, shares_name) == shares && output.address.payment_credential == VerificationKeyCredential(
          shareholders_addr,
        )
      },
    )
  let shares_name_check =
    compare_token_names(shares_name, list.at(token_name_list, 1))
  let shares_amount_check = shares_amount > 0 && shares_amount == shares
  shares_name_check && shares_amount_check
}

validator(owner: VerificationKeyHash) {
  fn mint(reedemer: Minting, ctx: ScriptContext) {
    let ScriptContext { transaction, purpose } = ctx

    expect Mint(policy_id) = purpose

    let Transaction { mint, outputs, .. } = transaction

    expect [(housing_name, housing_amount), (shares_name, shares_amount)] =
      mint
        |> value.from_minted_value
        |> value.tokens(policy_id)
        |> dict.to_list()

    //* tx signed by the owner
    expect txSignedBy(transaction, owner)

    when reedemer is {
      Forge(name, _url, shares, _profitability, _cost) -> {
        let token_name_list = build_token_names(name)

        let housing_check =
          checkHousingOutput(
            outputs,
            policy_id,
            housing_name,
            housing_amount,
            token_name_list,
          )
        let shares_check =
          checkSharesOutput(
            outputs,
            policy_id,
            shares_name,
            shares_amount,
            shares,
            token_name_list,
          )
        let treasury_check = True
        housing_check && shares_check && treasury_check
      }

      Burn -> True
    }
  }
}

fn transaction_fixture(signer: VerificationKeyHash) {
  let minting_policy: ByteArray =
    #"12cba7cbc33f1f631cc3e2fecb006824a3085e69dd8f112c9dc7fd4b"

  let expected_token_names = build_token_names(#"506172717565")

  expect [housing_name, shares_name] = expected_token_names

  let expected_housing_value =
    value.zero()
      |> value.add(minting_policy, housing_name, 1)
  let expected_shares_value =
    value.zero()
      |> value.add(minting_policy, shares_name, 1000)

  let minted_tokens = value.merge(expected_housing_value, expected_shares_value)

  let test_outputs =
    []
      |> list.push(
          Output {
            address: Address {
              payment_credential: VerificationKeyCredential(housing_addr),
              stake_credential: None,
            },
            value: expected_housing_value,
            datum: InlineDatum(HousingDatum),
            reference_script: None,
          },
        )
      |> list.push(
          Output {
            address: Address {
              payment_credential: VerificationKeyCredential(shareholders_addr),
              stake_credential: None,
            },
            value: expected_shares_value,
            datum: InlineDatum(HousingDatum),
            reference_script: None,
          },
        )

  ScriptContext {
    purpose: Mint(minting_policy),
    transaction: Transaction {
      extra_signatories: [signer],
      mint: to_minted_value(minted_tokens),
      outputs: test_outputs,
      //irrelevant for use case
      inputs: [],
      reference_inputs: [],
      fee: from_lovelace(0),
      certificates: [],
      withdrawals: dict.new(),
      validity_range: interval.everything(),
      redeemers: dict.new(),
      datums: dict.new(),
      id: TransactionId(""),
    },
  }
}

test transaction_not_signed_by_owner() fail {
  let actual_owner = #"00d0b152cbfc9ebca7301e1593c51f994ed0751a15a83570bd85495b"
  let random_signer =
    #"00000000000000000000000000000000000000000000000000000420"

  let mint_redeemer =
    Forge {
      name: "Park",
      imageUrl: "",
      shares: 1000,
      profitablity_share: 49,
      share_cost: 10000000,
    }

  let ctx = transaction_fixture(random_signer)

  mint(actual_owner, mint_redeemer, ctx)
}

test transaction_signed_by_owner() {
  let actual_owner = #"00d0b152cbfc9ebca7301e1593c51f994ed0751a15a83570bd85495b"

  let mint_redeemer =
    Forge {
      name: #"506172717565",
      imageUrl: "",
      shares: 1000,
      profitablity_share: 49,
      share_cost: 10000000,
    }

  let ctx = transaction_fixture(actual_owner)

  mint(actual_owner, mint_redeemer, ctx)
}
