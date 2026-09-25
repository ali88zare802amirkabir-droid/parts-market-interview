import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "generated/**",
      "next-env.d.ts",
      "prisma/test.db",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // The repo layer intentionally accepts both Prisma clients whose generated
      // namespaces are not structurally compatible in TypeScript; a loose
      // structural contract is required to bridge them.
      "@typescript-eslint/no-explicit-any": [
        "warn",
        { fixToUnknown: false },
      ],
    },
  },
];

export default eslintConfig;