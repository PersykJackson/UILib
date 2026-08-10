const path = require('path');

module.exports = {
  mode: 'production',
  entry: './index.ts',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    library: {
      type: 'module',
    },
  },
  experiments: {
    outputModule: true,
  },
  module: {
    rules: [
      {
        loader: 'ts-loader',
        test: /\.ts$/,
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
};
