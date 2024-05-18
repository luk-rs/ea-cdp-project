import { Blockfrost, Lucid } from "https://deno.land/x/lucid@0.10.7/mod.ts";
import { draft_mintHotel } from "./tx_definitions/mint-tokens.ts";

// --- execution setup
const blockfrostProjectId = Deno.env.get("BLOCKFROST_PROJECT_ID");
const lucid = await Lucid.new(
  new Blockfrost(
    "https://cardano-preview.blockfrost.io/api/v0",
    blockfrostProjectId
  ),
  "Preview"
);

// --- execution outline

const mint_tx_definition = await draft_mintHotel({
  name: `Parque2024${Date.now()}`,
  sharesAmount: 1987,
});

const tx = await mint_tx_definition.tx;

await lucid.awaitTx(tx);

console.log(`Transactions Split!
    Tx Hash: ${tx}
    PolicyId ${mint_tx_definition.mintPolicy}
  `);
