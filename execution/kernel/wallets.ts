const walletsDir = ".wallets";
type Pk = "pk";
type Sk = "sk";
function walletPath(type: Pk | Sk, name: string) {
  return `${walletsDir}/${type}/${name}.${type}`;
}

function pkWallet(name: string) {
  return walletPath("pk", name);
}
function skWallet(name: string) {
  return walletPath("sk", name);
}

export { pkWallet, skWallet };
