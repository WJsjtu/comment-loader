var loaderUtils = require("loader-utils");
var assign = require("object-assign");

var warning = require("./utils/warning");
var parse = require("./utils/parse");

/**
 *
 * @param {string} s
 * @return {string}
 */
function regEscape(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

module.exports = function (callback, source, inputSourceMap) {

    this.cacheable();

    // Handle filenames (#106)
    var webpackRemainingChain = loaderUtils.getRemainingRequest(this).split("!");
    var filename = webpackRemainingChain[webpackRemainingChain.length - 1];

    // Handle options
    var globalOptions = this.options.macro || {};
    var loaderOptions = loaderUtils.parseQuery(this.query);
    var userOptions = assign({}, globalOptions, loaderOptions);
    var defaultOptions = {
        definition: [],
        _IFDEF: "#IF_DEF",
        _ELSE: "#ELSE",
        _ENDIF: "#END_IF",
        encoding: "utf8"
    };
    var options = assign({}, defaultOptions, userOptions);

    /**
     * The definition should be array.
     */
    if (!Array.isArray(options.definition)) {
        warning("The definition option for macro mode requires an array!", filename);
        callback(null, source, inputSourceMap);
        return;
    }

    var parseResult = parse(source);

    if (!parseResult) {
        warning("File cannot be parsed!", filename);
        callback(null, source, inputSourceMap);
        return;
    }


    var comments = parseResult.comments.filter(function (commentNode) {
        return commentNode.type == "CommentLine";
    });


    var ifdefArray = [], elseArray = [], endifArray = [];

    comments.forEach(function (comment) {

        var ifdefReg = new RegExp("^\\s*<\\s*" + regEscape(options._IFDEF) + "\\s+([^>]*)\\s*>\\s*$", "g");
        var elseReg = new RegExp("^\\s*<\\s*" + regEscape(options._ELSE) + "\\s*>\\s*$", "g");
        var endifReg = new RegExp("^\\s*<\\s*" + regEscape(options._ENDIF) + "\\s*>\\s*$", "g");

        if (comment.value.match(ifdefReg)) ifdefArray.push(comment);
        if (comment.value.match(elseReg)) elseArray.push(comment);
        if (comment.value.match(endifReg)) endifArray.push(comment);
    });

    ifdefArray.sort(function (a, b) {
        return a.start - b.start;
    });
    elseArray.sort(function (a, b) {
        return a.start - b.start;
    });
    endifArray.sort(function (a, b) {
        return a.start - b.start;
    });


    var buffer = new Buffer(source, options.encoding);

    var result = (function () {

        var iIf = 0, iElse = 0, iEnd = 0;

        for (var l = ifdefArray.length; iIf < l; iIf++) {

            var ifComment = ifdefArray[iIf];

            if (iEnd >= endifArray.length) {
                warning("The define macro cannot match the ending macro!", filename, ifComment.loc);
                return false;
            }

            var endComment = endifArray[iEnd++];

            while (endComment.start < ifComment.start) {
                warning("The ending marco is in the wrong position!", filename, endComment.loc);
                if (iEnd < endifArray.length) {
                    endComment = endifArray[iEnd++];
                    continue;
                } else {
                    warning("The define macro cannot match the ending macro!", filename, ifComment.loc);
                    return false;
                }
            }

            var defName = (
                (new RegExp("^\\s*<\\s*" + regEscape(options._IFDEF) + "\\s+([^>]*)\\s*>\\s*$", "g")).exec(
                    ifComment.value
                )
            )[1];

            if (iElse < elseArray.length) {

                var elseComment = elseArray[iElse++];

                while (elseComment.start < ifComment.start) {
                    warning("The else marco is in the wrong position!", filename, elseComment.loc);
                    if (iElse < elseArray.length) {
                        elseComment = elseArray[iElse++];
                        continue;
                    } else {
                        elseComment = undefined;
                        break;
                    }
                }

                if (elseComment && elseComment.start < endComment.start) {
                    if (options.definition.indexOf(defName) < 0) {
                        buffer.fill(" ", elseComment.end, endComment.start - 1, options.encoding);
                    } else {
                        buffer.fill(" ", ifComment.end, elseComment.start - 1, options.encoding);
                    }
                } else {
                    if (options.definition.indexOf(defName) < 0) {
                        buffer.fill(" ", ifComment.end, endComment.start - 1, options.encoding);
                    }
                }

            } else {
                if (options.definition.indexOf(defName) < 0) {
                    buffer.fill(" ", ifComment.end, endComment.start - 1, options.encoding);
                }
            }

            if (iElse < elseArray.length) {
                warning("Several else marcos are in the wrong position!", filename);
            }
        }

        return true;

    }).apply(this);

    callback(
        null,
        (result === false || !ifdefArray.length) ? source : buffer.toString(options.encoding),
        inputSourceMap
    );
};