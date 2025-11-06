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
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "functions/lib/**",
      "jest.config.js",
      "test-results/**",
    ],
  },
  {
    rules: {
      // セキュリティ関連のルール
      "no-console": "off", // 開発中は許可（段階的に修正）
      "no-debugger": "error",
      "no-alert": "warn", // 本番環境では削除推奨
      // TypeScript関連
      "@typescript-eslint/no-explicit-any": "warn", // 段階的に修正
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // コード品質
      "prefer-const": "warn", // errorからwarnに変更
      "no-var": "error",
      "eqeqeq": ["warn", "always"], // errorからwarnに変更
      "curly": ["warn", "all"], // errorからwarnに変更
    },
  },
];

export default eslintConfig;
