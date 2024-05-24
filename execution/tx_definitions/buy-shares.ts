import {
  Blockfrost,
  Constr,
  Data,
  Lucid,
  fromText,
  toUnit,
} from "https://deno.land/x/lucid@0.10.7/mod.ts";
import { toLovelaces } from "../kernel/lovelaces.ts";
import { readValidator } from "../kernel/validators.ts";
import { pkWallet, skWallet } from "../kernel/wallets.ts";

// --- execution setup
const blockfrostProjectId = Deno.env.get("BLOCKFROST_PROJECT_ID");
const lucid = await Lucid.new(
  new Blockfrost(
    "https://cardano-preview.blockfrost.io/api/v0",
    blockfrostProjectId
  ),
  "Preview"
);

const hotel_owner_addr = lucid
  .selectWalletFromPrivateKey(await Deno.readTextFile(skWallet("hotel_owner")))
  .utils.getAddressDetails(await Deno.readTextFile(pkWallet("hotel_owner")));
const hotel_owner_PKH = hotel_owner_addr.paymentCredential?.hash;
const buyer_addr = lucid
  .selectWalletFromPrivateKey(
    await Deno.readTextFile(skWallet("share_holder_1"))
  )
  .utils.getAddressDetails(await Deno.readTextFile(pkWallet("share_holder_1")));
const buyer_PKH = buyer_addr.paymentCredential?.hash;

//contracts
const mintValidator = await readValidator("mint_validation.mint", [
  hotel_owner_PKH,
]);
const owner_hotelValidator = await readValidator("holdings.hold", [
  hotel_owner_PKH,
]);
const mintPolicy = lucid.utils.mintingPolicyToId(mintValidator);
const owner_shareholdingValidator = await readValidator("shareholding.stake", [
  hotel_owner_PKH,
  mintPolicy,
]);

//addresses/ids
const owner_hotelAddress = lucid.utils.validatorToAddress(owner_hotelValidator);
const owner_shareholdingAddress = lucid.utils.validatorToAddress(
  owner_shareholdingValidator
);

//owner shareholding utxo

console.log({
  owner: {
    pkh: hotel_owner_PKH,
    addr: hotel_owner_addr.address.bech32,
  },
  buyer: {
    pkh: buyer_PKH,
    addr: buyer_addr.address.bech32,
  },
  owner_shareholdingAddress,
});

// --- Transactions
type draftParameters = {
  name: string;
  shares: number;
};

export async function draft_buyShares(buyParams: draftParameters) {
  const { name, shares } = buyParams;
  const tokenName = fromText(name);
  const ref_asset = toUnit(mintPolicy, tokenName, 100);
  const share_asset = toUnit(mintPolicy, tokenName, 333);

  const owner_hotel_utxos = await lucid.utxosAtWithUnit(
    owner_hotelAddress,
    ref_asset
  );
  const hotel_utxo_ref = owner_hotel_utxos[0];
  const raw_hotel_datum: Constr<Data> = Data.from(hotel_utxo_ref.datum!);

  const shares_utxos = await lucid.utxosAt(owner_shareholdingAddress);
  const owner_shares_utxos = shares_utxos.filter((u) => {
    const shareDatum: Constr<Data> = Data.from(u.datum!);
    return shareDatum.fields[3] == hotel_owner_PKH;
  });
  const raw_shares_Datum: Constr<Data> = Data.from(
    owner_shares_utxos[0].datum!
  ); //! I'm assuming only one owner utxo even though i'm not actually always ensuring that consolidation

  const shareCost = raw_hotel_datum.fields[1] as bigint;
  const previousShares = raw_shares_Datum.fields[0] as bigint;
  const boughtShares = BigInt(shares);
  const allShares = raw_hotel_datum.fields[0] as bigint;

  const buyer_utxos = (await lucid.utxosAt(buyer_addr.address.bech32)).filter(
    (u) => u.assets.lovelace > toLovelaces(boughtShares * shareCost)
  );

  const userDatum = new Constr(0, [
    boughtShares,
    shareCost,
    boughtShares / allShares,
    buyer_PKH!,
  ]);
  const ownerUpdatedDatum = new Constr(0, [
    previousShares - boughtShares,
    shareCost,
    (previousShares - boughtShares) / allShares,
    hotel_owner_PKH!,
  ]);
  const redeemerContent = new Constr(0, [boughtShares, buyer_PKH!, tokenName]);

  const user_shareholding_datum = Data.to(userDatum);
  const owner_updated_shareholdingDatum = Data.to(ownerUpdatedDatum);

  const redeemer = Data.to(redeemerContent);

  const tx = await lucid
    .newTx()
    .collectFrom([...buyer_utxos, ...owner_shares_utxos], redeemer)
    .attachSpendingValidator(owner_shareholdingValidator)
    .payToContract(
      owner_hotelAddress,
      {
        inline: Data.to(raw_hotel_datum),
      },
      {
        lovelace: toLovelaces(boughtShares * shareCost),
      }
    )
    .payToContract(
      owner_shareholdingAddress,
      {
        inline: owner_updated_shareholdingDatum,
      },
      { [share_asset]: previousShares - boughtShares }
    )
    .payToContract(
      owner_shareholdingAddress,
      { inline: user_shareholding_datum },
      {
        [share_asset]: BigInt(shares),
      }
    )
    .addSignerKey(buyer_PKH!)
    .complete({
      change: {
        address: buyer_addr.address.bech32,
      },
    });

  const signed = await tx.sign().complete();

  return { tx: signed.submit() };
}
