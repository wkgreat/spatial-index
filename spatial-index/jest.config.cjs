module.exports = {
    // Jest 将会在项目中搜索的所有文件
    roots: ['<rootDir>/test'],

    // 将 .ts 文件转化为 JavaScript，使用 ts-jest
    // 'ts-jest' 会读取 tsconfig.json 文件
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
    },

    // 模块文件的扩展名，Jest 会按顺序查找
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

    // 忽略的文件，通常不需要测试
    testPathIgnorePatterns: ['/node_modules/'],

    // 测试文件的匹配模式，会匹配所有 *.test.ts 和 *.spec.ts 文件
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',

    // 如果你使用了路径别名，比如 @/，你需要在这里进行配置
    // 例如，在你的 tsconfig.json 中配置了 "paths": { "@/*": ["src/*"] }
    // 那么你需要在 Jest 中配置 moduleNameMapper
    /*
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1',
    },
    */
};