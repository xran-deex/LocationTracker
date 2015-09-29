module.exports = {
    context: __dirname + "/www/js",
    entry: "./index.js",
    output: {
        path: __dirname + "/dist",
        filename: "bundle.js"
    }
};
