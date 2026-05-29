import nextConfig from "eslint-config-next";

// eslint-config-next 16 ships a native flat config — import and spread it
// directly. (The old FlatCompat.extends() path breaks under ESLint 9 with a
// "circular structure" error in the legacy eslintrc validator.) Pattern mirrors
// the sibling 8bitoracle-next project.
const eslintConfig = [
  { ignores: ["src/generated/**", ".next/**", "node_modules/**"] },
  ...nextConfig,
  {
    // eslint-config-next 16 ships aggressive React-Compiler-era hooks rules.
    // Downgrade the noisiest to non-blocking, mirroring 8bitoracle-next — the
    // flagged effect patterns (setState-before-fetch, auto-select-first) are
    // intentional here.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
];

export default eslintConfig;
