import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import eslintPluginJsdoc from "eslint-plugin-jsdoc";

export default defineConfig([
  // 官方推荐的 JavaScript 配置
  js.configs.recommended,

  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      jsdoc: eslintPluginJsdoc,
    },
    rules: {
      // 一些常规规则
      "no-unused-vars": "warn",
      "no-console": "off",
      "jsdoc/require-jsdoc": ["error", {
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
        },
        publicOnly: true
      }],

      "jsdoc/require-param": "error",

      "jsdoc/require-returns": "error",

      "jsdoc/check-param-names": "error",

      "jsdoc/check-types": "error",

      "jsdoc/require-param-type": "error",

      "jsdoc/require-returns-type": "error"
    },
  },
]);
