export default {
  extends: ["@commitlint/config-conventional"],
  // Dependabot genera "Bump ..." con mayúscula; el resto de commits sigue la regla completa.
  ignores: [(mensaje) => /Signed-off-by: dependabot\[bot\]/i.test(mensaje)]
};
