import { toLovelaces } from "./lovelaces.ts";
import { pkWallet } from "./wallets.ts";

const mint = toLovelaces(5n);
const buyShare = toLovelaces(1n);
const rent = toLovelaces(1n);

const fees = { mint, buyShare, rent };

const treasuryAddr = await Deno.readTextFile(pkWallet("treasury"));

export default { address: treasuryAddr, fees };
