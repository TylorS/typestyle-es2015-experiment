var __extends = (undefined && undefined.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/**
 * Increment through IDs for FreeStyle, which can't generate hashed IDs.
 */
var instanceId = 0;
/**
 * The unique id is used to get a unique hash on styles (no merging).
 */
var uniqueId = 0;
/**
 * Tag styles with this string to get unique hash outputs.
 */
exports.IS_UNIQUE = '__DO_NOT_DEDUPE_STYLE__';
/**
 * CSS properties that are valid unit-less numbers.
 */
var CSS_NUMBER = {
    'animation-iteration-count': true,
    'box-flex': true,
    'box-flex-group': true,
    'column-count': true,
    'counter-increment': true,
    'counter-reset': true,
    'flex': true,
    'flex-grow': true,
    'flex-positive': true,
    'flex-shrink': true,
    'flex-negative': true,
    'font-weight': true,
    'line-clamp': true,
    'line-height': true,
    'opacity': true,
    'order': true,
    'orphans': true,
    'tab-size': true,
    'widows': true,
    'z-index': true,
    'zoom': true,
    // SVG properties.
    'fill-opacity': true,
    'stroke-dashoffset': true,
    'stroke-opacity': true,
    'stroke-width': true
};
// Add vendor prefixes to all unit-less properties.
for (var _i = 0, _a$1 = ['-webkit-', '-ms-', '-moz-', '-o-']; _i < _a$1.length; _i++) {
    var prefix = _a$1[_i];
    for (var _b = 0, _c = Object.keys(CSS_NUMBER); _b < _c.length; _b++) {
        var property = _c[_b];
        CSS_NUMBER[prefix + property] = true;
    }
}
/**
 * Transform a JavaScript property into a CSS property.
 */
function hyphenate(propertyName) {
    return propertyName
        .replace(/([A-Z])/g, '-$1')
        .replace(/^ms-/, '-ms-') // Internet Explorer vendor prefix.
        .toLowerCase();
}
/**
 * Check if a property name should pop to the top level of CSS.
 */
function isAtRule(propertyName) {
    return propertyName.charAt(0) === '@';
}
/**
 * Check if a value is a nested style definition.
 */
function isNestedStyle(value) {
    return value != null && typeof value === 'object' && !Array.isArray(value);
}
/**
 * Generate a hash value from a string.
 */
function stringHash(str) {
    var value = 5381;
    var i = str.length;
    while (i) {
        value = (value * 33) ^ str.charCodeAt(--i);
    }
    return (value >>> 0).toString(36);
}
exports.stringHash = stringHash;
/**
 * Transform a style string to a CSS string.
 */
function styleToString(name, value) {
    if (typeof value === 'number' && value !== 0 && !CSS_NUMBER[name]) {
        value = value + "px";
    }
    return name + ":" + String(value).replace(/([\{\}\[\]])/g, '\\$1');
}
/**
 * Sort an array of tuples by first value.
 */
function sortTuples(value) {
    return value.sort(function (a, b) { return a[0] > b[0] ? 1 : -1; });
}
/**
 * Categorize user styles.
 */
function parseUserStyles(styles, hasNestedStyles) {
    var properties = [];
    var nestedStyles = [];
    var isUnique = false;
    // Sort keys before adding to styles.
    for (var _i = 0, _a = Object.keys(styles); _i < _a.length; _i++) {
        var key = _a[_i];
        var value = styles[key];
        if (key === exports.IS_UNIQUE) {
            isUnique = !!value;
        }
        else if (isNestedStyle(value)) {
            nestedStyles.push([key.trim(), value]);
        }
        else {
            properties.push([hyphenate(key.trim()), value]);
        }
    }
    return {
        properties: sortTuples(properties),
        nestedStyles: hasNestedStyles ? nestedStyles : sortTuples(nestedStyles),
        isUnique: isUnique
    };
}
/**
 * Stringify an array of property tuples.
 */
function stringifyProperties(properties) {
    var result = [];
    var _loop_1 = function (name_1, value) {
        if (value != null) {
            if (Array.isArray(value)) {
                result.push(value.filter(function (x) { return x != null; }).map(function (x) { return styleToString(name_1, x); }).join(';'));
            }
            else {
                result.push(styleToString(name_1, value));
            }
        }
    };
    for (var _i = 0, properties_1 = properties; _i < properties_1.length; _i++) {
        var _a = properties_1[_i], name_1 = _a[0], value = _a[1];
        _loop_1(name_1, value);
    }
    return result.join(';');
}
/**
 * Interpolate CSS selectors.
 */
function interpolate(selector, parent) {
    if (selector.indexOf('&') > -1) {
        return selector.replace(/&/g, parent);
    }
    return parent + " " + selector;
}
/**
 * Register all styles, but collect for post-selector correction using the hash.
 */
function collectHashedStyles(container, userStyles, isStyle, displayName) {
    var styles = [];
    function stylize(cache, userStyles, selector) {
        var _a = parseUserStyles(userStyles, isStyle), properties = _a.properties, nestedStyles = _a.nestedStyles, isUnique = _a.isUnique;
        var styleString = stringifyProperties(properties);
        var pid = styleString;
        // Only create style instances when styles exists.
        if (styleString) {
            var style = new Style(styleString, cache.hash, isUnique ? "u" + (++uniqueId).toString(36) : undefined);
            cache.add(style);
            styles.push([cache, selector, style]);
        }
        for (var _i = 0, nestedStyles_1 = nestedStyles; _i < nestedStyles_1.length; _i++) {
            var _b = nestedStyles_1[_i], name_2 = _b[0], value = _b[1];
            pid += name_2;
            if (isAtRule(name_2)) {
                var rule = cache.add(new Rule(name_2, undefined, cache.hash));
                pid += stylize(rule, value, selector);
            }
            else {
                pid += stylize(cache, value, isStyle ? interpolate(name_2, selector) : name_2);
            }
        }
        return pid;
    }
    // Create a temporary cache to handle changes/mutations before re-assigning later.
    var cache = new Cache(container.hash);
    var pid = stylize(cache, userStyles, '&');
    var hash = "f" + cache.hash(pid);
    var id = displayName ? displayName + "_" + hash : hash;
    for (var _i = 0, styles_1 = styles; _i < styles_1.length; _i++) {
        var _a = styles_1[_i], cache_1 = _a[0], selector = _a[1], style = _a[2];
        var key = isStyle ? interpolate(selector, "." + id) : selector;
        cache_1.get(style).add(new Selector(key, style.hash, undefined, pid));
    }
    container.merge(cache);
    return { pid: pid, id: id };
}
/**
 * Recursively register styles on a container instance.
 */
function registerUserStyles(container, styles, displayName) {
    return collectHashedStyles(container, styles, true, displayName).id;
}
/**
 * Create user rule. Simplified collection of styles, since it doesn't need a unique id hash.
 */
function registerUserRule(container, selector, styles) {
    var _a = parseUserStyles(styles, false), properties = _a.properties, nestedStyles = _a.nestedStyles, isUnique = _a.isUnique;
    // Throw when using properties and nested styles together in rule.
    if (properties.length && nestedStyles.length) {
        throw new TypeError("Registering a CSS rule can not use properties with nested styles");
    }
    var styleString = stringifyProperties(properties);
    var rule = new Rule(selector, styleString, container.hash, isUnique ? "u" + (++uniqueId).toString(36) : undefined);
    for (var _i = 0, nestedStyles_2 = nestedStyles; _i < nestedStyles_2.length; _i++) {
        var _b = nestedStyles_2[_i], name_3 = _b[0], value = _b[1];
        registerUserRule(rule, name_3, value);
    }
    container.add(rule);
}
/**
 * Parse and register keyframes on the current instance.
 */
function registerUserHashedRule(container, prefix, styles, displayName) {
    var bucket = new Cache(container.hash);
    var _a = collectHashedStyles(bucket, styles, false, displayName), pid = _a.pid, id = _a.id;
    var atRule = new Rule(prefix + " " + id, undefined, container.hash, undefined, pid);
    atRule.merge(bucket);
    container.add(atRule);
    return id;
}
/**
 * Get the styles string for a container class.
 */
function getStyles(container) {
    return container.values().map(function (style) { return style.getStyles(); }).join('');
}
/**
 * Implement a cache/event emitter.
 */
var Cache = (function () {
    function Cache(hash) {
        this.hash = hash;
        this.changeId = 0;
        this._children = {};
        this._keys = [];
        this._counts = {};
    }
    Cache.prototype.values = function () {
        var _this = this;
        return this._keys.map(function (x) { return _this._children[x]; });
    };
    Cache.prototype.add = function (style) {
        var count = this._counts[style.id] || 0;
        var item = this._children[style.id] || style.clone();
        this._counts[style.id] = count + 1;
        if (count === 0) {
            this._keys.push(item.id);
            this._children[item.id] = item;
            this.changeId++;
        }
        else {
            // Check if contents are different.
            if (item.getIdentifier() !== style.getIdentifier()) {
                throw new TypeError("Hash collision: " + style.getStyles() + " === " + item.getStyles());
            }
            this._keys.splice(this._keys.indexOf(style.id), 1);
            this._keys.push(style.id);
            if (item instanceof Cache && style instanceof Cache) {
                var prevChangeId = item.changeId;
                item.merge(style);
                if (item.changeId !== prevChangeId) {
                    this.changeId++;
                }
            }
        }
        return item;
    };
    Cache.prototype.remove = function (style) {
        var count = this._counts[style.id];
        if (count > 0) {
            this._counts[style.id] = count - 1;
            var item = this._children[style.id];
            if (count === 1) {
                delete this._counts[style.id];
                delete this._children[style.id];
                this._keys.splice(this._keys.indexOf(style.id), 1);
                this.changeId++;
            }
            else if (item instanceof Cache && style instanceof Cache) {
                var prevChangeId = item.changeId;
                item.unmerge(style);
                if (item.changeId !== prevChangeId) {
                    this.changeId++;
                }
            }
        }
    };
    Cache.prototype.get = function (container) {
        return this._children[container.id];
    };
    Cache.prototype.merge = function (cache) {
        for (var _i = 0, _a = cache.values(); _i < _a.length; _i++) {
            var value = _a[_i];
            this.add(value);
        }
        return this;
    };
    Cache.prototype.unmerge = function (cache) {
        for (var _i = 0, _a = cache.values(); _i < _a.length; _i++) {
            var value = _a[_i];
            this.remove(value);
        }
        return this;
    };
    Cache.prototype.clone = function () {
        return new Cache(this.hash).merge(this);
    };
    return Cache;
}());
exports.Cache = Cache;
/**
 * Selector is a dumb class made to represent nested CSS selectors.
 */
var Selector = (function () {
    function Selector(selector, hash, id, pid) {
        if (id === void 0) { id = "s" + hash(selector); }
        if (pid === void 0) { pid = ''; }
        this.selector = selector;
        this.hash = hash;
        this.id = id;
        this.pid = pid;
    }
    Selector.prototype.getStyles = function () {
        return this.selector;
    };
    Selector.prototype.getIdentifier = function () {
        return this.pid + "." + this.selector;
    };
    Selector.prototype.clone = function () {
        return new Selector(this.selector, this.hash, this.id, this.pid);
    };
    return Selector;
}());
exports.Selector = Selector;
/**
 * The style container registers a style string with selectors.
 */
var Style = (function (_super) {
    __extends(Style, _super);
    function Style(style, hash, id) {
        if (id === void 0) { id = "c" + hash(style); }
        var _this = _super.call(this, hash) || this;
        _this.style = style;
        _this.hash = hash;
        _this.id = id;
        return _this;
    }
    Style.prototype.getStyles = function () {
        return this.values().map(function (x) { return x.selector; }).join(',') + "{" + this.style + "}";
    };
    Style.prototype.getIdentifier = function () {
        return this.style;
    };
    Style.prototype.clone = function () {
        return new Style(this.style, this.hash, this.id).merge(this);
    };
    return Style;
}(Cache));
exports.Style = Style;
/**
 * Implement rule logic for style output.
 */
var Rule = (function (_super) {
    __extends(Rule, _super);
    function Rule(rule, style, hash, id, pid) {
        if (style === void 0) { style = ''; }
        if (id === void 0) { id = "a" + hash(rule + "." + style); }
        if (pid === void 0) { pid = ''; }
        var _this = _super.call(this, hash) || this;
        _this.rule = rule;
        _this.style = style;
        _this.hash = hash;
        _this.id = id;
        _this.pid = pid;
        return _this;
    }
    Rule.prototype.getStyles = function () {
        return this.rule + "{" + this.style + getStyles(this) + "}";
    };
    Rule.prototype.getIdentifier = function () {
        return this.pid + "." + this.rule + "." + this.style;
    };
    Rule.prototype.clone = function () {
        return new Rule(this.rule, this.style, this.hash, this.id, this.pid).merge(this);
    };
    return Rule;
}(Cache));
exports.Rule = Rule;
/**
 * The FreeStyle class implements the API for everything else.
 */
var FreeStyle = (function (_super) {
    __extends(FreeStyle, _super);
    function FreeStyle(hash, debug, id) {
        if (id === void 0) { id = "f" + (++instanceId).toString(36); }
        var _this = _super.call(this, hash) || this;
        _this.hash = hash;
        _this.debug = debug;
        _this.id = id;
        return _this;
    }
    FreeStyle.prototype.registerStyle = function (styles, displayName) {
        return registerUserStyles(this, styles, this.debug ? displayName : undefined);
    };
    FreeStyle.prototype.registerKeyframes = function (keyframes, displayName) {
        return registerUserHashedRule(this, '@keyframes', keyframes, this.debug ? displayName : undefined);
    };
    FreeStyle.prototype.registerRule = function (rule, styles) {
        return registerUserRule(this, rule, styles);
    };
    FreeStyle.prototype.getStyles = function () {
        return getStyles(this);
    };
    FreeStyle.prototype.getIdentifier = function () {
        return this.id;
    };
    FreeStyle.prototype.clone = function () {
        return new FreeStyle(this.hash, this.debug, this.id).merge(this);
    };
    return FreeStyle;
}(Cache));
exports.FreeStyle = FreeStyle;
/**
 * Exports a simple function to create a new instance.
 */
function create(hash, debug) {
    if (hash === void 0) { hash = stringHash; }
    if (debug === void 0) { debug = process.env.NODE_ENV !== 'production'; }
    return new FreeStyle(hash, debug);
}
exports.create = create;

/**
 * Before we send styles to freeStyle we should convert any CSSType<T> to string
 * Call this whenever something might be a CSSType.
 */
function ensureString(x) {
    return typeof x.type === 'string'
        ? x.toString()
        : x;
}
/**
 * We need to do the following to *our* objects before passing to freestyle:
 * - Convert any CSSType to their string value
 * - For any `$nest` directive move up to FreeStyle style nesting
 * - For any `$unique` directive map to FreeStyle Unique
 * - For any `$debugName` directive return the debug name
 */
function ensureStringObj(object) {
    /** The final result we will return */
    var result = {};
    var debugName = '';
    for (var key in object) {
        /** Grab the value upfront */
        var val = object[key];
        /** TypeStyle configuration options */
        if (key === '$unique') {
            result[undefined] = val;
        }
        else if (key === '$nest') {
            var nested = val;
            for (var selector in nested) {
                var subproperties = nested[selector];
                result[selector] = ensureStringObj(subproperties).result;
            }
        }
        else if (key === '$debugName') {
            debugName = val;
        }
        else {
            result[key] = ensureString(val);
        }
    }
    return { result: result, debugName: debugName };
}

/**
 * All the CSS types in the 'types' namespace
 */
/**
 * @module Maintains a single stylesheet and keeps it in sync with requested styles
 */
/** Raf for node + browser */
var raf = typeof requestAnimationFrame === 'undefined' ? setTimeout : requestAnimationFrame;
/**
 * Only calls cb all sync operations settle
 */
var afterAllSync = (new (function () {
    function class_1() {
        var _this = this;
        this.pending = 0;
        this.afterAllSync = function (cb) {
            _this.pending++;
            var pending = _this.pending;
            raf(function () {
                if (pending !== _this.pending)
                    return;
                cb();
            });
        };
    }
    return class_1;
}())).afterAllSync;
/**
 * We have a single stylesheet that we update as components register themselves
 */
var freeStyle = undefined();
var lastFreeStyleChangeId = freeStyle.changeId;
/**
 * We create a tag on first request or return the one that was hydrated
 */
var _a = new (function () {
    function class_2() {
        var _this = this;
        this.singletonTag = undefined;
        this.getTag = function () {
            if (!_this.singletonTag) {
                _this.singletonTag = typeof window === 'undefined' ? { textContent: '' } : document.createElement('style');
                if (typeof document !== 'undefined')
                    document.head.appendChild(_this.singletonTag);
            }
            return _this.singletonTag;
        };
        this.setTag = function (tag) {
            /** Clear any data in any previous tag */
            if (_this.singletonTag) {
                _this.singletonTag.textContent = '';
            }
            _this.singletonTag = tag;
            /** This special time buffer immediately */
            forceRenderStyles();
        };
    }
    return class_2;
}());
var setTag = _a.setTag;
var getTag = _a.getTag;
/** Sets the target tag where we write the css on style updates */

/** Checks if the style tag needs updating and if so queues up the change */
var styleUpdated = function () {
    if (freeStyle.changeId === lastFreeStyleChangeId
        && !pendingRawChange)
        return;
    lastFreeStyleChangeId = freeStyle.changeId;
    pendingRawChange = false;
    afterAllSync(forceRenderStyles);
};
var pendingRawChange = false;
var raw = '';
/**
 * Insert `raw` CSS as a string. This is useful for e.g.
 * - third party CSS that you are customizing with template strings
 * - generating raw CSS in JavaScript
 * - reset libraries like normalize.css that you can use without loaders
 */

/**
 * Renders styles to the singleton tag imediately
 * NOTE: You should only call it on initial render to prevent any non CSS flash.
 * After that it is kept sync using `requestAnimationFrame` and we haven't noticed any bad flashes.
 **/
function forceRenderStyles() {
    getTag().textContent = getCss();
}
/**
 * Helps with testing. Reinitializes FreeStyle + raw
 */

/**
 * Allows use to use the stylesheet in a node.js environment
 */
var getCss = function () { return raw ? raw + freeStyle.getStyles() : freeStyle.getStyles(); };
/**
 * Takes CSSProperties and return a generated className you can use on your component
 */
function style() {
    var objects = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        objects[_i] = arguments[_i];
    }
    var _a = ensureStringObj(extend.apply(void 0, objects)), result = _a.result, debugName = _a.debugName;
    var className = debugName ? freeStyle.registerStyle(result, debugName) : freeStyle.registerStyle(result);
    styleUpdated();
    return className;
}

