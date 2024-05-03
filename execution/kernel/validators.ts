import {
  MintingPolicy,
  applyDoubleCborEncoding,
  applyParamsToScript,
} from "https://deno.land/x/lucid@0.10.7/mod.ts";

type NamedValidator = {
  title: string;
};
async function readValidator(
  name: string,
  params: unknown[]
): Promise<MintingPolicy> {
  const plutus_content = await Deno.readTextFile("hotels/plutus.json");
  const plutus_json = JSON.parse(plutus_content);
  const validator = plutus_json.validators.find(
    (v: NamedValidator) => v.title === name
  );
  return {
    type: "PlutusV2",
    script: applyParamsToScript(
      applyDoubleCborEncoding(validator.compiledCode),
      params,
      undefined
    ),
  };
}

export { readValidator };
