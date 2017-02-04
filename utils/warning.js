var clc = require("cli-color");
var LOADER_LABEL = "comment-loader";

module.exports = function (errMsg, fileName, location) {
    console.log(
        "[" + LOADER_LABEL + "]: " + clc.yellow(errMsg) + "\n" +
        "    File: " + clc.yellowBright(fileName || "") + "\n" +
        "    Position: " + (
            (location && location.start && location.end) ?
                clc.yellowBright(
                    "line: " + location.start.line + ", column: " + location.start.column +
                    " ~ " +
                    "line: " + location.end.line + ", column: " + location.end.column
                )
                : ''
        )
    );
};