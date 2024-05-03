const walletName = Deno.args[0];

import { Lucid } from "https://deno.land/x/lucid@0.10.7/mod.ts";
import wallets from "./walletDirs.ts";

const lucid = await Lucid.new(undefined, "Preview");

const sk = lucid.utils.generatePrivateKey();
await Deno.writeTextFile(`${wallets.secrets}/${walletName}.sk`, sk);

const pk = await lucid.selectWalletFromPrivateKey(sk).wallet.address();
await Deno.writeTextFile(`${wallets.addresses}/${walletName}.pk`, pk);
