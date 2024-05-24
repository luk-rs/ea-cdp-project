#!/bin/sh

# fund wallets from the one funded from faucet
deno run --allow-env --allow-read --allow-net ./setup/wallets/fund-wallets.ts hotel_owner
