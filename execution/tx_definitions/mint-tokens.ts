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
const hotel_owner_utxos = await lucid.utxosAt(hotel_owner_addr.address.bech32);
const collateral_utxo = hotel_owner_utxos.find(
  (u) => u.assets.lovelace == toLovelaces(5n)
);
const available_utxos = hotel_owner_utxos.filter(
  (u) => u.assets.lovelace == toLovelaces(100n)
);

//contracts
const mintValidator = await readValidator("mint_validation.mint", [
  hotel_owner_PKH,
]);
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

// --- Transactions

function generateTokenWithPrefix(name: string, prefix: number, ref: string) {
  const tokenName = fromText(name);

  const unit = toUnit(mintPolicy, tokenName, prefix);

  const metadata = {
    name,
    prefix,
    description: `${name} -> ${ref} `,
    //QmTCjrd9ZsxAK7VG8SvFpx7FwHH5T34XdmM9kw6YiaqYwH //PNG
    //Qme9wQYifNqSrYYieCZAmFbm6YVh4oytHYcprpQaHyFy9W //JPG
    image: "QmTCjrd9ZsxAK7VG8SvFpx7FwHH5T34XdmM9kw6YiaqYwH",
    logo: "QmTCjrd9ZsxAK7VG8SvFpx7FwHH5T34XdmM9kw6YiaqYwH",
    mediaType: "image/png",
    unit: toUnit(mintPolicy, tokenName, prefix),
  };

  return { unit, metadata };
}

type draftParameters = {
  name: string;
  sharesAmount: number;
  shareCost: number;
  costPerNight: number;
  profitabilityShare: number;
};

export async function draft_mintHotel(mintParams: draftParameters) {
  const { name, sharesAmount, shareCost, costPerNight, profitabilityShare } =
    mintParams;
  // const debugAddr =
  //   "addr_test1qrskd4s3a7fdcvw5nh46y7znzryt8mwqsyz852sj2gv2nk3vs0x0tqxtf3v2pgd5xlghyc9e9ypmvhdaqdr9ks553f9qrg6y0h";
  const hotelToken = generateTokenWithPrefix(name, 100, "reference NFT");
  const shareToken = generateTokenWithPrefix(name, 333, "share FT");

  const redeemer = Data.to(
    new Constr(0, [
      fromText(name),
      BigInt(sharesAmount),
      BigInt(shareCost),
      BigInt(costPerNight),
      BigInt(profitabilityShare),
    ])
  );

  const shareholdingDatum = Data.to(
    new Constr(0, [BigInt(sharesAmount), BigInt(100)])
  );

  // const housingDatum = Data.to(
  //   new Constr(0, [Data.fromJson(hotelToken.metadata), 2n, new Constr(0, [])])
  // );
  const holdingsDatum = Data.to(
    new Constr(0, [
      BigInt(sharesAmount),
      BigInt(shareCost),
      BigInt(profitabilityShare),
      BigInt(costPerNight),
    ])
  );

  const tx = await lucid
    .newTx()
    .mintAssets(
      {
        [hotelToken.unit]: 1n,
        [shareToken.unit]: BigInt(sharesAmount), //CIP 68
      },
      redeemer
    )
    .attachMintingPolicy(mintValidator)
    .payToContract(
      holdingsAddress,
      // .payToAddressWithData(
      //   debugAddr,
      {
        inline: holdingsDatum,
      },
      { [hotelToken.unit]: 1n }
    )
    .payToContract(
      shareholdingAddress,
      // .payToAddressWithData(
      //   debugAddr,
      {
        inline: shareholdingDatum,
      },
      { [shareToken.unit]: BigInt(sharesAmount) }
    )
    // .payToAddress(treasury.address, { lovelace: treasury.fees.mint }) //this would be the treasury fees if implemented
    .addSignerKey(hotel_owner_PKH!)
    .complete();

  const signed = await tx.sign().complete();

  return { tx: signed.submit(), mintPolicy };
}
