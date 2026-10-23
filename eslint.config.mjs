import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config({
  files: ["src/studio/**/*.{ts,tsx}"],
  extends: [...tseslint.configs.recommended],
  languageOptions: { globals: { ...globals.browser } },
});
