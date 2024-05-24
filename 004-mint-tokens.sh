#!/bin/sh

# fund wallets from the one funded from faucet
deno run --allow-env --allow-read --allow-net ./execution/001-mint-tx.ts hotelPark 1000 10 100 45
