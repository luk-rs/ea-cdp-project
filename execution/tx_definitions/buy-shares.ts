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
const buyer_PKH = hotel_owner_addr.paymentCredential?.hash;

//contracts
const mintValidator = await readValidator("mint_validation.mint", [
  hotel_owner_PKH,
]);
const owner_hotelValidator = await readValidator("holdings.hold", [
  hotel_owner_PKH,
]);
const owner_shareholdingValidator = await readValidator("shareholding.stake", [
  hotel_owner_PKH,
]);
const buyer_shareholdingValidator = await readValidator("shareholding.stake", [
  buyer_PKH,
]);

//addresses/ids
const mintPolicy = lucid.utils.mintingPolicyToId(mintValidator);
const owner_hotelAddress = lucid.utils.validatorToAddress(owner_hotelValidator);
const owner_shareholdingAddress = lucid.utils.validatorToAddress(
  owner_shareholdingValidator
);
const buyer_shareholdingAddress = lucid.utils.validatorToAddress(
  buyer_shareholdingValidator
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
  buyer_shareholdingAddress,
});

// --- Transactions
type draftParameters = {
  name: string;
  shares: number;
};

type refAssetDatum = {
  shareCost: number;
  sharesAmount: number;
};

export async function draft_buyShares(buyParams: draftParameters) {
  const { name, shares } = buyParams;
  const tokenName = fromText(name);
  const ref_asset = toUnit(mintPolicy, tokenName, 100);
  const share_asset = toUnit(mintPolicy, tokenName, 333);

  const owner_hotel_utxos = await lucid.utxosAtWithUnit(
    owner_shareholdingAddress,
    ref_asset
  );
  const raw_hotel_datum: Constr<Data> = Data.from(
    (await lucid.utxosAt(owner_shareholdingAddress))[0].datum!
  );
  const shareCost = Number(raw_hotel_datum.fields[0]);
  const totalShares = Number(raw_hotel_datum.fields[0]);
  console.log({ shareCost, totalShares }); //todo cleanup

  const previousShares = 0;

  console.log(
    owner_shareholdingAddress,
    owner_hotel_utxos,
    owner_hotel_utxos.length
  );

  const user_shareholding_datum = Data.to(new Constr(0, [])); //todo complete
  const owner_updated_shareholdingDatum = Data.to(new Constr(0, [])); //todo complete

  const redeemer = Data.void(); //todo complete

  const tx = await lucid
    .newTx()
    .collectFrom(owner_hotel_utxos, redeemer)
    .attachSpendingValidator(buyer_shareholdingValidator)
    .payToContract(
      owner_hotelAddress,
      {
        inline: Data.to(raw_hotel_datum),
      },
      {
        lovelace: toLovelaces(BigInt(shares * shareCost)),
      }
    )
    .payToContract(
      owner_shareholdingAddress,
      { inline: owner_updated_shareholdingDatum },
      { [share_asset]: BigInt(previousShares - shares) }
    )
    .payToContract(
      buyer_shareholdingAddress,
      { inline: user_shareholding_datum },
      {
        [share_asset]: BigInt(shares),
      }
    )
    .addSignerKey(buyer_PKH!)
    .complete();

  const signed = await tx.sign().complete();

  return { tx: signed.submit() };
}
