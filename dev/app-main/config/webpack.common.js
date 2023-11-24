const path = require("path");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const VueLoaderPlugin = require('vue-loader/lib/plugin');

module.exports = {
  entry: path.join(__dirname, "../src/main.ts"),
  output: {
    // publicPath: path.resolve(__dirname, "../src"),
    path: path.resolve(__dirname, "../dist"),
    filename: "[name].js",
  },
  resolve: {
    extensions: ['.js', '.ts', '.vue', '.json'],
    alias: {
      'vue$': 'vue/dist/vue.esm.js',
      '@': path.resolve(__dirname, 'src'),
    }
  },
  module: {
    rules: [
      {
				test : /\.tsx?$/,
        loader: "ts-loader",
        options: {
          appendTsSuffixTo: [/\.vue$/],
        },
				exclude : /node_modules/
      },
      {
				test : /\.vue$/,
				loader : 'vue-loader'
			},
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "../index.html"),
      filename: "index.html",
      inject: true
    }),
    new VueLoaderPlugin(),
  ],
};