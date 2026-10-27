import {globalIgnores} from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
 ...nextVitals,
 ...nextTypescript,
 globalIgnores([".next/**", "out/**", "build/**", "dist/**", "next-env.d.ts", "coverage/**", "playwright-report/**", "test-results/**"]),
 // Existing product components predate flat-config lint adoption. Keep these
 // visible as warnings while enforcing all other Next/React/TypeScript checks.
 // These are not security or permission checks; address them incrementally.
 {rules:{
  "react/no-unescaped-entities":"warn",
  "react-hooks/set-state-in-effect":"warn",
  "react-hooks/purity":"warn",
  "@typescript-eslint/no-empty-object-type":"warn",
  "@next/next/no-assign-module-variable":"warn",
 }},
];

export default config;
