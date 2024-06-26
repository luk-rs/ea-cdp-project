import { Blockfrost, Lucid } from "https://deno.land/x/lucid@0.10.7/mod.ts";
import { draft_mintHotel } from "./tx_definitions/mint-tokens.ts";

const tokenName = Deno.args[0];
const sharesAmount = Number(Deno.args[1]);
const shareCost = Number(Deno.args[2]);
const costPerNight = Number(Deno.args[3]);
const profitabilityShare = Number(Deno.args[4]);

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
  name: tokenName,
  sharesAmount,
  shareCost,
  costPerNight,
  profitabilityShare,
});

const tx = await mint_tx_definition.tx;

await lucid.awaitTx(tx);

console.log(`Mint Transactions Split!
    Tx Hash: ${tx}
    Mint Policy ${mint_tx_definition.mintPolicy}
    Owner: ${mint_tx_definition.owner}
    Holdings Contract: ${mint_tx_definition.holdingsAddress}
    Shares Contract: ${mint_tx_definition.shareholdingAddress}
  `);
