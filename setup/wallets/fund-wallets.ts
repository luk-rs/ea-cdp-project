import { Blockfrost, Lucid } from "https://deno.land/x/lucid@0.10.7/mod.ts";
import { toLovelaces } from "../../execution/kernel/lovelaces.ts";
import { pkWallet, skWallet } from "../../execution/kernel/wallets.ts";
import walletDirs from "./walletDirs.ts";

// --- execution setup
const blockfrostProjectId = Deno.env.get("BLOCKFROST_PROJECT_ID");
const lucid = await Lucid.new(
  new Blockfrost(
    "https://cardano-preview.blockfrost.io/api/v0",
    blockfrostProjectId
  ),
  "Preview"
);

const faucetWallet = Deno.args[0];

const fundsAddr = lucid
  .selectWalletFromPrivateKey(await Deno.readTextFile(skWallet(faucetWallet)))
  .utils.getAddressDetails(await Deno.readTextFile(pkWallet(faucetWallet)));

console.log("selected wallet", fundsAddr);

const wallets: string[] = [];
for (const entry of Deno.readDirSync(walletDirs.addresses)) {
  if (entry.name.startsWith(faucetWallet)) continue;
  console.log(entry.name);

  const addr = await Deno.readTextFile(pkWallet("hotel_owner"));

  wallets.push(addr);
}

const tx = await fund(wallets);

await lucid.awaitTx(tx);

//************************/
//* HELPERS               /
//************************/
async function fund(wallets: string[]) {
  let txDef = lucid.newTx();

  for (const addr of wallets) {
    txDef = txDef
      .payToAddress(addr, {
        lovelace: toLovelaces(500n),
      })
      .payToAddress(addr, {
        lovelace: toLovelaces(5n),
      });
  }

  const tx = await txDef.complete();

  const signed = await tx.sign().complete();

  return signed.submit();
}
