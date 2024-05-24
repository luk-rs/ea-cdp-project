import { Blockfrost, Lucid } from "https://deno.land/x/lucid@0.10.7/mod.ts";

import { draft_buyShares } from "./tx_definitions/buy-shares.ts";

const tokenName = Deno.args[0];
const shares = Number(Deno.args[1]);
const buyer = Deno.args[2];
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

const buy_shares_tx_definition = await draft_buyShares({
  name: tokenName,
  shares,
  buyer,
});

const tx = await buy_shares_tx_definition.tx;

await lucid.awaitTx(tx);

console.log(`Buy Transactions Split!
    Tx Hash: ${tx}
    Buyer: ${buy_shares_tx_definition.buyer}
    Shares Contract: ${buy_shares_tx_definition.sharesAddress}
  `);
