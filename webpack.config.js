module.exports = {
    entry: "./src/index.js",
    output: {
        path: __dirname + "/demo",
        filename: "bundle.js",
        library: "ASTEditor",
        libraryTarget: "umd"
    },
    module: {
        loaders: [
            { test: /\.jsx?/, loader: "babel-loader" }
        ]
    }
};
