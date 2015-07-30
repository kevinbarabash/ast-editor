module.exports = {
    entry: "./src/index.js",
    output: {
        path: __dirname + "/demo",
        filename: "bundle.js"
    },
    devtool: 'source-map',
    module: {
        loaders: [
            { test: /\.jsx?/, loader: "babel-loader" }
        ]
    }
};