/**
 * Takes CSSProperties and registers it to a global selector (body, html, etc.)
 */

/**
 * Takes Keyframes and returns a generated animation name
 */

/**
 * Helper for you to create a CSSFunction
 * Assumption is that most css function fall into this pattern:
 * `function-name(param [, param])`
 */

/**
 * Merges various styles into a single style object.
 * Note: if two objects have the same property the last one wins
 */
function extend() {
    var objects = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        objects[_i] = arguments[_i];
    }
    /** The final result we will return */
    var result = {};
    for (var _a = 0, objects_1 = objects; _a < objects_1.length; _a++) {
        var object = objects_1[_a];
        for (var key in object) {
            /** Falsy values except a explicit 0 is ignored */
            var val = object[key];
            if (!val && val !== 0) {
                continue;
            }
            /** if nested media or pseudo selector */
            if (key === '$nest' && val) {
                result[key] = result['$nest'] ? extend(result['$nest'], val) : val;
            }
            else if ((key.indexOf('&') !== -1 || key.indexOf('@media') === 0)) {
                result[key] = result[key] ? extend(result[key], val) : val;
            }
            else {
                result[key] = val;
            }
        }
    }
    return result;
}
/**
 * Utility to join classes conditionally
 */

/**
 * Helps customize styles with media queries
 */

var test = style({
    myAwesomeType: 'awesomeValue',
});

export { test };
