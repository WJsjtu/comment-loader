var babylon = require("babylon");

var plugins = [
    "jsx",
    "flow",
    "doExpressions",
    "objectRestSpread",
    "decorators",
    "classProperties",
    "exportExtensions",
    "asyncGenerators",
    "functionBind",
    "functionSent",
    "dynamicImport"
];

var POSSIBLE_AST_OPTIONS = [{
    ranges: true,
    locations: true,
    ecmaVersion: 2017,
    sourceType: "module",
    plugins: plugins
}, {
    ranges: true,
    locations: true,
    ecmaVersion: 2017,
    sourceType: "script",
    plugins: plugins
}];

/**
 *
 * @param {string} source
 * @return {{ast: object, comments: Array}}|null
 */
function parseCode(source) {

    var ast;

    for (var i = 0; i < POSSIBLE_AST_OPTIONS.length; i++) {
        if (!ast) {
            try {
                ast = babylon.parse(source, POSSIBLE_AST_OPTIONS[i]);
            } catch (e) {
                // ignore the error
            }
        }
    }
    if (!ast || typeof ast !== "object") {
        return null;
    }

    return ast;
}

module.exports = parseCode;
