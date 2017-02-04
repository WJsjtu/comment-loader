var loaderUtils = require("loader-utils");
var assign = require("object-assign");

var warning = require("./utils/warning");
var error = require("./utils/error");
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


    var commentArray = [];

    comments.forEach(function (comment) {

        var ifdefReg = new RegExp("^\\s*<\\s*" + regEscape(options._IFDEF) + "\\s+([^>]*)\\s*>\\s*$", "g");
        var elseReg = new RegExp("^\\s*<\\s*" + regEscape(options._ELSE) + "\\s*>\\s*$", "g");
        var endifReg = new RegExp("^\\s*<\\s*" + regEscape(options._ENDIF) + "\\s*>\\s*$", "g");

        if (comment.value.match(ifdefReg)) commentArray.push({comment: comment, type: "if"});
        if (comment.value.match(elseReg)) commentArray.push({comment: comment, type: "else"});
        if (comment.value.match(endifReg)) commentArray.push({comment: comment, type: "end"});
    });

    commentArray.sort(function (a, b) {
        return a.comment.start - b.comment.start;
    });

    var buffer = new Buffer(source, options.encoding);

    var result = (function () {


        var length = commentArray.length;

        if (!length) return true;

        var current = 0, currentNode, currentType;

        /**
         * Get first if macro.
         */
        while (current < length) {
            currentNode = commentArray[current].comment;
            currentType = commentArray[current].type;
            if (currentType !== "if") {
                warning("The if marco is in the wrong position!", filename, currentNode.loc);
                current++;
                continue;
            }
            break;
        }

        var stack = [];

        while (current < length) {

            currentNode = commentArray[current].comment;
            currentType = commentArray[current].type;

            if (currentType == "if") {
                stack.push(commentArray[current]);
                current++;
                continue;
            } else if (currentType == "end") {

                if (!stack.length) {
                    warning("The end marco is in the wrong position!", filename, currentNode.loc);
                    current++;
                    continue;
                } else {
                    var ifComment = stack.pop(), elseComment;

                    if (ifComment.type == "else") {
                        elseComment = ifComment;
                        ifComment = stack.pop();
                    }

                    var defName = (
                        (new RegExp("^\\s*<\\s*" + regEscape(options._IFDEF) + "\\s+([^>]*)\\s*>\\s*$", "g")).exec(
                            ifComment.comment.value
                        )
                    )[1];

                    if (options.definition.indexOf(defName) < 0) {
                        if (elseComment) {
                            buffer.fill(" ", ifComment.comment.end, elseComment.comment.start - 1, options.encoding);
                        } else {
                            buffer.fill(" ", ifComment.comment.end, currentNode.start - 1, options.encoding);
                        }

                    } else {
                        if (elseComment) {
                            buffer.fill(" ", elseComment.comment.end, currentNode.start - 1, options.encoding);
                        }
                    }
                    current++;
                    continue;
                }
            } else if (currentType == "else") {
                if (!stack.length) {
                    warning("The else marco is in the wrong position!", filename, currentNode.loc);
                    current++;
                    continue;
                } else {
                    var lastComment = stack[stack.length - 1];
                    if (lastComment.type != "if") {
                        error("The else marco is in the wrong position!", filename, currentNode.loc);
                        return false;
                    } else {
                        stack.push(commentArray[current]);
                        current++;
                        continue;
                    }
                }
            }

        }

        return true;

    }).apply(this);

    callback(
        null,
        result === false ? source : buffer.toString(options.encoding),
        inputSourceMap
    );
};