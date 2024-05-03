const LOVELACES_PER_ADA = 1000000n;
function toAda(lovelaces: bigint) {
  return lovelaces / LOVELACES_PER_ADA;
}

function toLovelaces(ada: bigint) {
  return ada * LOVELACES_PER_ADA;
}

export { toAda, toLovelaces };
