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
const mintValidator = await readValidator("draft_mint.mint", [hotel_owner_PKH]);
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
  holdingsAddress,
  shareholdingAddress,
});

// --- execution outline

try {
  const initial_mint = await draft_mintHotel("HParqNg32", 1987);

  await lucid.awaitTx(initial_mint);

  console.log(`Transactions Split!
    Tx Hash: ${initial_mint}
    PolicyId ${mintPolicy}
  `);
} catch (error) {
  console.error(error);
}

// --- Transactions

function generateTokenWithPrefix(name: string, prefix: number) {
  const tokenName = fromText(name);

  const asset = toUnit(mintPolicy, tokenName, prefix);
  const metadata = {
    name: `${prefix}${name}`,
    //QmTCjrd9ZsxAK7VG8SvFpx7FwHH5T34XdmM9kw6YiaqYwH //PNG
    //Qme9wQYifNqSrYYieCZAmFbm6YVh4oytHYcprpQaHyFy9W //JPG
    image: "QmTCjrd9ZsxAK7VG8SvFpx7FwHH5T34XdmM9kw6YiaqYwH",
  };

  return { asset, metadata };
}

async function draft_mintHotel(name: string, sharesAmount: number) {
  const hotelAsset = generateTokenWithPrefix(name, 100);
  const shareAsset = generateTokenWithPrefix(name, 444);

  // const referenceMetadata = {
  //   name: `hotel '${name}'`,
  //   description: `my '${name}' hotel`,
  //   image: "Qme9wQYifNqSrYYieCZAmFbm6YVh4oytHYcprpQaHyFy9W",
  //   mediaType: "image/jpeg",
  // };

  // const sharesMetadata = {
  //   name: `shares '${name}'`,
  //   description: `my '${name}' hotel shares`,
  //   image: "QmTCjrd9ZsxAK7VG8SvFpx7FwHH5T34XdmM9kw6YiaqYwH",
  //   decimals: 2,
  // };

  const redeemer = Data.to(new Constr(0, []));

  const tx = await lucid
    .newTx()
    .mintAssets(
      {
        [hotelAsset.asset]: 1n,
        [shareAsset.asset]: BigInt(sharesAmount), //CIP 68
      },
      redeemer
    )
    .attachMintingPolicy(mintValidator)
    // .payToContract(
    //   holdingsAddress,
    .payToAddressWithData(
      "addr_test1qrskd4s3a7fdcvw5nh46y7znzryt8mwqsyz852sj2gv2nk3vs0x0tqxtf3v2pgd5xlghyc9e9ypmvhdaqdr9ks553f9qrg6y0h",
      {
        inline: Data.to(
          new Constr(0, [
            Data.fromJson({
              // ...hotelAsset.metadata,
            }),
            1n,
            new Constr(0, []),
          ])
        ),
      },
      { [hotelAsset.asset]: 1n }
    )
    // .payToContract(
    //   shareholdingAddress,
    .payToAddressWithData(
      "addr_test1qrskd4s3a7fdcvw5nh46y7znzryt8mwqsyz852sj2gv2nk3vs0x0tqxtf3v2pgd5xlghyc9e9ypmvhdaqdr9ks553f9qrg6y0h",
      {
        inline: Data.to(
          new Constr(0, [
            Data.fromJson({
              //todo replace with metadat
            }),
            2n,
            new Constr(0, []),
          ])
        ),
      },
      { [hotelAsset.asset]: BigInt(sharesAmount) }
    )
    // .payToAddress(treasury.address, { lovelace: treasury.fees.mint }) //this would be the treasury fees if implemented
    .addSignerKey(hotel_owner_PKH!)
    .complete();

  const signed = await tx.sign().complete();

  return signed.submit();
}
