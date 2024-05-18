import {
  Blockfrost,
  Constr,
  Data,
  Lucid,
  fromText,
  toUnit,
} from "https://deno.land/x/lucid@0.10.7/mod.ts";
import { toLovelaces } from "./kernel/lovelaces.ts";
import { readValidator } from "./kernel/validators.ts";
import { pkWallet, skWallet } from "./kernel/wallets.ts";

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
const hotel_owner_utxos = await lucid.utxosAt(hotel_owner_addr.address.bech32);
const collateral_utxo = hotel_owner_utxos.find(
  (u) => u.assets.lovelace == toLovelaces(5n)
);
const available_utxos = hotel_owner_utxos.filter(
  (u) => u.assets.lovelace == toLovelaces(100n)
);

//contracts
const mintValidator = await readValidator("minting.mint", [hotel_owner_PKH]);

const holdingsValidator = await readValidator("holdings.hold", [
  hotel_owner_PKH,
]);

const shareholdingValidator = await readValidator("shareholding.stake", [
  hotel_owner_PKH,
]);

//addresses/ids
const mintPolicy = lucid.utils.mintingPolicyToId(mintValidator);
const holdingsAddress = lucid.utils.validatorToAddress(holdingsValidator);
const shareholdingAddress = lucid.utils.validatorToAddress(
  shareholdingValidator
);

console.log({
  mint_policy: mintPolicy,
  mint_policy_hex: fromText(mintPolicy),
  owner: {
    pkh: hotel_owner_PKH,
    addr: hotel_owner_addr.address.bech32,
    collateral: collateral_utxo,
    available: available_utxos.length,
  },
  hotel_hex: fromText("Parque"),
  holdingsAddress,
  shareholdingAddress,
});

// --- execution outline

try {
  const initial_mint = await mintHotel(
    "Parque",
    "https://ondalivrefm.net/olfm/wp-content/uploads/2018/06/image.jpg",
    72,
    10000n,
    toLovelaces(10n)
  );

  console.log(`Transactions Split!
    Tx Hash: ${initial_mint}
    PolicyId ${mintPolicy}
  `);

  await lucid.awaitTx(initial_mint);
} catch (error) {
  console.error(error);
}

// --- Transactions

async function mintHotel(
  name: string,
  nft_url: string,
  rooms: number,
  shares: bigint,
  share_cost: bigint
) {
  const tokenName = fromText(name);

  type ForgeRedeemer = {
    name: string;
    imageUrl: string;
    sharesNumber: bigint;
    profitability_share: bigint;
    shareCost: bigint;
  };

  const redeemerObj: ForgeRedeemer = {
    name: tokenName,
    imageUrl: fromText(nft_url),
    sharesNumber: shares,
    profitability_share: 49n, //todo get from parameters
    shareCost: share_cost,
  };

  console.log(redeemerObj);

  const redeemerData = new Constr(0, [
    redeemerObj.name,
    redeemerObj.imageUrl,
    redeemerObj.sharesNumber,
    redeemerObj.profitability_share,
    redeemerObj.shareCost,
  ]);

  const redeemer = Data.to(redeemerData);

  console.log(redeemerObj);

  const tx = await lucid
    .newTx()
    .mintAssets(
      {
        [toUnit(mintPolicy, tokenName, 100)]: BigInt(1),
        // [toUnit(mintPolicy, tokenName, 44)]: BigInt(rooms),// if i was to create shares for each individual room
        [toUnit(mintPolicy, tokenName, 444)]: BigInt(shares), //CIP 68
      },
      redeemer
    )
    .attachMintingPolicy(mintValidator)
    .payToContract(
      holdingsAddress,
      { inline: Data.to(new Constr(0, [])) },
      { [toUnit(mintPolicy, tokenName, 100)]: BigInt(1) }
    )
    .payToContract(
      shareholdingAddress,
      { inline: Data.to(new Constr(0, [])) },
      { [toUnit(mintPolicy, tokenName, 444)]: BigInt(1000) }
    )
    // .payToAddress(treasury.address, { lovelace: treasury.fees.mint }) //this would be the treasury fees if implemented
    .addSignerKey(hotel_owner_PKH!)
    .complete();

  const signed = await tx.sign().complete();

  return signed.submit();
}

// // async function buyShares(percentage: bigint){
// //   const tx = await lucid.newTx()
// //   .collectFrom(sharingAddr)
// //   .attachSpendingValidator(sharingValidator)
// //   .payToContract(sharingAddr,{}, {}) // user share
// //   .payToContract(sharingAddr,{}, {}) // remaining shares
// //   .payToContract(treasuryAddr, {}, {lovelace: 1n * LOVELACES_PER_ADA})
// //   .complete();

// //   const signed = await tx.sign().complete()

// //   return signed.submit();
// // }

// //todo move to another file
// async function splitUtxos(address: Address) {
//   const tx = await lucid
//     .newTx()
//     //collateral utxo
//     .payToAddress(address, { lovelace: toLovelaces(5n) })
//     //random utxos
//     .payToAddress(address, { lovelace: toLovelaces(100n) })
//     .payToAddress(address, { lovelace: toLovelaces(100n) })
//     .payToAddress(address, { lovelace: toLovelaces(100n) })
//     .payToAddress(address, { lovelace: toLovelaces(100n) })
//     .payToAddress(address, { lovelace: toLovelaces(100n) })
//     .payToAddress(address, { lovelace: toLovelaces(100n) })
//     .payToAddress(address, { lovelace: toLovelaces(100n) })
//     .payToAddress(address, { lovelace: toLovelaces(100n) })
//     .payToAddress(address, { lovelace: toLovelaces(100n) })
//     .complete();

//   const signedTx = await tx.sign().complete();

//   return signedTx.submit();
// }

// const splitTx = await splitUtxos(hotel_owner_addr.address.bech32);
// console.log({
//   splitTx,
// });
