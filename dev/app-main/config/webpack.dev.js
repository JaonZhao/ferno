const path = require("path");
const { merge } = require("webpack-merge");
const common = require("./webpack.common");

module.exports = merge(common, {
  mode: "development",
  devtool: "source-map",
  devServer: {
    // static: {
    //   directory: path.join(__dirname, "../dist"),
    // },
    hot: true,
    host: "localhost",
    port: "8888",
    historyApiFallback: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    allowedHosts: 'all',
  }
});