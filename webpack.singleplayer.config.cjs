const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  devtool: 'inline-source-map',
  entry: './ts-temp/singleplayer/script.js',
  mode: 'development',
  output: {
    filename: './dist/singleplayer/script.js'
  },
  resolve: {
    extensions: ['.js']
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: './code/client/css/*.css', to: './dist/singleplayer/[name][ext]' },
        { from: './code/client/*.html', to: './dist/singleplayer/[name][ext]' }
      ]
    })
  ]
};