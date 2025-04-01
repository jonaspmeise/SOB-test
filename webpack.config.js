const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  context: path.resolve(__dirname, 'client'),
  devtool: 'inline-source-map',
  entry: './scripts/script.ts',
  mode: 'development',
  module: {
    rules: [{
      test: /\.tsx?$/,
      use: 'ts-loader',
      exclude: /node_modules/
    }]
  },
  output: {
    filename: 'script.js',
    path: path.resolve(__dirname, 'dist')
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: './css/*.css', to: '[name][ext]' },
        { from: '*.html', to: '[name][ext]' }
      ]
    })
  ]
};