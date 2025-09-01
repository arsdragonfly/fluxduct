import type IForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';

// eslint-disable-next-line @typescript-eslint/no-var-requires

// disabling it because it uses TS module resolution and gives too many false positives
// const ForkTsCheckerWebpackPlugin: typeof IForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

export const plugins = [
  /*
  new ForkTsCheckerWebpackPlugin({
    logger: 'webpack-infrastructure',
  }),
  */
];
