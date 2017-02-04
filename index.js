var loaderUtils = require("loader-utils");
var assign = require("object-assign");

module.exports = function (source, inputSourceMap) {

    // Handle options
    const globalOptions = this.options.macro || {};
    const loaderOptions = loaderUtils.parseQuery(this.query);
    const options = assign({}, globalOptions, loaderOptions);

    require('./macro').call(this, this.callback.bind(this), source, inputSourceMap);

};
