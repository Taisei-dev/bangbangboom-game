const path = require("path")

module.exports = {
    mode: "development",

    entry: `./src/index.ts`,

    // ライブラリの出力設定
    output: {
        filename: "bangbangboom-game.js",
        library: {
            name: "BangGame",
            type: "umd",
        },
        path: path.join(__dirname, "public"),
    },
    devtool: "source-map",
    devServer: {
        static: "public",
        open: true,
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use:["ts-loader"],
            },
        ],
    },
    resolve: {
        extensions: [".js", ".json", ".ts"],
    },
}
