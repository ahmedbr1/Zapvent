/** ESLint config for both Next (frontend) and Express (backend) */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "import", "n", "promise", "security"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:n/recommended",
    "plugin:promise/recommended",
    "plugin:security/recommended",
    "next/core-web-vitals", // Next-specific rules for the app/
    "prettier",
  ],
  settings: {
    "import/resolver": {
      typescript: {},
      node: { extensions: [".ts", ".tsx", ".js", ".jsx"] },
    },
  },
  env: { browser: true, node: true, es2021: true },
  ignorePatterns: ["node_modules/", "dist-server/", ".next/", "coverage/"],
  overrides: [
    // Backend: Node context, no React globals
    {
      files: ["server/**/*.ts"],
      env: { node: true },
      rules: {
        "n/no-missing-import": "off", // handled by TS
        "import/no-unresolved": "off", // handled by TS
      },
    },
    // Frontend: React files only
    {
      files: ["app/**/*.{ts,tsx}"],
      env: { browser: true },
    },
  ],
  rules: {
    // You can fine-tune here:
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "import/order": [
      "warn",
      { "newlines-between": "always", alphabetize: { order: "asc" } },
    ],
  },
};
