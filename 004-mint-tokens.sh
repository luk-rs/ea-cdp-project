#!/bin/sh
set -x

# mint ref hotel nft
# args
#* 1 - token Name
#* 2 - number of shares
#* 3 - individual share cost
#* 4 - stay cost per night
#* 5 - rental profitability share
deno run --allow-env --allow-read --allow-net ./execution/001-mint-tx.ts hotelPark 1000 10 100 45
