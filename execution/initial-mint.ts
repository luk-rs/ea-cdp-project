import {
  Blockfrost,
  Lucid,
  fromText,
} from "https://deno.land/x/lucid@0.10.7/mod.ts";
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

const hotel_owner_PKH = lucid
  .selectWalletFromPrivateKey(await Deno.readTextFile(skWallet("hotel_owner")))
  .utils.getAddressDetails(await Deno.readTextFile(pkWallet("hotel_owner")))
  .paymentCredential?.hash;

//contracts
const mintValidator = await readValidator("minting.mint", [hotel_owner_PKH]);

//addresses/ids
const mintPolicy = lucid.utils.mintingPolicyToId(mintValidator);
console.log(mintPolicy, fromText(mintPolicy), hotel_owner_PKH);

console.log({
  hotel_hex: fromText("Parque"),
});

// --- execution outline
// const initial_mint = await mintHotel(
//   "Parque",
//   "https://ondalivrefm.net/olfm/wp-content/uploads/2018/06/image.jpg",
//   72,
//   10000n,
//   toLovelaces(100n)
// );

// await lucid.awaitTx(initial_mint);

// console.log(`Transactions Split!
//   Tx Hash: ${initial_mint}
//   PolicyId ${mintPolicy}
// `);

// // --- Transactions

// async function mintHotel(
//   name: string,
//   nft_url: string,
//   rooms: number,
//   shares: bigint,
//   share_cost: bigint
// ) {
//   const tokenName = fromText(name);
//   const redeemer = Data.to(
//     new Constr(0, [
//       tokenName,
//       fromText(nft_url),
//       BigInt(shares),
//       BigInt(49),
//       BigInt(share_cost),
//     ])
//   );

//   const tx = await lucid
//     .newTx()
//     .mintAssets(
//       {
//         [toUnit(mintPolicy, tokenName, 100)]: BigInt(1),
//         // [toUnit(mintPolicy, tokenName, 44)]: BigInt(rooms),// if i was to create shares for each individual room
//         [toUnit(mintPolicy, tokenName, 444)]: BigInt(shares), //CIP 68
//       },
//       redeemer
//     )
//     .attachMintingPolicy(mintValidator)
//     // .payToContract(housingAddr, {inline: housingDatum }, [toUnit(mintPolicy, tokenName, 100):BigInt(1)])
//     // .payToContract(sharingAddr, {inline: sharingDatum }, [toUnit(mintPolicy, tokenName, 444):BigInt(1000)])
//     .payToAddress(await Deno.readTextFile(pkWallet("share_holder_4")))
//     .payToAddress(treasury.address, { lovelace: treasury.fees.mint })
//     .complete();

//   const signed = await tx.sign().complete();

//   return signed.submit();
// }

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
