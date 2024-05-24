#!/bin/sh

# mint ref hotel nft
# args
#* 1 - token Name
#* 2 - amount of shares to buy
#* 3 - wallet to buy (refer to .wallets/pk folder after executing `001-pre-execution-setup.sh` script) [IGNORE THE EXTENSION]
deno run --allow-env --allow-read --allow-net ./execution/002-buy-shares-tx.ts hotelPark 20 "share_holder_1"
