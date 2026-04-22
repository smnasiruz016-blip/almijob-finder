import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: ["node_modules/**", ".next/**", "zip-staging/**", "*.zip", "public/brand/**"]
  }
];

export default config;
