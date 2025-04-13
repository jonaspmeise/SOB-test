const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  devtool: 'inline-source-map',
  entry: './dist/client/scripts/script.js',
  mode: 'development',
  output: {
    filename: './dist/script.js'
  },
  resolve: {
    extensions: ['.js']
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: './client/css/*.css', to: './dist/[name][ext]' },
        { from: './client/*.html', to: './dist/[name][ext]' }
      ]
    })
  ]
};