import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

// ─────────────────────────────────────────────────────────────────────────────
// De ce override-ul de mai jos:
//
// eslint-plugin-react-hooks v7 aduce regulile React Compiler (purity, immutability,
// use-memo, static-components etc.). Ele RULEAZĂ compilatorul React pe fiecare
// componentă. Pe `app/upload/[eventCode]/page.js` — un singur component de ~1000 de
// linii, cu un arbore JSX imens și o funcție de upload foarte complexă — analiza
// explodează: ~4.3 GB RSS, adică peste heap-ul implicit al Node → „JavaScript heap
// out of memory". Măsurat, regulă cu regulă, pe acel fișier:
//
//   clasice (rules-of-hooks + exhaustive-deps) →   141 MB   ✅
//   react-hooks/purity                         → 4.283 MB   💥
//   react-hooks/immutability                   → 4.272 MB   💥
//
// NU ridicăm limita de memorie a Node — ar fi o cârjă (pică oricum pe alte mașini).
// Dezactivăm DOAR regulile de compilator și DOAR pe fișierul-problemă, păstrând
// regulile de corectitudine (rules-of-hooks + exhaustive-deps) peste tot.
//
// TODO (post-lansare): spargem pagina de upload în hook + componente per view.
// Atunci override-ul dispare, iar regulile de compilator revin și pe ea.
// ─────────────────────────────────────────────────────────────────────────────
const REGULI_REACT_COMPILER = [
  "react-hooks/static-components",
  "react-hooks/use-memo",
  "react-hooks/preserve-manual-memoization",
  "react-hooks/incompatible-library",
  "react-hooks/immutability",
  "react-hooks/globals",
  "react-hooks/refs",
  "react-hooks/set-state-in-effect",
  "react-hooks/error-boundaries",
  "react-hooks/purity",
  "react-hooks/set-state-in-render",
  "react-hooks/unsupported-syntax",
  "react-hooks/config",
  "react-hooks/gating",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["app/upload/**/page.js"],
    rules: Object.fromEntries(REGULI_REACT_COMPILER.map((r) => [r, "off"])),
  },
]);

export default eslintConfig;
