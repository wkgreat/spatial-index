import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import eslintPluginJsdoc from "eslint-plugin-jsdoc";
import eslintPluginTs from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default defineConfig([

  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': eslintPluginTs,
      jsdoc: eslintPluginJsdoc,
    },
    rules: {

      "no-unused-vars": "off",

      "no-console": "off",

      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
      }],

      '@typescript-eslint/explicit-function-return-type': 'off',

      // "jsdoc/require-jsdoc": ["error", {
      //   require: {
      //     FunctionDeclaration: true,
      //     MethodDefinition: true,
      //     ClassDeclaration: true,
      //   },
      //   publicOnly: true
      // }],

      "jsdoc/require-param": "error",

      "jsdoc/require-returns": "error",

      "jsdoc/check-param-names": "error",

      "jsdoc/check-types": "error",

      // "jsdoc/require-param-type": "error",

      // "jsdoc/require-returns-type": "error"
    },
    settings: {
      jsdoc: {
        mode: 'typescript'
      }
    }
  },
]);
