import { Blockfrost, Lucid } from "https://deno.land/x/lucid@0.10.7/mod.ts";
import { currentToken } from "./000-consts.ts";
import { draft_buyShares } from "./tx_definitions/buy-shares.ts";

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
  name: currentToken,
  shares: 10,
});

const tx = await buy_shares_tx_definition.tx;

await lucid.awaitTx(tx);

console.log(`Buy Transactions Split!
    Tx Hash: ${tx}
  `);
