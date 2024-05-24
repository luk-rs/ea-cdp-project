#!/bin/sh

# fund wallets from the one funded from faucet
deno run --allow-env --allow-read --allow-net ./execution/002-buy-shares-tx.ts hotelPark 20 "share_holder_1"
