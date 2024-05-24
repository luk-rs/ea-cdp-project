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
  console.log(entry.name, faucetWallet, entry.name.startsWith(faucetWallet));
  if (entry.name.startsWith(faucetWallet)) continue;

  const addr = await Deno.readTextFile(
    pkWallet(entry.name.slice(0, entry.name.length - 3))
  );

  console.log({
    name: entry.name,
    addr,
  });
  wallets.push(addr);
}

const tx = await fund(wallets);

await lucid.awaitTx(tx);

//************************/
//* HELPERS               /
//************************/
async function fund(wallets: string[]) {
  console.log("preparing tx");
  let txDef = lucid.newTx();

  for (const addr of wallets) {
    console.log(`adding ${addr} as recipient of tx`);
    txDef = txDef
      .payToAddress(addr, {
        lovelace: toLovelaces(500n),
      })
      .payToAddress(addr, {
        lovelace: toLovelaces(5n),
      });
  }

  const tx = await txDef.complete();

  console.log("signing tx");
  const signed = await tx.sign().complete();

  console.log("submitting tx");
  return signed.submit();
}
