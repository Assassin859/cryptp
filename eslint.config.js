import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'artifacts/**', 'cache/**', 'types/**', 'test/**', 'node_modules/**', 'subgraph/**', 'scripts/**'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/utils/compiler.worker.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-async-promise-executor': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: [
      'src/components/IDELayout.tsx',
      'src/components/GitHubSyncModal.tsx',
      'src/components/TokenFactory.tsx',
      'src/utils/userData.ts',
      'src/utils/securityScanner.ts',
      'src/utils/traceMapper.ts',
      'src/components/SettingsSidebar.tsx',
      'src/components/GasProfiler.tsx',
      'src/components/SolidityEditor.tsx',
      'src/components/LinkIdentityModal.tsx',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
);
