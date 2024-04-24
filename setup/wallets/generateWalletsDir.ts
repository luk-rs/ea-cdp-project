async function purgeDir(dirName: string) {
  try {
    const stat = await Deno.stat(dirName);
    await Deno.remove(dirName, { recursive: stat.isDirectory });
  } catch {
    //does not exist
  }

  await Deno.mkdir(dirName);
}

import wallets from "./walletDirs.ts";

await purgeDir(wallets.root);
await purgeDir(wallets.secrets);
await purgeDir(wallets.addresses);
