const path = require("path")

module.exports = {
    // モードの設定
    mode: "development",

    // エントリーポイントの設定
    entry: `./build/index.js`,

    // ファイルの出力設定
    output: {
        // 出力するファイル名
        filename: "bangbangboom-game.js",
        library:{
            name:'BangGame',
            type:'umd'
        },
        //  出力先のパス
        path: path.join(__dirname, "public"),
    },
    devServer: {
        static: "public",
        open: true,
    },
    module:{
        rules:[
            {
                test:/\.js$/,
                enforce:'pre',
                use:['source-map-loader'],
            },
        ],
    },
    ignoreWarnings: [/Failed to parse source map/],
}
