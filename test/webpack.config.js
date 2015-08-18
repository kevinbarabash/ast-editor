module.exports = {
    entry: "./test.js",
    output: {
        path: __dirname,
        filename: "bundle.js"
    },
    module: {
        loaders: [
            { test: /\.jsx?/, loader: "babel-loader" }
        ]
    }
};
