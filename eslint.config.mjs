import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

// eslint-config-next 16 ships native flat configs. The previous setup wrapped
// them in FlatCompat, which threw "Converting circular structure to JSON" under
// ESLint 10 — meaning `npm run lint` never actually ran in this repo.
// Consuming the flat arrays directly fixes it.
const eslintConfig = [
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts'],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default eslintConfig;
