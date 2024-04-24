#!/bin/sh
# generate required wallets to execute scenario
deno run --allow-read --allow-write ./setup/wallets/generateWalletsDir.ts

# generate treasury wallet
deno run --allow-net --allow-write ./setup/wallets/generateWalletKeyPair.ts treasury

# generate hotel owner wallet
deno run --allow-net --allow-write ./setup/wallets/generateWalletKeyPair.ts hotel_owner

# generate share holder wallets
deno run --allow-net --allow-write ./setup/wallets/generateWalletKeyPair.ts share_holder_1
deno run --allow-net --allow-write ./setup/wallets/generateWalletKeyPair.ts share_holder_2
deno run --allow-net --allow-write ./setup/wallets/generateWalletKeyPair.ts share_holder_3
deno run --allow-net --allow-write ./setup/wallets/generateWalletKeyPair.ts share_holder_4

# generate renter wallet
deno run --allow-net --allow-write ./setup/wallets/generateWalletKeyPair.ts renter
