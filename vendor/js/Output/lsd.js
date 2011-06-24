/*
---

name: Core

description: The heart of MooTools.

license: MIT-style license.

copyright: Copyright (c) 2006-2010 [Valerio Proietti](http://mad4milk.net/).

authors: The MooTools production team (http://mootools.net/developers/)

inspiration:
  - Class implementation inspired by [Base.js](http://dean.edwards.name/weblog/2006/03/base/) Copyright (c) 2006 Dean Edwards, [GNU Lesser General Public License](http://opensource.org/licenses/lgpl-license.php)
  - Some functionality inspired by [Prototype.js](http://prototypejs.org) Copyright (c) 2005-2007 Sam Stephenson, [MIT License](http://opensource.org/licenses/mit-license.php)

provides: [Core, MooTools, Type, typeOf, instanceOf]

...
*/

(function(){

this.MooTools = {
	version: '1.3dev',
	build: '%build%'
};

// typeOf, instanceOf

var typeOf = this.typeOf = function(item){
	if (item == null) return 'null';
	if (item.$family) return item.$family();
	
	if (item.nodeName){
		if (item.nodeType == 1) return 'element';
		if (item.nodeType == 3) return (/\S/).test(item.nodeValue) ? 'textnode' : 'whitespace';
	} else if (typeof item.length == 'number'){
		if (item.callee) return 'arguments';
		if ('item' in item) return 'collection';
	}

	return typeof item;
};

var instanceOf = this.instanceOf = function(item, object){
	if (item == null) return false;
	var constructor = item.$constructor || item.constructor;
	while (constructor){
		if (constructor === object) return true;
		constructor = constructor.parent;
	}
	return item instanceof object;
};

// Function overloading

var Function = this.Function;

var enumerables = true;
for (var i in {toString: 1}) enumerables = null;
if (enumerables) enumerables = ['hasOwnProperty', 'valueOf', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'constructor'];

Function.prototype.overloadSetter = function(usePlural){
	var self = this;
	return function(a, b){
		if (a == null) return this;
		if (usePlural || typeof a != 'string'){
			for (var k in a) self.call(this, k, a[k]);
			if (enumerables) for (var i = enumerables.length; i--;){
				k = enumerables[i];
				if (a.hasOwnProperty(k)) self.call(this, k, a[k]);
			}
		} else {
			self.call(this, a, b);
		}
		return this;
	};
};

Function.prototype.overloadGetter = function(usePlural){
	var self = this;
	return function(a){
		var args, result;
		if (usePlural || typeof a != 'string') args = a;
		else if (arguments.length > 1) args = arguments;
		if (args){
			result = {};
			for (var i = 0; i < args.length; i++) result[args[i]] = self.call(this, args[i]);
		} else {
			result = self.call(this, a);
		}
		return result;
	};
};

Function.prototype.extend = function(key, value){
	this[key] = value;
}.overloadSetter();

Function.prototype.implement = function(key, value){
	this.prototype[key] = value;
}.overloadSetter();

// From

var slice = Array.prototype.slice;

Function.from = function(item){
	return (typeOf(item) == 'function') ? item : function(){
		return item;
	};
};

Array.from = function(item){
	if (item == null) return [];
	return (Type.isEnumerable(item) && typeof item != 'string') ? (typeOf(item) == 'array') ? item : slice.call(item) : [item];
};

Number.from = function(item){
	var number = parseFloat(item);
	return isFinite(number) ? number : null;
};

String.from = function(item){
	return item + '';
};

// hide, protect

Function.implement({
	
	hide: function(){
		this.$hidden = true;
		return this;
	},

	protect: function(){
		this.$protected = true;
		return this;
	}
	
});

// Type

var Type = this.Type = function(name, object){
	if (name){
		var lower = name.toLowerCase();
		var typeCheck = function(item){
			return (typeOf(item) == lower);
		};
		
		Type['is' + name] = typeCheck;
		if (object != null){
			object.prototype.$family = (function(){
				return lower;
			}).hide();
			//<1.2compat>
			object.type = typeCheck;
			//</1.2compat>
		}
	}

	if (object == null) return null;
	
	object.extend(this);
	object.$constructor = Type;
	object.prototype.$constructor = object;
	
	return object;
};

var toString = Object.prototype.toString;

Type.isEnumerable = function(item){
	return (item != null && typeof item.length == 'number' && toString.call(item) != '[object Function]' );
};

var hooks = {};

var hooksOf = function(object){
	var type = typeOf(object.prototype);
	return hooks[type] || (hooks[type] = []);
};

var implement = function(name, method){
	if (method && method.$hidden) return this;
	
	var hooks = hooksOf(this);
	
	for (var i = 0; i < hooks.length; i++){
		var hook = hooks[i];
		if (typeOf(hook) == 'type') implement.call(hook, name, method);
		else hook.call(this, name, method);
	}

	var previous = this.prototype[name];
	if (previous == null || !previous.$protected) this.prototype[name] = method;
	
	if (this[name] == null && typeOf(method) == 'function') extend.call(this, name, function(item){
		return method.apply(item, slice.call(arguments, 1));
	});
	
	return this;
};

var extend = function(name, method){
	if (method && method.$hidden) return this;
	var previous = this[name];
	if (previous == null || !previous.$protected) this[name] = method;
	return this;
};

Type.implement({
	
	implement: implement.overloadSetter(),
	
	extend: extend.overloadSetter(),

	alias: function(name, existing){
		implement.call(this, name, this.prototype[existing]);
	}.overloadSetter(),

	mirror: function(hook){
		hooksOf(this).push(hook);
		return this;
	}
	
});

new Type('Type', Type);

// Default Types

var force = function(name, object, methods){
	var isType = (object != Object),
		prototype = object.prototype;

	if (isType) object = new Type(name, object);

	for (var i = 0, l = methods.length; i < l; i++){
		var key = methods[i],
			generic = object[key],
			proto = prototype[key];

		if (generic) generic.protect();

		if (isType && proto){
			delete prototype[key];
			prototype[key] = proto.protect();
		}
	}
	
	if (isType) object.implement(prototype);
	
	return force;
};

force('String', String, [
	'charAt', 'charCodeAt', 'concat', 'indexOf', 'lastIndexOf', 'match', 'quote', 'replace', 'search',
	'slice', 'split', 'substr', 'substring', 'toLowerCase', 'toUpperCase'
])('Array', Array, [
	'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift', 'concat', 'join', 'slice',
	'indexOf', 'lastIndexOf', 'filter', 'forEach', 'every', 'map', 'some', 'reduce', 'reduceRight'
])('Number', Number, [
	'toExponential', 'toFixed', 'toLocaleString', 'toPrecision'
])('Function', Function, [
	'apply', 'call'
])('RegExp', RegExp, [
	'exec', 'test'
])('Object', Object, [
	'create', 'defineProperty', 'defineProperties', 'keys',
	'getPrototypeOf', 'getOwnPropertyDescriptor', 'getOwnPropertyNames',
	'preventExtensions', 'isExtensible', 'seal', 'isSealed', 'freeze', 'isFrozen'
])('Date', Date, ['now']);

Object.extend = extend.overloadSetter();

Date.extend('now', function(){
	return +(new Date);
});

new Type('Boolean', Boolean);

// fixes NaN returning as Number

Number.prototype.$family = function(){
	return isFinite(this) ? 'number' : 'null';
}.hide();

// Number.random

Number.extend('random', function(min, max){
	return Math.floor(Math.random() * (max - min + 1) + min);
});

// forEach, each

Object.extend('forEach', function(object, fn, bind){
	for (var key in object){
		if (object.hasOwnProperty(key)) fn.call(bind, object[key], key, object);
	}
});

Object.each = Object.forEach;

Array.implement({
	
	forEach: function(fn, bind){
		for (var i = 0, l = this.length; i < l; i++){
			if (i in this) fn.call(bind, this[i], i, this);
		}
	},
	
	each: function(fn, bind){
		Array.forEach(this, fn, bind);
		return this;
	}
	
});

// Array & Object cloning, Object merging and appending

var cloneOf = function(item){
	switch (typeOf(item)){
		case 'array': return item.clone();
		case 'object': return Object.clone(item);
		default: return item;
	}
};

Array.implement('clone', function(){
	var i = this.length, clone = new Array(i);
	while (i--) clone[i] = cloneOf(this[i]);
	return clone;
});

var mergeOne = function(source, key, current){
	switch (typeOf(current)){
		case 'object':
			if (typeOf(source[key]) == 'object') Object.merge(source[key], current);
			else source[key] = Object.clone(current);
		break;
		case 'array': source[key] = current.clone(); break;
		default: source[key] = current;
	}
	return source;
};

Object.extend({
	
	merge: function(source, k, v){
		if (typeOf(k) == 'string') return mergeOne(source, k, v);
		for (var i = 1, l = arguments.length; i < l; i++){
			var object = arguments[i];
			for (var key in object) mergeOne(source, key, object[key]);
		}
		return source;
	},
	
	clone: function(object){
		var clone = {};
		for (var key in object) clone[key] = cloneOf(object[key]);
		return clone;
	},
	
	append: function(original){
		for (var i = 1, l = arguments.length; i < l; i++){
			var extended = arguments[i] || {};
			for (var key in extended) original[key] = extended[key];
		}
		return original;
	}
	
});

// Object-less types

['Object', 'WhiteSpace', 'TextNode', 'Collection', 'Arguments'].each(function(name){
	new Type(name);
});

//<1.2compat>

var Hash = this.Hash = new Type('Hash', function(object){
	if (typeOf(object) == 'hash') object = Object.clone(object.getClean());
	for (var key in object) this[key] = object[key];
	return this;
});

Hash.implement({

	forEach: function(fn, bind){
		Object.forEach(this, fn, bind);
	},

	getClean: function(){
		var clean = {};
		for (var key in this){
			if (this.hasOwnProperty(key)) clean[key] = this[key];
		}
		return clean;
	},

	getLength: function(){
		var length = 0;
		for (var key in this){
			if (this.hasOwnProperty(key)) length++;
		}
		return length;
	}

});

Hash.alias('each', 'forEach');

Object.type = Type.isObject;

var Native = this.Native = function(properties){
	return new Type(properties.name, properties.initialize);
};

Native.type = Type.type;

Native.implement = function(objects, methods){
	for (var i = 0; i < objects.length; i++) objects[i].implement(methods);
	return Native;
};

var arrayType = Array.type;
Array.type = function(item){
	return instanceOf(item, Array) || arrayType(item);
};

this.$A = function(item){
	return Array.from(item).slice();
};

this.$arguments = function(i){
	return function(){
		return arguments[i];
	};
};

this.$chk = function(obj){
	return !!(obj || obj === 0);
};

this.$clear = function(timer){
	clearTimeout(timer);
	clearInterval(timer);
	return null;
};

this.$defined = function(obj){
	return (obj != null);
};

this.$each = function(iterable, fn, bind){
	var type = typeOf(iterable);
	((type == 'arguments' || type == 'collection' || type == 'array' || type == 'elements') ? Array : Object).each(iterable, fn, bind);
};

this.$empty = function(){};

this.$extend = function(original, extended){
	return Object.append(original, extended);
};

this.$H = function(object){
	return new Hash(object);
};

this.$merge = function(){
	var args = Array.slice(arguments);
	args.unshift({});
	return Object.merge.apply(null, args);
};

this.$lambda = Function.from;
this.$mixin = Object.merge;
this.$random = Number.random;
this.$splat = Array.from;
this.$time = Date.now;

this.$type = function(object){
	var type = typeOf(object);
	if (type == 'elements') return 'array';
	return (type == 'null') ? false : type;
};

this.$unlink = function(object){
	switch (typeOf(object)){
		case 'object': return Object.clone(object);
		case 'array': return Array.clone(object);
		case 'hash': return new Hash(object);
		default: return object;
	}
};

//</1.2compat>

})();

/*
---

name: Core

description: The heart of MooTools.

license: MIT-style license.

copyright: Copyright (c) 2006-2010 [Valerio Proietti](http://mad4milk.net/).

authors: The MooTools production team (http://mootools.net/developers/)

inspiration:
  - Class implementation inspired by [Base.js](http://dean.edwards.name/weblog/2006/03/base/) Copyright (c) 2006 Dean Edwards, [GNU Lesser General Public License](http://opensource.org/licenses/lgpl-license.php)
  - Some functionality inspired by [Prototype.js](http://prototypejs.org) Copyright (c) 2005-2007 Sam Stephenson, [MIT License](http://opensource.org/licenses/mit-license.php)

extends: Core/Core

...
*/

(function(){

var arrayish = Array.prototype.indexOf;
var stringish = String.prototype.indexOf
//Speedup 1: Avoid typeOf
var cloneOf = function(item){
  if (item && typeof(item) == 'object' && item.indexOf != stringish && !(item.nodeName && item.nodeType)) {
    if (item.indexOf == arrayish) return item.clone();
    else return Object.clone(item);
  }
  return item;
};
Array.implement('clone', function(){
	var i = this.length, clone = new Array(i);
	while (i--) clone[i] = cloneOf(this[i]);
	return clone;
});

//Speedup 2: Avoid typeOf
var mergeOne = function(source, key, current){
  if (current && typeof(current) == 'object' && current.indexOf != stringish && !(current.nodeName && current.nodeType)) {
    if (current.indexOf != arrayish) {
      var target = source[key];
			if (target && typeof(target) == 'object' && current.indexOf != stringish && target.indexOf != arrayish) Object.merge(source[key], current);
			else source[key] = Object.clone(current);
    } else source[key] = current.clone();
  } else source[key] = current;
	return source;
};


Object.extend({

  //Speedup 3: Avoid typeOf
	merge: function(source, k, v){
		if (typeof(k) == 'string' || (k && k.indexOf == stringish)) return mergeOne(source, k, v);
		for (var i = 1, l = arguments.length; i < l; i++){
			var object = arguments[i];
			for (var key in object) mergeOne(source, key, object[key]);
		}
		return source;
	},

	clone: function(object){
		var clone = {};
		for (var key in object) clone[key] = cloneOf(object[key]);
		return clone;
	}
});

})();

/*
---

name: Number

description: Contains Number Prototypes like limit, round, times, and ceil.

license: MIT-style license.

requires: Type

provides: Number

...
*/

Number.implement({

	limit: function(min, max){
		return Math.min(max, Math.max(min, this));
	},

	round: function(precision){
		precision = Math.pow(10, precision || 0).toFixed(precision < 0 ? -precision : 0);
		return Math.round(this * precision) / precision;
	},

	times: function(fn, bind){
		for (var i = 0; i < this; i++) fn.call(bind, i, this);
	},

	toFloat: function(){
		return parseFloat(this);
	},

	toInt: function(base){
		return parseInt(this, base || 10);
	}

});

Number.alias('each', 'times');

(function(math){
	var methods = {};
	math.each(function(name){
		if (!Number[name]) methods[name] = function(){
			return Math[name].apply(null, [this].concat(Array.from(arguments)));
		};
	});
	Number.implement(methods);
})(['abs', 'acos', 'asin', 'atan', 'atan2', 'ceil', 'cos', 'exp', 'floor', 'log', 'max', 'min', 'pow', 'sin', 'sqrt', 'tan']);

/*
---

name: Function

description: Contains Function Prototypes like create, bind, pass, and delay.

license: MIT-style license.

requires: Type

provides: Function

...
*/

Function.extend({

	attempt: function(){
		for (var i = 0, l = arguments.length; i < l; i++){
			try {
				return arguments[i]();
			} catch (e){}
		}
		return null;
	}

});

Function.implement({

	attempt: function(args, bind){
		try {
			return this.apply(bind, Array.from(args));
		} catch (e){
			return null;
		}
	},

	bind: function(bind, args){
		var self = this;
		if (args != null) args = Array.from(args);
		return function(){
			return self.apply(bind, args || arguments);
		};
	},

	delay: function(delay, bind, args){
		return setTimeout(this.bind(bind, args || []), delay);
	},

	pass: function(args, bind){
		return this.bind(bind, args);
	},

	periodical: function(periodical, bind, args){
		return setInterval(this.bind(bind, args || []), periodical);
	},

	run: function(args, bind){
		return this.apply(bind, Array.from(args));
	}

});

//<1.2compat>

Function.implement({

	create: function(options){
		var self = this;
		options = options || {};
		return function(event){
			var args = options.arguments;
			args = (args != undefined) ? Array.from(args) : Array.slice(arguments, (options.event) ? 1 : 0);
			if (options.event) args = [event || window.event].extend(args);
			var returns = function(){
				return self.apply(options.bind || null, args);
			};
			if (options.delay) return setTimeout(returns, options.delay);
			if (options.periodical) return setInterval(returns, options.periodical);
			if (options.attempt) return Function.attempt(returns);
			return returns();
		};
	},

	bindWithEvent: function(bind, args){
		var self = this;
		if (args != null) args = Array.from(args);
		return function(event){
			return self.apply(bind, (args == null) ? arguments : [event].concat(args));
		};
	}

});

var $try = Function.attempt;

//</1.2compat>

/*
---

name: String

description: Contains String Prototypes like camelCase, capitalize, test, and toInt.

license: MIT-style license.

requires: Type

provides: String

...
*/

String.implement({

	test: function(regex, params){
		return ((typeOf(regex) == 'regexp') ? regex : new RegExp('' + regex, params)).test(this);
	},

	contains: function(string, separator){
		return (separator) ? (separator + this + separator).indexOf(separator + string + separator) > -1 : this.indexOf(string) > -1;
	},

	trim: function(){
		return this.replace(/^\s+|\s+$/g, '');
	},

	clean: function(){
		return this.replace(/\s+/g, ' ').trim();
	},

	camelCase: function(){
		return this.replace(/-\D/g, function(match){
			return match.charAt(1).toUpperCase();
		});
	},

	hyphenate: function(){
		return this.replace(/[A-Z]/g, function(match){
			return ('-' + match.charAt(0).toLowerCase());
		});
	},

	capitalize: function(){
		return this.replace(/\b[a-z]/g, function(match){
			return match.toUpperCase();
		});
	},

	escapeRegExp: function(){
		return this.replace(/([-.*+?^${}()|[\]\/\\])/g, '\\$1');
	},

	toInt: function(base){
		return parseInt(this, base || 10);
	},

	toFloat: function(){
		return parseFloat(this);
	},

	hexToRgb: function(array){
		var hex = this.match(/^#?(\w{1,2})(\w{1,2})(\w{1,2})$/);
		return (hex) ? hex.slice(1).hexToRgb(array) : null;
	},

	rgbToHex: function(array){
		var rgb = this.match(/\d{1,3}/g);
		return (rgb) ? rgb.rgbToHex(array) : null;
	},

	substitute: function(object, regexp){
		return this.replace(regexp || (/\\?\{([^{}]+)\}/g), function(match, name){
			if (match.charAt(0) == '\\') return match.slice(1);
			return (object[name] != undefined) ? object[name] : '';
		});
	}

});

/*
---

name: Array

description: Contains Array Prototypes like each, contains, and erase.

license: MIT-style license.

requires: Type

provides: Array

...
*/

Array.implement({
	
	invoke: function(methodName){
		var args = Array.slice(arguments, 1);
		return this.map(function(item){
			return item[methodName].apply(item, args);
		});
	},

	every: function(fn, bind){
		for (var i = 0, l = this.length; i < l; i++){
			if ((i in this) && !fn.call(bind, this[i], i, this)) return false;
		}
		return true;
	},

	filter: function(fn, bind){
		var results = [];
		for (var i = 0, l = this.length; i < l; i++){
			if ((i in this) && fn.call(bind, this[i], i, this)) results.push(this[i]);
		}
		return results;
	},

	clean: function(){
		return this.filter(function(item){
			return item != null;
		});
	},

	indexOf: function(item, from){
		var len = this.length;
		for (var i = (from < 0) ? Math.max(0, len + from) : from || 0; i < len; i++){
			if (this[i] === item) return i;
		}
		return -1;
	},

	map: function(fn, bind){
		var results = [];
		for (var i = 0, l = this.length; i < l; i++){
			if (i in this) results[i] = fn.call(bind, this[i], i, this);
		}
		return results;
	},

	some: function(fn, bind){
		for (var i = 0, l = this.length; i < l; i++){
			if ((i in this) && fn.call(bind, this[i], i, this)) return true;
		}
		return false;
	},

	associate: function(keys){
		var obj = {}, length = Math.min(this.length, keys.length);
		for (var i = 0; i < length; i++) obj[keys[i]] = this[i];
		return obj;
	},

	link: function(object){
		var result = {};
		for (var i = 0, l = this.length; i < l; i++){
			for (var key in object){
				if (object[key](this[i])){
					result[key] = this[i];
					delete object[key];
					break;
				}
			}
		}
		return result;
	},

	contains: function(item, from){
		return this.indexOf(item, from) != -1;
	},

	append: function(array){
		this.push.apply(this, array);
		return this;
	},
	
	getLast: function(){
		return (this.length) ? this[this.length - 1] : null;
	},

	getRandom: function(){
		return (this.length) ? this[Number.random(0, this.length - 1)] : null;
	},

	include: function(item){
		if (!this.contains(item)) this.push(item);
		return this;
	},

	combine: function(array){
		for (var i = 0, l = array.length; i < l; i++) this.include(array[i]);
		return this;
	},

	erase: function(item){
		for (var i = this.length; i--;){
			if (this[i] === item) this.splice(i, 1);
		}
		return this;
	},

	empty: function(){
		this.length = 0;
		return this;
	},

	flatten: function(){
		var array = [];
		for (var i = 0, l = this.length; i < l; i++){
			var type = typeOf(this[i]);
			if (type == 'null') continue;
			array = array.concat((type == 'array' || type == 'collection' || type == 'arguments' || instanceOf(this[i], Array)) ? Array.flatten(this[i]) : this[i]);
		}
		return array;
	},
	
	pick: function(){
		for (var i = 0, l = this.length; i < l; i++){
			if (this[i] != null) return this[i];
		}
		return null;
	},

	hexToRgb: function(array){
		if (this.length != 3) return null;
		var rgb = this.map(function(value){
			if (value.length == 1) value += value;
			return value.toInt(16);
		});
		return (array) ? rgb : 'rgb(' + rgb + ')';
	},

	rgbToHex: function(array){
		if (this.length < 3) return null;
		if (this.length == 4 && this[3] == 0 && !array) return 'transparent';
		var hex = [];
		for (var i = 0; i < 3; i++){
			var bit = (this[i] - 0).toString(16);
			hex.push((bit.length == 1) ? '0' + bit : bit);
		}
		return (array) ? hex : '#' + hex.join('');
	}

});

//<1.2compat>

Array.alias('extend', 'append');

var $pick = function(){
	return Array.from(arguments).pick();
};

//</1.2compat>

/*
---

name: Browser

description: The Browser Object. Contains Browser initialization, Window and Document, and the Browser Hash.

license: MIT-style license.

requires: [Array, Function, Number, String]

provides: [Browser, Window, Document]

...
*/

(function(){

var document = this.document;
var window = document.window = this;

var UID = 1;

this.$uid = (window.ActiveXObject) ? function(item){
	return (item.uid || (item.uid = [UID++]))[0];
} : function(item){
	return item.uid || (item.uid = UID++);
};

$uid(window);
$uid(document);

var ua = navigator.userAgent.toLowerCase(),
	platform = navigator.platform.toLowerCase(),
	UA = ua.match(/(opera|ie|firefox|chrome|version)[\s\/:]([\w\d\.]+)?.*?(safari|version[\s\/:]([\w\d\.]+)|$)/) || [null, 'unknown', 0];

var Browser = this.Browser = {
	
	extend: Function.prototype.extend,
	
	name: (UA[1] == 'version') ? UA[3] : UA[1],

	version: parseFloat((UA[1] == 'opera' && UA[4]) ? UA[4] : UA[2]),

	Platform: {
		name: ua.match(/ip(?:ad|od|hone)/) ? 'ios' : (ua.match(/(?:webos|android)/) || platform.match(/mac|win|linux/) || ['other'])[0]
	},

	Features: {
		xpath: !!(document.evaluate),
		air: !!(window.runtime),
		query: !!(document.querySelector),
		json: !!(window.JSON)
	},

	Plugins: {}

};

Browser[Browser.name] = true;
Browser[Browser.name + parseInt(Browser.version, 10)] = true;
Browser.Platform[Browser.Platform.name] = true;

// Request

Browser.Request = (function(){

	var XMLHTTP = function(){
		return new XMLHttpRequest();
	};
 
	var MSXML2 = function(){
		return new ActiveXObject('MSXML2.XMLHTTP');
	};
 
	var MSXML = function(){
		return new ActiveXObject('Microsoft.XMLHTTP');
	};
 
	return Function.attempt(function(){
		XMLHTTP();
		return XMLHTTP;
	}, function(){
		MSXML2();
		return MSXML2;
	}, function(){
		MSXML();
		return MSXML;
	});
 
})();

Browser.Features.xhr = !!(Browser.Request);

// Flash detection

var version = (Function.attempt(function(){
	return navigator.plugins['Shockwave Flash'].description;
}, function(){
	return new ActiveXObject('ShockwaveFlash.ShockwaveFlash').GetVariable('$version');
}) || '0 r0').match(/\d+/g);

Browser.Plugins.Flash = {
	version: Number(version[0] || '0.' + version[1]) || 0,
	build: Number(version[2]) || 0
};

// String scripts

Browser.exec = function(text){
	if (!text) return text;
	if (window.execScript){
		window.execScript(text);
	} else {
		var script = document.createElement('script');
		script.setAttribute('type', 'text/javascript');
		script.text = text;
		document.head.appendChild(script);
		document.head.removeChild(script);
	}
	return text;
};

String.implement('stripScripts', function(exec){
	var scripts = '';
	var text = this.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, function(all, code){
		scripts += code + '\n';
		return '';
	});
	if (exec === true) Browser.exec(scripts);
	else if (typeOf(exec) == 'function') exec(scripts, text);
	return text;
});

// Window, Document
	
Browser.extend({
	Document: this.Document,
	Window: this.Window,
	Element: this.Element,
	Event: this.Event
});

this.Window = this.$constructor = new Type('Window', function(){});

this.$family = Function.from('window').hide();

Window.mirror(function(name, method){
	window[name] = method;
});

this.Document = document.$constructor = new Type('Document', function(){});

document.$family = Function.from('document').hide();

Document.mirror(function(name, method){
	document[name] = method;
});

document.html = document.documentElement;
document.head = document.getElementsByTagName('head')[0];

if (document.execCommand) try {
	document.execCommand("BackgroundImageCache", false, true);
} catch (e){}

if (this.attachEvent && !this.addEventListener){
	var unloadEvent = function(){
		this.detachEvent('onunload', unloadEvent);
		document.head = document.html = document.window = null;
	};
	this.attachEvent('onunload', unloadEvent);
}

// IE fails on collections and <select>.options (refers to <select>)
var arrayFrom = Array.from;
try {
	arrayFrom(document.html.childNodes);
} catch(e){
	Array.from = function(item){
		if (typeof item != 'string' && Type.isEnumerable(item) && typeOf(item) != 'array'){
			var i = item.length, array = new Array(i);
			while (i--) array[i] = item[i];
			return array;
		}
		return arrayFrom(item);
	};

	var prototype = Array.prototype,
		slice = prototype.slice;
	['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift', 'concat', 'join', 'slice'].each(function(name){
		var method = prototype[name];
		Array[name] = function(item){
			return method.apply(Array.from(item), slice.call(arguments, 1));
		};
	});
}

//<1.2compat>

if (Browser.Platform.ios) Browser.Platform.ipod = true;

Browser.Engine = {};

var setEngine = function(name, version){
	Browser.Engine.name = name;
	Browser.Engine[name + version] = true;
	Browser.Engine.version = version;
};

if (Browser.ie){
	Browser.Engine.trident = true;
	
	switch (Browser.version){
		case 6: setEngine('trident', 4); break;
		case 7: setEngine('trident', 5); break;
		case 8: setEngine('trident', 6);
	}
}

if (Browser.firefox){
	Browser.Engine.gecko = true;
	
	if (Browser.version >= 3) setEngine('gecko', 19);
	else setEngine('gecko', 18);
}

if (Browser.safari || Browser.chrome){
	Browser.Engine.webkit = true;
	
	switch (Browser.version){
		case 2: setEngine('webkit', 419); break;
		case 3: setEngine('webkit', 420); break;
		case 4: setEngine('webkit', 525);
	}
}

if (Browser.opera){
	Browser.Engine.presto = true;
	
	if (Browser.version >= 9.6) setEngine('presto', 960);
	else if (Browser.version >= 9.5) setEngine('presto', 950);
	else setEngine('presto', 925);
}

if (Browser.name == 'unknown'){
	switch ((ua.match(/(?:webkit|khtml|gecko)/) || [])[0]){
		case 'webkit':
		case 'khtml':
			Browser.Engine.webkit = true;
		break;
		case 'gecko':
			Browser.Engine.gecko = true;
	}
}

this.$exec = Browser.exec;

//</1.2compat>

})();

/*
---

name: Browser.Features.Touch

description: Checks whether the used Browser has touch events

authors: Christoph Pojer (@cpojer)

license: MIT-style license.

requires: [Core/Browser]

provides: Browser.Features.Touch

...
*/

Browser.Features.Touch = (function(){
	try {
		document.createEvent('TouchEvent').initTouchEvent('touchstart');
		return true;
	} catch (exception){}
	
	return false;
})();

// Chrome 5 thinks it is touchy!
// Android doesn't have a touch delay and dispatchEvent does not fire the handler
Browser.Features.iOSTouch = (function(){
	var name = 'cantouch', // Name does not matter
		html = document.html,
		hasTouch = false;

	var handler = function(){
		html.removeEventListener(name, handler, true);
		hasTouch = true;
	};

	try {
		html.addEventListener(name, handler, true);
		var event = document.createEvent('TouchEvent');
		event.initTouchEvent(name);
		html.dispatchEvent(event);
		return hasTouch;
	} catch (exception){}

	handler(); // Remove listener
	return false;
})();

/*
---

name: Class

description: Contains the Class Function for easily creating, extending, and implementing reusable Classes.

license: MIT-style license.

requires: [Array, String, Function, Number]

provides: Class

...
*/

(function(){

var Class = this.Class = new Type('Class', function(params){
	
	if (instanceOf(params, Function)) params = {'initialize': params};
	
	var newClass = function(){
		reset(this);
		if (newClass.$prototyping) return this;
		this.$caller = null;
		var value = (this.initialize) ? this.initialize.apply(this, arguments) : this;
		this.$caller = this.caller = null;
		return value;
	}.extend(this);

	newClass.implement(params);
	
	newClass.$constructor = Class;
	newClass.prototype.$constructor = newClass;
	newClass.prototype.parent = parent;

	return newClass;

});

var parent = function(){
	if (!this.$caller) throw new Error('The method "parent" cannot be called.');
	var name = this.$caller.$name, parent = this.$caller.$owner.parent;
	var previous = (parent) ? parent.prototype[name] : null;
	if (!previous) throw new Error('The method "' + name + '" has no parent.');
	return previous.apply(this, arguments);
};

var reset = function(object){
	for (var key in object){
		var value = object[key];
		switch (typeOf(value)){
			case 'object':
				var F = function(){};
				F.prototype = value;
				var instance = new F;
				object[key] = reset(instance);
			break;
			case 'array': object[key] = value.clone(); break;
		}
	}
	return object;
};

var wrap = function(self, key, method){
	if (method.$origin) method = method.$origin;
	var wrapper = function(){
		if (method.$protected && this.$caller == null) throw new Error('The method "' + key + '" cannot be called.');
		var caller = this.caller, current = this.$caller;
		this.caller = current; this.$caller = wrapper;
		var result = method.apply(this, arguments);
		this.$caller = current; this.caller = caller;
		return result;
	}.extend({$owner: self, $origin: method, $name: key});
	return wrapper;
};

var implement = function(key, value, retain){
	
	if (Class.Mutators.hasOwnProperty(key)){
		value = Class.Mutators[key].call(this, value);
		if (value == null) return this;
	}
	
	if (typeOf(value) == 'function'){
		if (value.$hidden) return this;
		this.prototype[key] = (retain) ? value : wrap(this, key, value);
	} else {
		Object.merge(this.prototype, key, value);
	}
	
	return this;
	
};

var getInstance = function(klass){
	klass.$prototyping = true;
	var proto = new klass;
	delete klass.$prototyping;
	return proto;
};

Class.implement('implement', implement.overloadSetter());

Class.Mutators = {
	
	Extends: function(parent){
		this.parent = parent;
		this.prototype = getInstance(parent);
	},
	
	Implements: function(items){
		Array.from(items).each(function(item){
			var instance = new item;
			for (var key in instance) implement.call(this, key, instance[key], true);
		}, this);
	}
};

})();

/*
---

name: Class

description: Contains the Class Function for easily creating, extending, and implementing reusable Classes.

license: MIT-style license.

extends: Core/Class


...
*/

(function(){

var Class = this.Class = new Type('Class', function(params){
	if (instanceOf(params, Function)) params = {initialize: params};

	var newClass = function(){
		reset(this);
		if (newClass.$prototyping) return this;
		this.$caller = null;
		var value = (this.initialize) ? this.initialize.apply(this, arguments) : this;
		this.$caller = this.caller = null;
		return value;
	}.extend(this).implement(params);

	newClass.$constructor = Class;
	newClass.prototype.$constructor = newClass;
	newClass.prototype.parent = parent;

	return newClass;
});

var parent = function(){
	if (!this.$caller) throw new Error('The method "parent" cannot be called.');
	var name = this.$caller.$name,
		parent = this.$caller.$owner.parent,
		previous = (parent) ? parent.prototype[name] : null;
		if (!previous) console.dir(this.$caller)
	if (!previous) throw new Error('The method "' + name + '" has no parent.');
	return previous.apply(this, arguments);
};


var indexOf = Array.prototype.indexOf;
//Speedup1: Avoid typeOf in reset

// before: 
// switch (typeOf(value)){
//	case 'object':
//	case 'array':

// after:
var reset = function(object){
	for (var key in object){
		var value = object[key];
    if (value && typeof(value) == 'object') {
      if (value.indexOf != indexOf) {
				var F = function(){};
				F.prototype = value;
				object[key] = reset(new F);
      } else object[key] = value.clone();
    }
	}
	return object;
};

var wrap = function(self, key, method){
	if (method.$origin) method = method.$origin;
	var wrapper = function(){
		if (method.$protected && this.$caller == null) throw new Error('The method "' + key + '" cannot be called.');
		var caller = this.caller, current = this.$caller;
		this.caller = current; this.$caller = wrapper;
		var result = method.apply(this, arguments);
		this.$caller = current; this.caller = caller;
		return result;
	}.extend({$owner: self, $origin: method, $name: key});
	return wrapper;
};

//Speedup 2: Avoid typeOf in implement
var apply = Function.prototype.apply
var implement = function(key, value, retain){
	if (Class.Mutators.hasOwnProperty(key)){
		value = Class.Mutators[key].call(this, value);
		if (value == null) return this;
	}

	if (value && value.call && (value.apply == apply)){
		if (value.$hidden) return this;
		this.prototype[key] = (retain) ? value : wrap(this, key, value);
	} else {
		Object.merge(this.prototype, key, value);
	}

	return this;
};

var getInstance = function(klass){
if (!klass) debugger
	klass.$prototyping = true;
	var proto = new klass;
	delete klass.$prototyping;
	return proto;
};

Class.implement('implement', implement.overloadSetter());

Class.Mutators = {

	Extends: function(parent){
		this.parent = parent;
		this.prototype = getInstance(parent);
	},

	Implements: function(items){
		Array.from(items).each(function(item){
			var instance = new item;
			for (var key in instance) implement.call(this, key, instance[key], true);
		}, this);
	}
};

})();

/*
---
 
script: FastArray.js
 
description: Array with fast lookup (based on object)
 
license: MIT-style license.
 
requires:
- Core/Class
 
provides: [FastArray]
 
...
*/

FastArray = function() {
  this.push.apply(this, arguments);
}

FastArray.from = function(ary) {
  var array = new FastArray;
  FastArray.prototype.push.apply(array, ary)
  return array;
}
FastArray.prototype = {
  push: function() {
    Array.each(arguments, function(argument) {
      this[argument] = true;
    }, this);
  },

  contains: function(argument) {
    return this[argument];
  },
  
  concat: function(array) {
    this.push.apply(this, array);
    return this;
  },
  
  each: function(callback, bound) {
    for (var key in this) {
      if (this.hasOwnProperty(key)) callback.call(bound || this, key, this[key]);
    }
  },

  include: function(value) {
    this[value] = true;
  },

  erase: function(value) {
    delete this[value];
  },
  
  join: function(delimeter) {
    var bits = [];
    for (var key in this) if (this.hasOwnProperty(key)) bits.push(key);
    return bits.join(delimeter)
  }
};
/*
---
 
script: Class.Mixin.js
 
description: Classes that can be mixed in and out in runtime.
 
license: MIT-style license.
 
requires:
  - Core/Class

provides: 
  - Class.Mutators.Mixins
  - Class.mixin
  - Class.unmix
 
...
*/

Class.mixin = function(instance, klass) {
  var proto = klass.prototype;
  Object.each(proto, function(value, name) {
    if (typeof value !== 'function') return;
    switch (name) {
      case "parent": case "initialize": case "uninitialize": case "$constructor":
        return;
    }
    value = value.$origin;
    var origin = instance[name], parent, wrap
    if (origin) {
      if (origin.$mixes) return origin.$mixes.push(value);
      parent = origin.$owner;
      wrap = origin;
      origin = origin.$origin;
    }  
    var wrapper = instance[name] = function() {
      var stack = wrapper.$stack;
      if (!stack) stack = wrapper.$stack = wrapper.$mixes.clone()
      var mix = stack.pop();
      wrapper.$owner = {parent: mix ? instance.$constructor : parent}
      if (!mix) mix = origin;
      if (!mix) return;
      var caller = this.caller, current = this.$caller;
      this.caller = current; this.$caller = wrapper;
      var result = (mix || origin).apply(this, arguments);
      this.$caller = current; this.caller = caller;
      delete wrapper.$stack;
      return result;
    }.extend({$mixes: [value], $origin: origin, $name: name});
  });
  if (instance.setOptions && proto.options) instance.setOptions(proto.options) //undoeable now :(
  if (proto.initialize) {
    var parent = instance.parent; instance.parent = function(){};
    proto.initialize.call(instance, instance);
    instance.parent = parent;
  }
}

Class.unmix = function(instance, klass) {
  var proto = klass.prototype;
  Object.each(proto, function(value, key) {
    if (typeof value !== 'function') return;
    var remixed = instance[key]
    if (remixed && remixed.$mixes) {
      if (remixed.$origin) instance[key] = remixed.$origin;
      else delete instance[key];
    }
  })
  if (proto.uninitialize) {
    var parent = instance.parent; instance.parent = function(){};
    proto.uninitialize.call(instance, instance);
    instance.parent = parent;
  }
}

Class.implement('mixin', function(klass) {
  Class.mixin(this, klass)
})

Class.implement('unmix', function(klass) {
  Class.unmix(this, klass)
})
/*
---

name: Class.Extras

description: Contains Utility Classes that can be implemented into your own Classes to ease the execution of many common tasks.

license: MIT-style license.

requires: Class

provides: [Class.Extras, Chain, Events, Options]

...
*/

(function(){

this.Chain = new Class({

	$chain: [],

	chain: function(){
		this.$chain.append(Array.flatten(arguments));
		return this;
	},

	callChain: function(){
		return (this.$chain.length) ? this.$chain.shift().apply(this, arguments) : false;
	},

	clearChain: function(){
		this.$chain.empty();
		return this;
	}

});

var removeOn = function(string){
	return string.replace(/^on([A-Z])/, function(full, first){
		return first.toLowerCase();
	});
};

this.Events = new Class({

	$events: {},

	addEvent: function(type, fn, internal){
		type = removeOn(type);

		/*<1.2compat>*/
		if (fn == $empty) return this;
		/*</1.2compat>*/

		this.$events[type] = (this.$events[type] || []).include(fn);
		if (internal) fn.internal = true;
		return this;
	},

	addEvents: function(events){
		for (var type in events) this.addEvent(type, events[type]);
		return this;
	},

	fireEvent: function(type, args, delay){
		type = removeOn(type);
		var events = this.$events[type];
		if (!events) return this;
		args = Array.from(args);
		events.each(function(fn){
			if (delay) fn.delay(delay, this, args);
			else fn.apply(this, args);
		}, this);
		return this;
	},

	removeEvent: function(type, fn){
		type = removeOn(type);
		var events = this.$events[type];
		if (events && !fn.internal) events.erase(fn);
		return this;
	},

	removeEvents: function(events){
		var type;
		if (typeOf(events) == 'object'){
			for (type in events) this.removeEvent(type, events[type]);
			return this;
		}
		if (events) events = removeOn(events);
		for (type in this.$events){
			if (events && events != type) continue;
			var fns = this.$events[type];
			for (var i = fns.length; i--;) this.removeEvent(type, fns[i]);
		}
		return this;
	}

});

this.Options = new Class({

	setOptions: function(){
		var options = this.options = Object.merge.run([{}, this.options].append(arguments));
		if (!this.addEvent) return this;
		for (var option in options){
			if (typeOf(options[option]) != 'function' || !(/^on[A-Z]/).test(option)) continue;
			this.addEvent(option, options[option]);
			delete options[option];
		}
		return this;
	}

});

})();
/*
---

name: Class.Extras

description: Contains Utility Classes that can be implemented into your own Classes to ease the execution of many common tasks.

license: MIT-style license.

requires: Class

extends: Core/Class.Extras
...
*/

//dont use typeOf in loop :)

(function(apply) {
  
  Options.prototype.setOptions = function(){
  	var options = this.options = Object.merge.apply(null, [{}, this.options].append(arguments));
  	if (this.addEvent) for (var option in options){
  	  var value = options[option];
  		if (!value || (value.apply != apply) || !(/^on[A-Z]/).test(option)) continue;
  		this.addEvent(option, options[option]);
  		delete options[option];
  	}
  	return this;
  }

})(Function.prototype.apply);
/*
---
 
script: Class.Includes.js
 
description: Multiple inheritance in mootools, chained Extend basically.
 
license: MIT-style license.
 
requires:
- Core/Options
- Core/Events
- Core/Class

provides: [Class.Mutators.Includes, Class.include, Class.flatten]
 
...
*/

(function() {
  
  var getInstance = function(klass){
    klass.$prototyping = true;
    var proto = new klass;
    delete klass.$prototyping;
    return proto;
  };
  
  Class.include = function(klass, klasses) {
    return new Class({
      Includes: Array.from(arguments).flatten()
    });
  };
  
  Class.flatten = function(items) {
    return Array.from(items).clean().map(function(item, i) {
      if (item.parent) {
        return [Class.flatten(item.parent), item];
      } else {
        return item;
      }
    }).flatten();
  };

  Class.Mutators.Includes = function(items) {
    items = Array.from(items);
    var instance = this.parent ? this.parent : items.shift();
    Class.flatten(items).each(function(parent){
      var baked = new Class;
      if (instance) {
        baked.parent = instance;
        baked.prototype = getInstance(instance);
      }
      var proto = Object.append({}, parent.prototype);
      delete proto.$caller;
      delete proto.$constructor;
      delete proto.parent;
      delete proto.caller;
      for (var i in proto) {
        var fn = proto[i];
        if (fn && fn.$owner && (fn.$owner != parent) && fn.$owner.parent) delete proto[i];
      }
      baked.implement(proto);
      instance = baked;
    }, this);
    this.parent = instance;
    this.prototype = getInstance(instance);
  };
})();
/*
---
 
script: Class.Macros.js
 
description: A few functions that simplify definition of everyday methods with common logic
 
license: MIT-style license.
 
requires:
- Core/Options
- Core/Events
- Core/Class.Extras

provides: [Macro, Class.hasParent]
 
...
*/

Class.hasParent = function(klass) {
  var caller = klass.$caller;
  return !!(caller.$owner.parent && caller.$owner.parent.prototype[caller.$name]);
};

Macro = {};

/*
Make stackable function what executes it's parent before itself
*/
Macro.onion = function(callback) {
  return function() {
    if (!this.parent.apply(this, arguments)) return;
    return callback.apply(this, arguments) !== false;
  };
};

/*
Make getter-function with cache. Returned function alculates values on first call, after return this[name].
To reset cache use:

  delete this[name];

*/
Macro.getter = function(name, callback) {
  return function() {
    if (!this[name]) this[name] = callback.apply(this, arguments);
    return this[name];
  };
};


/*
Make function that runs it's parent if it exists, and runs itself if does not
*/
Macro.defaults = function(callback) {
  return function() {
    if (Class.hasParent(this)) {
      return this.parent.apply(this, arguments);
    } else {
      return callback.apply(this, arguments);
    }
  };
};

/*
Make function what returns property 'name' of passed argument
*/
Macro.map = function(name) {
  return function(item) {
    return item[name];
  };
};

/*
Make function Macro.map but diference that Macro.proc calls 'name' method
*/
Macro.proc = function(name, args) {
  return function(item) {
    return item[name].apply(item, args || arguments);
  };
};

/*
Make function what call method 'method' of property this[name] with passed arguments
*/
Macro.delegate = function(name, method) {
  return function() {
    if (this[name]) return this[name][method].apply(this[name], arguments);
  };
};
/*
---

name: Fx

description: Contains the basic animation logic to be extended by all other Fx Classes.

license: MIT-style license.

requires: [Chain, Events, Options]

provides: Fx

...
*/

(function(){

var Fx = this.Fx = new Class({

	Implements: [Chain, Events, Options],

	options: {
		/*
		onStart: nil,
		onCancel: nil,
		onComplete: nil,
		*/
		fps: 50,
		unit: false,
		duration: 500,
		link: 'ignore'
	},

	initialize: function(options){
		this.subject = this.subject || this;
		this.setOptions(options);
	},

	getTransition: function(){
		return function(p){
			return -(Math.cos(Math.PI * p) - 1) / 2;
		};
	},

	step: function(){
		var time = Date.now();
		if (time < this.time + this.options.duration){
			var delta = this.transition((time - this.time) / this.options.duration);
			this.set(this.compute(this.from, this.to, delta));
		} else {
			this.set(this.compute(this.from, this.to, 1));
			this.complete();
		}
	},

	set: function(now){
		return now;
	},

	compute: function(from, to, delta){
		return Fx.compute(from, to, delta);
	},

	check: function(){
		if (!this.timer) return true;
		switch (this.options.link){
			case 'cancel': this.cancel(); return true;
			case 'chain': this.chain(this.caller.bind(this, arguments)); return false;
		}
		return false;
	},

	start: function(from, to){
		if (!this.check(from, to)) return this;
		var duration = this.options.duration;
		this.options.duration = Fx.Durations[duration] || duration.toInt();
		this.from = from;
		this.to = to;
		this.time = 0;
		this.transition = this.getTransition();
		this.startTimer();
		this.onStart();
		return this;
	},

	complete: function(){
		if (this.stopTimer()) this.onComplete();
		return this;
	},

	cancel: function(){
		if (this.stopTimer()) this.onCancel();
		return this;
	},

	onStart: function(){
		this.fireEvent('start', this.subject);
	},

	onComplete: function(){
		this.fireEvent('complete', this.subject);
		if (!this.callChain()) this.fireEvent('chainComplete', this.subject);
	},

	onCancel: function(){
		this.fireEvent('cancel', this.subject).clearChain();
	},

	pause: function(){
		this.stopTimer();
		return this;
	},

	resume: function(){
		this.startTimer();
		return this;
	},

	stopTimer: function(){
		if (!this.timer) return false;
		this.time = Date.now() - this.time;
		this.timer = removeInstance(this);
		return true;
	},

	startTimer: function(){
		if (this.timer) return false;
		this.time = Date.now() - this.time;
		this.timer = addInstance(this);
		return true;
	}

});

Fx.compute = function(from, to, delta){
	return (to - from) * delta + from;
};

Fx.Durations = {'short': 250, 'normal': 500, 'long': 1000};

// global timers

var instances = {}, timers = {};

var loop = function(){
	for (var i = this.length; i--;){
		if (this[i]) this[i].step();
	}
};

var addInstance = function(instance){
	var fps = instance.options.fps,
		list = instances[fps] || (instances[fps] = []);
	list.push(instance);
	if (!timers[fps]) timers[fps] = loop.periodical(Math.round(1000 / fps), list);
	return true;
};

var removeInstance = function(instance){
	var fps = instance.options.fps,
		list = instances[fps] || [];
	list.erase(instance);
	if (!list.length && timers[fps]) timers[fps] = clearInterval(timers[fps]);
	return false;
};

})();

/*
---

name: JSON

description: JSON encoder and decoder.

license: MIT-style license.

See Also: <http://www.json.org/>

requires: [Array, String, Number, Function]

provides: JSON

...
*/

if (!this.JSON) this.JSON = {};

//<1.2compat>

JSON = new Hash({
	stringify: JSON.stringify,
	parse: JSON.parse
});

//</1.2compat>

Object.append(JSON, {
	
	$specialChars: {'\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"' : '\\"', '\\': '\\\\'},

	$replaceChars: function(chr){
		return JSON.$specialChars[chr] || '\\u00' + Math.floor(chr.charCodeAt() / 16).toString(16) + (chr.charCodeAt() % 16).toString(16);
	},

	encode: function(obj){
		switch (typeOf(obj)){
			case 'string':
				return '"' + obj.replace(/[\x00-\x1f\\"]/g, JSON.$replaceChars) + '"';
			case 'array':
				return '[' + String(obj.map(JSON.encode).clean()) + ']';
			case 'object': case 'hash':
				var string = [];
				Object.each(obj, function(value, key){
					var json = JSON.encode(value);
					if (json) string.push(JSON.encode(key) + ':' + json);
				});
				return '{' + string + '}';
			case 'number': case 'boolean': return String(obj);
			case 'null': return 'null';
		}
		return null;
	},

	decode: function(string, secure){
		if (typeOf(string) != 'string' || !string.length) return null;
		if (secure && !(/^[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]*$/).test(string.replace(/\\./g, '@').replace(/"[^"\\\n\r]*"/g, ''))) return null;
		return eval('(' + string + ')');
	}

});

/*
---
name: Color
description: Class to create and manipulate colors. Includes HSB «-» RGB «-» HEX conversions. Supports alpha for each type.
requires: [Core/Type, Core/Array]
provides: Color
...
*/

(function(){

var colors = {
	maroon: '#800000', red: '#ff0000', orange: '#ffA500', yellow: '#ffff00', olive: '#808000',
	purple: '#800080', fuchsia: "#ff00ff", white: '#ffffff', lime: '#00ff00', green: '#008000',
	navy: '#000080', blue: '#0000ff', aqua: '#00ffff', teal: '#008080',
	black: '#000000', silver: '#c0c0c0', gray: '#808080'
};

var Color = this.Color = function(color, type){
	
	if (color.isColor){
		
		this.red = color.red;
		this.green = color.green;
		this.blue = color.blue;
		this.alpha = color.alpha;

	} else {
		
		var namedColor = colors[color];
		if (namedColor){
			color = namedColor;
			type = 'hex';
		}

		switch (typeof color){
			case 'string': if (!type) type = (type = color.match(/^rgb|^hsb/)) ? type[0] : 'hex'; break;
			case 'object': type = type || 'rgb'; color = color.toString(); break;
			case 'number': type = 'hex'; color = color.toString(16); break;
		}

		color = Color['parse' + type.toUpperCase()](color);
		this.red = color[0];
		this.green = color[1];
		this.blue = color[2];
		this.alpha = color[3];
	}
	
	this.isColor = true;

};

var limit = function(number, min, max){
	return Math.min(max, Math.max(min, number));
};

var listMatch = /([-.\d]+)\s*,\s*([-.\d]+)\s*,\s*([-.\d]+)\s*,?\s*([-.\d]*)/;
var hexMatch = /^#?([a-f0-9]{1,2})([a-f0-9]{1,2})([a-f0-9]{1,2})([a-f0-9]{0,2})$/i;

Color.parseRGB = function(color){
	return color.match(listMatch).slice(1).map(function(bit, i){
		return (i < 3) ? Math.round(((bit %= 256) < 0) ? bit + 256 : bit) : limit(((bit === '') ? 1 : Number(bit)), 0, 1);
	});
};
	
Color.parseHEX = function(color){
	if (color.length == 1) color = color + color + color;
	return color.match(hexMatch).slice(1).map(function(bit, i){
		if (i == 3) return (bit) ? parseInt(bit, 16) / 255 : 1;
		return parseInt((bit.length == 1) ? bit + bit : bit, 16);
	});
};
	
Color.parseHSB = function(color){
	var hsb = color.match(listMatch).slice(1).map(function(bit, i){
		if (i === 0) return Math.round(((bit %= 360) < 0) ? (bit + 360) : bit);
		else if (i < 3) return limit(Math.round(bit), 0, 100);
		else return limit(((bit === '') ? 1 : Number(bit)), 0, 1);
	});
	
	var a = hsb[3];
	var br = Math.round(hsb[2] / 100 * 255);
	if (hsb[1] == 0) return [br, br, br, a];
		
	var hue = hsb[0];
	var f = hue % 60;
	var p = Math.round((hsb[2] * (100 - hsb[1])) / 10000 * 255);
	var q = Math.round((hsb[2] * (6000 - hsb[1] * f)) / 600000 * 255);
	var t = Math.round((hsb[2] * (6000 - hsb[1] * (60 - f))) / 600000 * 255);

	switch (Math.floor(hue / 60)){
		case 0: return [br, t, p, a];
		case 1: return [q, br, p, a];
		case 2: return [p, br, t, a];
		case 3: return [p, q, br, a];
		case 4: return [t, p, br, a];
		default: return [br, p, q, a];
	}
};

var toString = function(type, array){
	if (array[3] != 1) type += 'a';
	else array.pop();
	return type + '(' + array.join(', ') + ')';
};

Color.prototype = {

	toHSB: function(array){
		var red = this.red, green = this.green, blue = this.blue, alpha = this.alpha;

		var max = Math.max(red, green, blue), min = Math.min(red, green, blue), delta = max - min;
		var hue = 0, saturation = (max != 0) ? delta / max : 0, brightness = max / 255;
		if (saturation){
			var rr = (max - red) / delta, gr = (max - green) / delta, br = (max - blue) / delta;
			hue = (red == max) ? br - gr : (green == max) ? 2 + rr - br : 4 + gr - rr;
			if ((hue /= 6) < 0) hue++;
		}

		var hsb = [Math.round(hue * 360), Math.round(saturation * 100), Math.round(brightness * 100), alpha];

		return (array) ? hsb : toString('hsb', hsb);
	},

	toHEX: function(array){

		var a = this.alpha;
		var alpha = ((a = Math.round((a * 255)).toString(16)).length == 1) ? a + a : a;
		
		var hex = [this.red, this.green, this.blue].map(function(bit){
			bit = bit.toString(16);
			return (bit.length == 1) ? '0' + bit : bit;
		});
		
		return (array) ? hex.concat(alpha) : '#' + hex.join('') + ((alpha == 'ff') ? '' : alpha);
	},
	
	toRGB: function(array){
		var rgb = [this.red, this.green, this.blue, this.alpha];
		return (array) ? rgb : toString('rgb', rgb);
	}

};

Color.prototype.toString = Color.prototype.toRGB;

Color.hex = function(hex){
	return new Color(hex, 'hex');
};

if (this.hex == null) this.hex = Color.hex;

Color.hsb = function(h, s, b, a){
	return new Color([h || 0, s || 0, b || 0, (a == null) ? 1 : a], 'hsb');
};

if (this.hsb == null) this.hsb = Color.hsb;

Color.rgb = function(r, g, b, a){
	return new Color([r || 0, g || 0, b || 0, (a == null) ? 1 : a], 'rgb');
};

if (this.rgb == null) this.rgb = Color.rgb;

if (this.Type) new Type('Color', Color);

})();

/*
---
name: ART
description: "The heart of ART."
requires: [Core/Class, Color/Color]
provides: [ART, ART.Element, ART.Container, ART.Transform]
...
*/

(function(){

this.ART = new Class;

ART.version = '09.dev';
ART.build = 'DEV';

ART.Element = new Class({

	/* dom */

	inject: function(element){
		if (element.element) element = element.element;
		element.appendChild(this.element);
		return this;
	},

	eject: function(){
		var element = this.element, parent = element.parentNode;
		if (parent) parent.removeChild(element);
		return this;
	},

	/* events */

	subscribe: function(type, fn, bind){
		if (typeof type != 'string'){ // listen type / fn with object
			var subscriptions = [];
			for (var t in type) subscriptions.push(this.subscribe(t, type[t]));
			return function(){ // unsubscribe
				for (var i = 0, l = subscriptions.length; i < l; i++)
					subscriptions[i]();
				return this;
			};
		} else { // listen to one
			var bound = fn.bind(bind || this);
			var element = this.element;
			if (element.addEventListener){
				element.addEventListener(type, bound, false);
				return function(){ // unsubscribe
					element.removeEventListener(type, bound, false);
					return this;
				};
			} else {
				element.attachEvent('on' + type, bound);
				return function(){ // unsubscribe
					element.detachEvent('on' + type, bound);
					return this;
				};
			}
		}
	}

});

ART.Container = new Class({

	grab: function(){
		for (var i = 0; i < arguments.length; i++) arguments[i].inject(this);
		return this;
	}

});

var transformTo = function(xx, yx, xy, yy, x, y){
	if (xx && typeof xx == 'object'){
		yx = xx.yx; yy = xx.yy; y = xx.y;
		xy = xx.xy; x = xx.x; xx = xx.xx;
	}
	this.xx = xx == null ? 1 : xx;
	this.yx = yx || 0;
	this.xy = xy || 0;
	this.yy = yy == null ? 1 : yy;
	this.x = (x == null ? this.x : x) || 0;
	this.y = (y == null ? this.y : y) || 0;
	this._transform();
	return this;
};

ART.Transform = new Class({

	initialize: transformTo,

	_transform: function(){},

	xx: 1, yx: 0, x: 0,
	xy: 0, yy: 1, y: 0,

	transform: function(xx, yx, xy, yy, x, y){
		var m = this;
		if (xx && typeof xx == 'object'){
			yx = xx.yx; yy = xx.yy; y = xx.y;
			xy = xx.xy; x = xx.x; xx = xx.xx;
		}
		if (!x) x = 0;
		if (!y) y = 0;
		return this.transformTo(
			m.xx * xx + m.xy * yx,
			m.yx * xx + m.yy * yx,
			m.xx * xy + m.xy * yy,
			m.yx * xy + m.yy * yy,
			m.xx * x + m.xy * y + m.x,
			m.yx * x + m.yy * y + m.y
		);
	},

	transformTo: transformTo,

	translate: function(x, y){
		return this.transform(1, 0, 0, 1, x, y);
	},

	move: function(x, y){
		this.x += x || 0;
		this.y += y || 0;
		this._transform();
		return this;
	},

	scale: function(x, y){
		if (y == null) y = x;
		return this.transform(x, 0, 0, y, 0, 0);
	},

	rotate: function(deg, x, y){
		if (x == null || y == null){
			x = (this.left || 0) + (this.width || 0) / 2;
			y = (this.top || 0) + (this.height || 0) / 2;
		}

		var rad = deg * Math.PI / 180, sin = Math.sin(rad), cos = Math.cos(rad);

		this.transform(1, 0, 0, 1, x, y);
		var m = this;

		return this.transformTo(
			cos * m.xx - sin * m.yx,
			sin * m.xx + cos * m.yx,
			cos * m.xy - sin * m.yy,
			sin * m.xy + cos * m.yy,
			m.x,
			m.y
		).transform(1, 0, 0, 1, -x, -y);
	},

	moveTo: function(x, y){
		var m = this;
		return this.transformTo(m.xx, m.yx, m.xy, m.yy, x, y);
	},

	rotateTo: function(deg, x, y){
		var m = this;
		var flip = m.yx / m.xx > m.yy / m.xy ? -1 : 1;
		if (m.xx < 0 ? m.xy >= 0 : m.xy < 0) flip = -flip;
		return this.rotate(deg - Math.atan2(flip * m.yx, flip * m.xx) * 180 / Math.PI, x, y);
	},

	scaleTo: function(x, y){
		// Normalize
		var m = this;

		var h = Math.sqrt(m.xx * m.xx + m.yx * m.yx);
		m.xx /= h; m.yx /= h;

		h = Math.sqrt(m.yy * m.yy + m.xy * m.xy);
		m.yy /= h; m.xy /= h;

		return this.scale(x, y);
	},

	resizeTo: function(width, height){
		var w = this.width, h = this.height;
		if (!w || !h) return this;
		return this.scaleTo(width / w, height / h);
	},

	point: function(x, y){
		var m = this;
		return {
			x: m.xx * x + m.xy * y + m.x,
			y: m.yx * x + m.yy * y + m.y
		};
	}

});

Color.detach = function(color){
	color = new Color(color);
	return [Color.rgb(color.red, color.green, color.blue).toString(), color.alpha];
};

})();


/*
---
 
script: ART.Element.js
 
description: Smarter injection methods
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

extends: ART/ART.Element

provides: ART.Element.inserters
 
...
*/

!function() {
  
var inserters = {

  before: function(context, element){
    var parent = element.parentNode;
    if (parent) parent.insertBefore(context, element);
  },

  after: function(context, element){
    var parent = element.parentNode;
    if (parent) parent.insertBefore(context, element.nextSibling);
  },

  bottom: function(context, element){
    element.appendChild(context);
  },

  top: function(context, element){
    element.insertBefore(context, element.firstChild);
  }

};

ART.Element.implement({
  inject: function(element, where){
    if (element.element) element = element.element;
    inserters[where || 'bottom'](this.element, element, true);
    return this;
  }
});

}();
/*
---
name: ART.Path
description: "Class to generate a valid SVG path using method calls."
authors: ["[Valerio Proietti](http://mad4milk.net)", "[Sebastian Markbåge](http://calyptus.eu/)"]
provides: [ART.Path]
requires: [ART, ART.Transform]
...
*/

(function(){

/* private functions */

var parameterCount = {
	l: 2, z: 0,
	h: 1, v: 1,
	c: 6, s: 4,
	q: 4, t: 2,
	a: 7
};

function parse(path){

	if (!path) return [];

	var parts = [], index = -1,
	    bits = path.match(/[a-df-z]|[\-+]?(?:[\d\.]e[\-+]?|[^\s\-+,a-z])+/ig),
	    command, part, paramCount = 0;

	for (var i = 0, l = bits.length; i < l; i++){
		var bit = bits[i];
		if (bit.match(/^[a-z]/i)){
			command = bit;
			parts[++index] = part = [command];
			if (command == 'm') command = 'l';
			else if (command == 'M') command = 'L';
			paramCount = parameterCount[command.toLowerCase()];
		} else {
			if (part.length > paramCount) parts[++index] = part = [command];
			part.push(Number(bit));
		}
	}
	
	return parts;

};

function visitCurve(sx, sy, c1x, c1y, c2x, c2y, ex, ey, lineTo){
	var ax = sx - c1x,    ay = sy - c1y,
		bx = c1x - c2x,   by = c1y - c2y,
		cx = c2x - ex,    cy = c2y - ey,
		dx = ex - sx,     dy = ey - sy;

	// TODO: Faster algorithm without sqrts
	var err = Math.sqrt(ax * ax + ay * ay) +
	          Math.sqrt(bx * bx + by * by) +
	          Math.sqrt(cx * cx + cy * cy) -
	          Math.sqrt(dx * dx + dy * dy);

	if (err <= 0.0001){
		lineTo(sx, sy, ex, ey);
		return;
	}

	// Split curve
	var s1x =   (c1x + c2x) / 2,   s1y = (c1y + c2y) / 2,
	    l1x =   (c1x + sx) / 2,    l1y = (c1y + sy) / 2,
	    l2x =   (l1x + s1x) / 2,   l2y = (l1y + s1y) / 2,
	    r2x =   (ex + c2x) / 2,    r2y = (ey + c2y) / 2,
	    r1x =   (r2x + s1x) / 2,   r1y = (r2y + s1y) / 2,
	    l2r1x = (l2x + r1x) / 2,   l2r1y = (l2y + r1y) / 2;

	// TODO: Manual stack if necessary. Currently recursive without tail optimization.
	visitCurve(sx, sy, l1x, l1y, l2x, l2y, l2r1x, l2r1y, lineTo);
	visitCurve(l2r1x, l2r1y, r1x, r1y, r2x, r2y, ex, ey, lineTo);
};

var circle = Math.PI * 2;

function visitArc(rx, ry, rotation, large, clockwise, x, y, tX, tY, curveTo, arcTo){
	var rad = rotation * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
	x -= tX; y -= tY;
	
	// Ellipse Center
	var cx = cos * x / 2 + sin * y / 2,
		cy = -sin * x / 2 + cos * y / 2,
		rxry = rx * rx * ry * ry,
		rycx = ry * ry * cx * cx,
		rxcy = rx * rx * cy * cy,
		a = rxry - rxcy - rycx;

	if (a < 0){
		a = Math.sqrt(1 - a / rxry);
		rx *= a; ry *= a;
		cx = x / 2; cy = y / 2;
	} else {
		a = Math.sqrt(a / (rxcy + rycx));
		if (large == clockwise) a = -a;
		var cxd = -a * cy * rx / ry,
		    cyd =  a * cx * ry / rx;
		cx = cos * cxd - sin * cyd + x / 2;
		cy = sin * cxd + cos * cyd + y / 2;
	}

	// Rotation + Scale Transform
	var xx =  cos / rx, yx = sin / rx,
	    xy = -sin / ry, yy = cos / ry;

	// Start and End Angle
	var sa = Math.atan2(xy * -cx + yy * -cy, xx * -cx + yx * -cy),
	    ea = Math.atan2(xy * (x - cx) + yy * (y - cy), xx * (x - cx) + yx * (y - cy));

	cx += tX; cy += tY;
	x += tX; y += tY;

	// Circular Arc
	if (rx == ry && arcTo){
		arcTo(
			tX, tY, x, y,
			cx, cy, rx, sa, ea, !clockwise
		);
		return;
	}

	// Inverse Rotation + Scale Transform
	xx = cos * rx; yx = -sin * ry;
	xy = sin * rx; yy =  cos * ry;

	// Bezier Curve Approximation
	var arc = ea - sa;
	if (arc < 0 && clockwise) arc += circle;
	else if (arc > 0 && !clockwise) arc -= circle;

	var n = Math.ceil(Math.abs(arc / (circle / 4))),
	    step = arc / n,
	    k = (4 / 3) * Math.tan(step / 4),
	    a = sa;

	x = Math.cos(a); y = Math.sin(a);

	for (var i = 0; i < n; i++){
		var cp1x = x - k * y, cp1y = y + k * x;

		a += step;
		x = Math.cos(a); y = Math.sin(a);

		var cp2x = x + k * y, cp2y = y - k * x;

		curveTo(
			tX, tY,
			cx + xx * cp1x + yx * cp1y, cy + xy * cp1x + yy * cp1y,
			cx + xx * cp2x + yx * cp2y, cy + xy * cp2x + yy * cp2y,
			(tX = (cx + xx * x + yx * y)), (tY = (cy + xy * x + yy * y))
		);
	}
};

/* Measure bounds */

var left, right, top, bottom;

function lineBounds(sx, sy, x, y){
	left   = Math.min(left,   sx, x);
	right  = Math.max(right,  sx, x);
	top    = Math.min(top,    sy, y);
	bottom = Math.max(bottom, sy, y);
};

function curveBounds(sx, sy, p1x, p1y, p2x, p2y, x, y){
	left   = Math.min(left,   sx, p1x, p2x, x);
	right  = Math.max(right,  sx, p1x, p2x, x);
	top    = Math.min(top,    sy, p1y, p2y, y);
	bottom = Math.max(bottom, sy, p1y, p2y, y);
};

var west = circle / 2, south = west / 2, north = -south, east = 0;

function arcBounds(sx, sy, ex, ey, cx, cy, r, sa, ea, ccw){
	var bbsa = ccw ? ea : sa, bbea = ccw ? sa : ea;
	if (bbea < bbsa) bbea += circle;

	// Bounds
	var bbl = (bbea > west) ? (cx - r) : (ex),
	    bbr = (bbea > circle + east || (bbsa < east && bbea > east)) ? (cx + r) : (ex),
	    bbt = (bbea > circle + north || (bbsa < north && bbea > north)) ? (cy - r) : (ey),
	    bbb = (bbea > circle + south || (bbsa < south && bbea > south)) ? (cy + r) : (ey);

	left   = Math.min(left,   sx, bbl, bbr);
	right  = Math.max(right,  sx, bbl, bbr);
	top    = Math.min(top,    sy, bbt, bbb);
	bottom = Math.max(bottom, sy, bbt, bbb);
};

/* Measure length */

var length, desiredLength, desiredPoint;

function traverseLine(sx, sy, ex, ey){
	var x = ex - sx,
		y = ey - sy,
		l = Math.sqrt(x * x + y * y);
	length += l;
	if (length >= desiredLength){
		var offset = (length - desiredLength) / l,
		    cos = x / l,
		    sin = y / l;
		ex -= x * offset; ey -= y * offset;
		desiredPoint = new ART.Transform(cos, sin, -sin, cos, ex, ey);
		desiredLength = Infinity;
	}
};

function measureLine(sx, sy, ex, ey){
	var x = ex - sx, y = ey - sy;
	length += Math.sqrt(x * x + y * y);
};

/* Utility command factories */

var point = function(c){
	return function(x, y){
		return this.push(c, x, y);
	};
};

var arc = function(c, cc){
	return function(x, y, rx, ry, outer){
		return this.push(c, Math.abs(rx || x), Math.abs(ry || rx || y), 0, outer ? 1 : 0, cc, x, y);
	};
};

var curve = function(t, q, c){
	return function(c1x, c1y, c2x, c2y, ex, ey){
		var args = Array.slice(arguments), l = args.length;
		args.unshift(l < 4 ? t : l < 6 ? q : c);
		return this.push.apply(this, args);
	};
};

/* Path Class */

ART.Path = new Class({
	
	initialize: function(path){
		if (path instanceof ART.Path){ //already a path, copying
			this.path = Array.slice(path.path);
			this.cache = path.cache;
		} else {
			this.path = (path == null) ? [] : parse(path);
			this.cache = { svg: String(path) };
		}
	},
	
	push: function(){ //modifying the current path resets the memoized values.
		this.cache = {};
		this.path.push(Array.slice(arguments));
		return this;
	},
	
	reset: function(){
		this.cache = {};
		this.path = [];
		return this;
	},
	
	/*utility*/
	
	move: point('m'),
	moveTo: point('M'),
	
	line: point('l'),
	lineTo: point('L'),
	
	curve: curve('t', 'q', 'c'),
	curveTo: curve('T', 'Q', 'C'),
	
	arc: arc('a', 1),
	arcTo: arc('A', 1),
	
	counterArc: arc('a', 0),
	counterArcTo: arc('A', 0),
	
	close: function(){
		return this.push('z');
	},
	
	/* visitor */

	visit: function(lineTo, curveTo, arcTo, moveTo, close){
		var reflect = function(sx, sy, ex, ey){
			return [ex * 2 - sx, ey * 2 - sy];
		};
		
		if (!curveTo) curveTo = function(sx, sy, c1x, c1y, c2x, c2y, ex, ey){
			visitCurve(sx, sy, c1x, c1y, c2x, c2y, ex, ey, lineTo);
		};
		
		var X = 0, Y = 0, px = 0, py = 0, r, inX, inY;
		
		var parts = this.path;
		
		for (i = 0; i < parts.length; i++){
			var v = Array.slice(parts[i]), f = v.shift(), l = f.toLowerCase();
			var refX = l == f ? X : 0, refY = l == f ? Y : 0;
			
			if (l != 'm' && l != 'z' && inX == null){
				inX = X; inY = Y;
			}

			switch (l){
				
				case 'm':
					if (moveTo) moveTo(X, Y, X = refX + v[0], Y = refY + v[1]);
					else { X = refX + v[0]; Y = refY + v[1]; }
				break;
				
				case 'l':
					lineTo(X, Y, X = refX + v[0], Y = refY + v[1]);
				break;
				
				case 'c':
					px = refX + v[2]; py = refY + v[3];
					curveTo(X, Y, refX + v[0], refY + v[1], px, py, X = refX + v[4], Y = refY + v[5]);
				break;

				case 's':
					r = reflect(px, py, X, Y);
					px = refX + v[0]; py = refY + v[1];
					curveTo(X, Y, r[0], r[1], px, py, X = refX + v[2], Y = refY + v[3]);
				break;
				
				case 'q':
					px = (refX + v[0]); py = (refY + v[1]);
					curveTo(X, Y, (X + px * 2) / 3, (Y + py * 2) / 3, ((X = refX + v[2]) + px * 2) / 3, ((Y = refY + v[3]) + py * 2) / 3, X, Y);
				break;
				
				case 't':
					r = reflect(px, py, X, Y);
					px = r[0]; py = r[1];
					curveTo(X, Y, (X + px * 2) / 3, (Y + py * 2) / 3, ((X = refX + v[0]) + px * 2) / 3, ((Y = refY + v[1]) + py * 2) / 3, X, Y);
				break;

				case 'a':
					px = refX + v[5]; py = refY + v[6];
					if (!v[0] || !v[1] || (px == X && py == Y)) lineTo(X, Y, px, py);
					else visitArc(v[0], v[1], v[2], v[3], v[4], px, py, X, Y, curveTo, arcTo);
					X = px; Y = py;
				break;

				case 'h':
					lineTo(X, Y, X = refX + v[0], Y);
				break;
				
				case 'v':
					lineTo(X, Y, X, Y = refY + v[0]);
				break;
				
				case 'z':
					if (inX != null){
						if (close){
							close();
							if (moveTo) moveTo(X, Y, X = inX, Y = inY);
							else { X = inX; Y = inY; }
						} else {
							lineTo(X, Y, X = inX, Y = inY);
						}
						inX = null;
					}
				break;
				
			}
			if (l != 's' && l != 'c' && l != 't' && l != 'q'){
				px = X; py = Y;
			}
		}
	},
	
	/* transformation, measurement */
	
	toSVG: function(){
		if (this.cache.svg == null){
			var path = '';
			for (var i = 0, l = this.path.length; i < l; i++) path += this.path[i].join(' ');
			this.cache.svg = path;
		}
		return this.cache.svg;
	},
	
	measure: function(){
		if (this.cache.box == null){
			left = top = Infinity;
			right = bottom = -Infinity;
			this.visit(lineBounds, curveBounds, arcBounds);
			if (left == Infinity)
				this.cache.box = {left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0};
			else
				this.cache.box = {left: left, top: top, right: right, bottom: bottom, width: right - left, height: bottom - top };
		}
		return this.cache.box;
	},

	point: function(lengthToPoint){
		length = 0;
		desiredLength = lengthToPoint;
		desiredPoint = null;
		this.visit(traverseLine);
		return desiredPoint;
	},

	measureLength: function(){
		length = 0;
		this.visit(measureLine);
		return length;
	}

});

ART.Path.prototype.toString = ART.Path.prototype.toSVG;

})();
/*
---
name: ART.SVG
description: "SVG implementation for ART"
provides: [ART.SVG, ART.SVG.Group, ART.SVG.Shape, ART.SVG.Image, ART.SVG.Text]
requires: [ART, ART.Element, ART.Container, ART.Transform, ART.Path]
...
*/

(function(){
	
var NS = 'http://www.w3.org/2000/svg', XLINK = 'http://www.w3.org/1999/xlink', XML = 'http://www.w3.org/XML/1998/namespace',
    UID = 0,
    createElement = function(tag){
        return document.createElementNS(NS, tag);
    };

var ua = navigator && navigator.userAgent,
    hasBaseline = !(/opera|safari|ie/i).test(ua) || (/chrome/i).test(ua);

// SVG Base Class

ART.SVG = new Class({

	Extends: ART.Element,
	Implements: ART.Container,

	initialize: function(width, height){
		var element = this.element = createElement('svg');
		element.setAttribute('xmlns', NS);
		element.setAttribute('version', 1.1);
		var defs = this.defs = createElement('defs');
		element.appendChild(defs);
		if (width != null && height != null) this.resize(width, height);
	},

	resize: function(width, height){
		var element = this.element;
		element.setAttribute('width', width);
		element.setAttribute('height', height);
		this.width = width;
		this.height = height;
		return this;
	},
	
	toElement: function(){
		return this.element;
	}

});

// SVG Element Class

ART.SVG.Element = new Class({
	
	Extends: ART.Element,
	
	Implements: ART.Transform,

	initialize: function(tag){
		this.uid = String.uniqueID();
		var element = this.element = createElement(tag);
		element.setAttribute('id', 'e' + this.uid);
	},
	
	/* transforms */
	
	_transform: function(){
		var m = this;
		this.element.setAttribute('transform', 'matrix(' + [m.xx, m.yx, m.xy, m.yy, m.x, m.y] + ')');
	},
	
	blend: function(opacity){
		this.element.setAttribute('opacity', opacity);
		return this;
	},
	
	// visibility
	
	hide: function(){
		this.element.setAttribute('display', 'none');
		return this;
	},
	
	show: function(){
		this.element.setAttribute('display', '');
		return this;
	},
	
	// interaction
	
	indicate: function(cursor, tooltip){
		var element = this.element;
		if (cursor) this.element.style.cursor = cursor;
		if (tooltip){
			var title = this.titleElement; 
			if (title){
				title.firstChild.nodeValue = tooltip;
			} else {
				this.titleElement = title = createElement('title');
				title.appendChild(document.createTextNode(tooltip));
				element.insertBefore(title, element.firstChild);
			}
		}
		return this;
	}

});

// SVG Group Class

ART.SVG.Group = new Class({
	
	Extends: ART.SVG.Element,
	Implements: ART.Container,
	
	initialize: function(width, height){
		this.parent('g');
		this.width = width;
		this.height = height;
		this.defs = createElement('defs');
		this.element.appendChild(this.defs);
	}
	
});

// SVG Base Shape Class

ART.SVG.Base = new Class({
	
	Extends: ART.SVG.Element,

	initialize: function(tag){
		this.parent(tag);
		this.fill();
		this.stroke();
	},
	
	/* insertions */
	
	inject: function(container){
		this.eject();
		this.container = container;
		this._injectBrush('fill');
		this._injectBrush('stroke');
		this.parent(container);
		return this;
	},
	
	eject: function(){
		if (this.container){
			this.parent();
			this._ejectBrush('fill');
			this._ejectBrush('stroke');
			this.container = null;
		}
		return this;
	},
	
	_injectBrush: function(type){
		if (!this.container) return;
		var brush = this[type + 'Brush'];
		if (brush) this.container.defs.appendChild(brush);
	},
	
	_ejectBrush: function(type){
		if (!this.container) return;
		var brush = this[type + 'Brush'];
		if (brush) this.container.defs.removeChild(brush);
	},
	
	/* styles */
	
	_createBrush: function(type, tag){
		this._ejectBrush(type);

		var brush = createElement(tag);
		this[type + 'Brush'] = brush;

		var id = type + '-brush-e' + this.uid;
		brush.setAttribute('id', id);

		this._injectBrush(type);

		this.element.setAttribute(type, 'url(#' + id + ')');

		return brush;
	},

	_createGradient: function(type, style, stops){
		var gradient = this._createBrush(type, style);

		var addColor = function(offset, color){
			color = Color.detach(color);
			var stop = createElement('stop');
			stop.setAttribute('offset', offset);
			stop.setAttribute('stop-color', color[0]);
			stop.setAttribute('stop-opacity', color[1]);
			gradient.appendChild(stop);
		};

		// Enumerate stops, assumes offsets are enumerated in order
		// TODO: Sort. Chrome doesn't always enumerate in expected order but requires stops to be specified in order.
		if ('length' in stops) for (var i = 0, l = stops.length - 1; i <= l; i++) addColor(i / l, stops[i]);
		else for (var offset in stops) addColor(offset, stops[offset]);

		gradient.setAttribute('spreadMethod', 'reflect'); // Closer to the VML gradient


		this.element.removeAttribute('fill-opacity');
		return gradient;
	},
	
	_setColor: function(type, color){
		this._ejectBrush(type);
		this[type + 'Brush'] = null;
		var element = this.element;
		if (color == null){
			element.setAttribute(type, 'none');
			element.removeAttribute(type + '-opacity');
		} else {
			color = Color.detach(color);
			element.setAttribute(type, color[0]);
			element.setAttribute(type + '-opacity', color[1]);
		}
	},

	fill: function(color){
		if (arguments.length > 1) this.fillLinear(arguments);
		else this._setColor('fill', color);
		return this;
	},

	fillRadial: function(stops, focusX, focusY, radiusX, radiusY, centerX, centerY){
		var gradient = this._createGradient('fill', 'radialGradient', stops);

		gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
		

		if (focusX == null) focusX = (this.left || 0) + (this.width || 0) * 0.5;
		if (focusY == null) focusY = (this.top || 0) + (this.height || 0) * 0.5;
		if (radiusY == null) radiusY = radiusX || (this.height * 0.5) || 0;
		if (radiusX == null) radiusX = (this.width || 0) * 0.5;
		if (centerX == null) centerX = focusX;
		if (centerY == null) centerY = focusY;
		
		var ys = radiusY / radiusX;

		gradient.setAttribute('fx', focusX);
		gradient.setAttribute('fy', focusY / ys);

		gradient.setAttribute('r', radiusX);
		if (ys != 1) gradient.setAttribute('gradientTransform', 'scale(1,' + ys + ')');

		gradient.setAttribute('cx', centerX);
		gradient.setAttribute('cy', centerY / ys);
		
		return this;
	},

	fillLinear: function(stops, x1, y1, x2, y2){
		var gradient = this._createGradient('fill', 'linearGradient', stops);
		
		if (arguments.length == 5){
			gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
		} else {
			var angle = ((x1 == null) ? 270 : x1) * Math.PI / 180;

			var x = Math.cos(angle), y = -Math.sin(angle),
				l = (Math.abs(x) + Math.abs(y)) / 2;

			x *= l; y *= l;

			x1 = 0.5 - x;
			x2 = 0.5 + x;
			y1 = 0.5 - y;
			y2 = 0.5 + y;
		}

		gradient.setAttribute('x1', x1);
		gradient.setAttribute('y1', y1);
		gradient.setAttribute('x2', x2);
		gradient.setAttribute('y2', y2);

		return this;
	},

	fillImage: function(url, width, height, left, top, color1, color2){
		var pattern = this._createBrush('fill', 'pattern');

		var image = createElement('image');
		image.setAttributeNS(XLINK, 'href', url);
		image.setAttribute('width', width);
		image.setAttribute('height', height);
		image.setAttribute('preserveAspectRatio', 'none'); // none, xMidYMid slice, xMidYMid meet

		if (color1 != null){
			color1 = new Color(color1);
			if (color2 == null){
				color2 = new Color(color1);
				color2.alpha = 0;
			} else {
				color2 = new Color(color2);
			}

			var r = (color1.red - color2.red) / (255 * 3),
				g = (color1.green - color2.green) / (255 * 3),
				b = (color1.blue - color2.blue) / (255 * 3),
				a = (color1.alpha - color2.alpha) / 3;
			
			var matrix = [
				r, r, r, 0, color2.red / 255,
				g, g, g, 0, color2.green / 255,
				b, b, b, 0, color2.blue / 255,
				a, a, a, 0, color2.alpha
			];

			var filter = createElement('filter');
			filter.setAttribute('id', 'testfilter' + this.uid);

			var cm = createElement('feColorMatrix');
			cm.setAttribute('type', 'matrix');
			cm.setAttribute('values', matrix.join(' '));

			image.setAttribute('fill', '#000');
			image.setAttribute('filter', 'url(#testfilter' + this.uid + ')');

			filter.appendChild(cm);
			pattern.appendChild(filter);
		}

		pattern.appendChild(image);
		
		pattern.setAttribute('patternUnits', 'userSpaceOnUse');
		pattern.setAttribute('patternContentsUnits', 'userSpaceOnUse');
		
		pattern.setAttribute('x', left || 0);
		pattern.setAttribute('y', top || 0);
		
		pattern.setAttribute('width', width);
		pattern.setAttribute('height', height);

		//pattern.setAttribute('viewBox', '0 0 75 50');
		//pattern.setAttribute('preserveAspectRatio', 'xMidYMid slice');

		return this;
	},

	stroke: function(color, width, cap, join){
		var element = this.element;
		element.setAttribute('stroke-width', (width != null) ? width : 1);
		element.setAttribute('stroke-linecap', (cap != null) ? cap : 'round');
		element.setAttribute('stroke-linejoin', (join != null) ? join : 'round');

		this._setColor('stroke', color);
		return this;
	}
	
});

// SVG Shape Class

ART.SVG.Shape = new Class({
	
	Extends: ART.SVG.Base,
	
	initialize: function(path, width, height){
		this.parent('path');
		this.element.setAttribute('fill-rule', 'evenodd');
		this.width = width;
		this.height = height;
		if (path != null) this.draw(path);
	},
	
	draw: function(path, width, height){
		if (!(path instanceof ART.Path)) path = new ART.Path(path);
		this.element.setAttribute('d', path.toSVG());
		if (width != null) this.width = width;
		if (height != null) this.height = height;
		return this;
	}

});

ART.SVG.Image = new Class({
	
	Extends: ART.SVG.Base,
	
	initialize: function(src, width, height){
		this.parent('image');
		if (arguments.length == 3) this.draw.apply(this, arguments);
	},
	
	draw: function(src, width, height){
		var element = this.element;
		element.setAttributeNS(XLINK, 'href', src);
		element.setAttribute('width', width);
		element.setAttribute('height', height);
		this.width = width;
		this.height = height;
		return this;
	}
	
});

var fontAnchors = { left: 'start', center: 'middle', right: 'end' },
    fontAnchorOffsets = { middle: '50%', end: '100%' };

/* split each continuous line into individual paths */

var splitPaths, splitPath;

function splitMove(sx, sy, x, y){
	if (splitPath.length > 3) splitPaths.push(splitPath);
	splitPath = ['M', x, y];
};

function splitLine(sx, sy, x, y){
	splitPath.push('L', x, y);
};

function splitCurve(sx, sy, p1x, p1y, p2x, p2y, x, y){
	splitPath.push('C', p1x, p1y, p2x, p2y, x, y);
};

ART.SVG.Text = new Class({

	Extends: ART.SVG.Base,

	initialize: function(text, font, alignment, path){
		this.parent('text');
		this.draw.apply(this, arguments);
	},
	
	draw: function(text, font, alignment, path){
		var element = this.element;
	
		if (font){
			if (typeof font == 'string'){
				element.style.font = font;
			} else {
				for (var key in font){
					var ckey = key.camelCase ? key.camelCase() : key;
					// NOT UNIVERSALLY SUPPORTED OPTIONS
					// if (ckey == 'kerning') element.setAttribute('kerning', font[key] ? 'auto' : '0');
					// else if (ckey == 'letterSpacing') element.setAttribute('letter-spacing', Number(font[key]) + 'ex');
					// else if (ckey == 'rotateGlyphs') element.setAttribute('glyph-orientation-horizontal', font[key] ? '270deg' : '');
					// else
					element.style[ckey] = font[key];
				}
				element.style.lineHeight = '0.5em';
			}
		}
		
		if (alignment) element.setAttribute('text-anchor', this.textAnchor = (fontAnchors[alignment] || alignment));

		if (path && typeof path != 'number'){
			this._createPaths(new ART.Path(path));
		} else if (path === false){
			this._ejectPaths();
			this.pathElements = null;
		}
		
		var paths = this.pathElements, child;
		
		while ((child = element.firstChild)){
			element.removeChild(child);
		}
		
		// Note: Gecko will (incorrectly) align gradients for each row, while others applies one for the entire element
		
		var lines = String(text).split(/\r?\n/), l = lines.length,
		    baseline = 'central';
		
		if (paths && l > paths.length) l = paths.length;
		
		if (hasBaseline) element.setAttribute('dominant-baseline', baseline);

		element.setAttributeNS(XML, 'space', 'preserve');
		
		for (var i = 0; i < l; i++){
			var line = lines[i], row, content;
			if (paths){
				row = createElement('textPath');
				row.setAttributeNS(XLINK, 'href', '#' + paths[i].getAttribute('id'));
				row.setAttribute('startOffset', fontAnchorOffsets[this.textAnchor] || 0);
			} else {
				row = createElement('tspan');
				row.setAttribute('x', 0);
				row.setAttribute('y', (i * 1.1 + 0.5) + 'em');
			}
			if (hasBaseline){
				row.setAttribute('dominant-baseline', baseline);
				content = row;
			} else if (paths){
				content = createElement('tspan');
				content.setAttribute('dy', '0.35em');
				row.appendChild(content);
			} else {
				content = row;
				row.setAttribute('y', (i * 1.1 + 0.85) + 'em');
			}
			content.setAttributeNS(XML, 'space', 'preserve');
			content.appendChild(document.createTextNode(line));
			element.appendChild(row);
		}
		
		// Measure
		// TODO: Move to lazy ES5 left/top/width/height/bottom/right property getters
		var bb;
		try { bb = element.getBBox(); } catch (x){ }
		if (!bb || !bb.width) bb = this._whileInDocument(element.getBBox, element);
		
		this.left = bb.x;
		this.top = bb.y;
		this.width = bb.width;
		this.height = bb.height;
		this.right = bb.x + bb.width;
		this.bottom = bb.y + bb.height;
		return this;
	},
	
	// TODO: Unify path injection with gradients and imagefills

	inject: function(container){
		this.parent(container);
		this._injectPaths();
		return this;
	},
	
	eject: function(){
		if (this.container){
			this._ejectPaths();
			this.parent();
			this.container = null;
		}
		return this;
	},
	
	_injectPaths: function(){
		var paths = this.pathElements;
		if (!this.container || !paths) return;
		var defs = this.container.defs;
		for (var i = 0, l = paths.length; i < l; i++)
			defs.appendChild(paths[i]);
	},
	
	_ejectPaths: function(){
		var paths = this.pathElements;
		if (!this.container || !paths) return;
		var defs = this.container.defs;
		for (var i = 0, l = paths; i < l; i++)
			defs.removeChild(paths[i]);
	},
	
	_createPaths: function(path){
		this._ejectPaths();
		var id = 'p' + String.uniqueID() + '-';
		
		splitPaths = []; splitPath = ['M', 0, 0];
		path.visit(splitLine, splitCurve, null, splitMove);
		splitPaths.push(splitPath);
		
		var result = [];
		for (var i = 0, l = splitPaths.length; i < l; i++){
			var p = createElement('path');
			p.setAttribute('d', splitPaths[i].join(' '));
			p.setAttribute('id', id + i);
			result.push(p);
		}
		this.pathElements = result;
		this._injectPaths();
	},
	
	_whileInDocument: function(fn, bind){
		// Temporarily inject into the document
		var element = this.element,
		    container = this.container,
			parent = element.parentNode,
			sibling = element.nextSibling,
			body = element.ownerDocument.body,
			canvas = new ART.SVG(1, 1).inject(body);
		this.inject(canvas);
		var result = fn.call(bind);
		canvas.eject();
		if (container) this.inject(container);
		if (parent) parent.insertBefore(element, sibling);
		return result;
	}

});

})();
/*
---
 
script: ART.SVG.js
 
description: Some extensions (filters, dash, shadow blur)
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

extends: ART/ART.SVG

provides: [ART.SVG.prototype.dash, ART.SVG.prototype.strokeLinear, ART.SVG.prototype.fillRadial]
 
...
*/

!function() {
var NS = 'http://www.w3.org/2000/svg', XLINK = 'http://www.w3.org/1999/xlink', UID = 0, createElement = function(tag){
  return document.createElementNS(NS, tag);
};
  
ART.SVG.Base.implement({
  dash: function(dash) {
    if (dash) {
      this.dashed = true;
      this.element.setAttribute('stroke-dasharray', dash);
    } else if (this.dashed) {
      this.dashed = false;
      this.element.removeAttribute('stroke-dasharray')
    }
  },
  
  
  inject: function(container){
    this.eject();
    if (container instanceof ART.SVG.Group) container.children.push(this);
    this.parent.apply(this, arguments);
    this.container = container.defs ? container : container.container;
		this._injectBrush('fill');
		this._injectBrush('stroke');
    this._injectFilter('blur');
    return this;
  },
  
  strokeLinear: function(stops, angle){
    var gradient = this._createGradient('stroke', 'linear', stops);

    angle = ((angle == null) ? 270 : angle) * Math.PI / 180;

    var x = Math.cos(angle), y = -Math.sin(angle),
      l = (Math.abs(x) + Math.abs(y)) / 2;

    x *= l; y *= l;

    gradient.setAttribute('x1', 0.5 - x);
    gradient.setAttribute('x2', 0.5 + x);
    gradient.setAttribute('y1', 0.5 - y);
    gradient.setAttribute('y2', 0.5 + y);

    return this;
  },
  
  _writeTransform: function(){
    if (Object.equals(this.transformed, this.transform)) return;
    this.transformed = $unlink(this.transform);
    var transforms = [];
    for (var transform in this.transform) transforms.push(transform + '(' + this.transform[transform].join(',') + ')');
    this.element.setAttribute('transform', transforms.join(' '));
  },

  blur: function(radius){
    if (radius == null) radius = 4;
    if (radius == this.blurred) return;
    this.blurred = radius;
    
    var filter = this._createFilter();
    var blur = createElement('feGaussianBlur');
    blur.setAttribute('stdDeviation', radius * 0.25);
    blur.setAttribute('result', 'blur');
    filter.appendChild(blur);
    //in=SourceGraphic
    //stdDeviation="4" result="blur"
    return this;
  },

  unblur: function() {
    delete this.blurred;
    this._ejectFilter();
  },
  
  _injectFilter: function(type){
    if (!this.container) return;
    var filter = this.filter;
    if (filter) this.container.defs.appendChild(filter);
  },
  
  _ejectFilter: function(type){
    if (!this.container) return;
    var filter = this.filter;
    delete this.filter;
    if (filter) this.container.defs.removeChild(filter);
  },
  
  _createFilter: function(){
    this._ejectFilter();
  
    var filter = this.filter = createElement('filter');
  
    var id = 'filter-e' + this.uid;
    filter.setAttribute('id', id);
  
    this._injectFilter();
  
    this.element.setAttribute('filter', 'url(#' + id + ')');
  
    return filter;
  }
});

}();
/*
---
name: ART.VML
description: "VML implementation for ART"
authors: ["[Simo Kinnunen](http://twitter.com/sorccu)", "[Valerio Proietti](http://mad4milk.net)", "[Sebastian Markbåge](http://calyptus.eu/)"]
provides: [ART.VML, ART.VML.Group, ART.VML.Shape, ART.VML.Text]
requires: [ART, ART.Element, ART.Container, ART.Transform, ART.Path]
...
*/

(function(){

var precision = 100, UID = 0;

var defaultBox = { left: 0, top: 0, width: 500, height: 500 };

// VML Base Class

ART.VML = new Class({

	Extends: ART.Element,
	Implements: ART.Container,
	
	initialize: function(width, height){
		this.vml = document.createElement('vml');
		this.element = document.createElement('av:group');
		this.vml.appendChild(this.element);
		this.children = [];
		if (width != null && height != null) this.resize(width, height);
	},
	
	inject: function(element){
		if (element.element) element = element.element;
		element.appendChild(this.vml);
		return this;
	},
	
	resize: function(width, height){
		this.width = width;
		this.height = height;
		
		var style = this.vml.style;
		style.pixelWidth = width;
		style.pixelHeight = height;
		
		style = this.element.style;
		style.width = width;
		style.height = height;
		
		var halfPixel = (0.5 * precision);
		
		this.element.coordorigin = halfPixel + ',' + halfPixel;
		this.element.coordsize = (width * precision) + ',' + (height * precision);

		return this;
	},
	
	toElement: function(){
		return this.vml;
	}
	
});

// VML Initialization

var VMLCSS = 'behavior:url(#default#VML);display:inline-block;position:absolute;left:0px;top:0px;';

var styleSheet, styledTags = {}, styleTag = function(tag){
	if (styleSheet) styledTags[tag] = styleSheet.addRule('av\\:' + tag, VMLCSS);
};

ART.VML.init = function(document){

	var namespaces = document.namespaces;
	if (!namespaces) return false;

	namespaces.add('av', 'urn:schemas-microsoft-com:vml');
	namespaces.add('ao', 'urn:schemas-microsoft-com:office:office');

	styleSheet = document.createStyleSheet();
	styleSheet.addRule('vml', 'display:inline-block;position:relative;overflow:hidden;');
	styleTag('skew');
	styleTag('fill');
	styleTag('stroke');
	styleTag('path');
	styleTag('textpath');
	styleTag('group');

	return true;

};

// VML Element Class

ART.VML.Element = new Class({
	
	Extends: ART.Element,
	
	Implements: ART.Transform,
	
	initialize: function(tag){
		this.uid = String.uniqueID();
		if (!(tag in styledTags)) styleTag(tag);

		var element = this.element = document.createElement('av:' + tag);
		element.setAttribute('id', 'e' + this.uid);
	},
	
	/* dom */
	
	inject: function(container){
		this.eject();
		this.container = container;
		container.children.include(this);
		this._transform();
		this.parent(container);
		
		return this;
	},

	eject: function(){
		if (this.container){
			this.container.children.erase(this);
			this.container = null;
			this.parent();
		}
		return this;
	},

	// visibility
	
	hide: function(){
		this.element.style.display = 'none';
		return this;
	},
	
	show: function(){
		this.element.style.display = '';
		return this;
	},
	
	// interaction
	
	indicate: function(cursor, tooltip){
		if (cursor) this.element.style.cursor = cursor;
		if (tooltip) this.element.title = tooltip;
		return this;
	}

});

// VML Group Class

ART.VML.Group = new Class({
	
	Extends: ART.VML.Element,
	Implements: ART.Container,
	
	initialize: function(width, height){
		this.parent('group');
		this.width = width;
		this.height = height;
		this.children = [];
	},
	
	/* dom */
	
	inject: function(container){
		this.parent(container);
		this._transform();
		return this;
	},
	
	eject: function(){
		this.parent();
		return this;
	},
	
	_transform: function(){
		var element = this.element;
		element.coordorigin = '0,0';
		element.coordsize = '1000,1000';
		element.style.left = 0;
		element.style.top = 0;
		element.style.width = 1000;
		element.style.height = 1000;
		element.style.rotation = 0;
		
		var container = this.container;
		this._activeTransform = container ? new ART.Transform(container._activeTransform).transform(this) : this;
		var children = this.children;
		for (var i = 0, l = children.length; i < l; i++)
			children[i]._transform();
	}

});

// VML Base Shape Class

ART.VML.Base = new Class({

	Extends: ART.VML.Element,
	
	initialize: function(tag){
		this.parent(tag);
		var element = this.element;
		
		var skew = this.skewElement = document.createElement('av:skew');
		skew.on = true;
		element.appendChild(skew);

		var fill = this.fillElement = document.createElement('av:fill');
		fill.on = false;
		element.appendChild(fill);
		
		var stroke = this.strokeElement = document.createElement('av:stroke');
		stroke.on = false;
		element.appendChild(stroke);
	},
	
	/* transform */
	
	_transform: function(){
		var container = this.container;
		
		// Active Transformation Matrix
		var m = container ? new ART.Transform(container._activeTransform).transform(this) : this;
		
		// Box in shape user space
		
		var box = this._boxCoords || this._size || defaultBox;
		
		var originX = box.left || 0,
			originY = box.top || 0,
			width = box.width || 1,
			height = box.height || 1;
				
		// Flipped
	    var flip = m.yx / m.xx > m.yy / m.xy;
		if (m.xx < 0 ? m.xy >= 0 : m.xy < 0) flip = !flip;
		flip = flip ? -1 : 1;
		
		m = new ART.Transform().scale(flip, 1).transform(m);
		
		// Rotation is approximated based on the transform
		var rotation = Math.atan2(-m.xy, m.yy) * 180 / Math.PI;
		
		// Reverse the rotation, leaving the final transform in box space
		var rad = rotation * Math.PI / 180, sin = Math.sin(rad), cos = Math.cos(rad);
		
		var transform = new ART.Transform(
			(m.xx * cos - m.xy * sin),
			(m.yx * cos - m.yy * sin) * flip,
			(m.xy * cos + m.xx * sin) * flip,
			(m.yy * cos + m.yx * sin)
		);

		var rotationTransform = new ART.Transform().rotate(rotation, 0, 0);

		var shapeToBox = new ART.Transform().rotate(-rotation, 0, 0).transform(m).moveTo(0,0);

		// Scale box after reversing rotation
		width *= Math.abs(shapeToBox.xx);
		height *= Math.abs(shapeToBox.yy);
		
		// Place box
		var left = m.x, top = m.y;
		
		// Compensate for offset by center origin rotation
		var vx = -width / 2, vy = -height / 2;
		var point = rotationTransform.point(vx, vy);
		left -= point.x - vx;
		top -= point.y - vy;
		
		// Adjust box position based on offset
		var rsm = new ART.Transform(m).moveTo(0,0);
		point = rsm.point(originX, originY);
		left += point.x;
		top += point.y;
		
		if (flip < 0) left = -left - width;
		
		// Place transformation origin
		var point0 = rsm.point(-originX, -originY);
		var point1 = rotationTransform.point(width, height);
		var point2 = rotationTransform.point(width, 0);
		var point3 = rotationTransform.point(0, height);
		
		var minX = Math.min(0, point1.x, point2.x, point3.x),
		    maxX = Math.max(0, point1.x, point2.x, point3.x),
		    minY = Math.min(0, point1.y, point2.y, point3.y),
		    maxY = Math.max(0, point1.y, point2.y, point3.y);
		
		var transformOriginX = (point0.x - point1.x / 2) / (maxX - minX) * flip,
		    transformOriginY = (point0.y - point1.y / 2) / (maxY - minY);
		
		// Adjust the origin
		point = shapeToBox.point(originX, originY);
		originX = point.x;
		originY = point.y;
		
		// Scale stroke
		var strokeWidth = this._strokeWidth;
		if (strokeWidth){
			// Scale is the hypothenus between the two vectors
			// TODO: Use area calculation instead
			var vx = m.xx + m.xy, vy = m.yy + m.yx;
			strokeWidth *= Math.sqrt(vx * vx + vy * vy) / Math.sqrt(2);
		}
		
		// convert to multiplied precision space
		originX *= precision;
		originY *= precision;
		left *= precision;
		top *= precision;
		width *= precision;
		height *= precision;
		
		// Set box
		var element = this.element;
		element.coordorigin = originX + ',' + originY;
		element.coordsize = width + ',' + height;
		element.style.left = left + 'px';
		element.style.top = top + 'px';
		element.style.width = width;
		element.style.height = height;
		element.style.rotation = rotation.toFixed(8);
		element.style.flip = flip < 0 ? 'x' : '';
		
		// Set transform
		var skew = this.skewElement;
		skew.matrix = [transform.xx.toFixed(4), transform.xy.toFixed(4), transform.yx.toFixed(4), transform.yy.toFixed(4), 0, 0];
		skew.origin = transformOriginX + ',' + transformOriginY;

		// Set stroke
		this.strokeElement.weight = strokeWidth + 'px';
	},
	
	/* styles */

	_createGradient: function(style, stops){
		var fill = this.fillElement;

		// Temporarily eject the fill from the DOM
		this.element.removeChild(fill);

		fill.type = style;
		fill.method = 'none';
		fill.rotate = true;

		var colors = [], color1, color2;

		var addColor = function(offset, color){
			color = Color.detach(color);
			if (color1 == null) color1 = color2 = color;
			else color2 = color;
			colors.push(offset + ' ' + color[0]);
		};

		// Enumerate stops, assumes offsets are enumerated in order
		if ('length' in stops) for (var i = 0, l = stops.length - 1; i <= l; i++) addColor(i / l, stops[i]);
		else for (var offset in stops) addColor(offset, stops[offset]);
		
		fill.color = color1[0];
		fill.color2 = color2[0];
		
		//if (fill.colors) fill.colors.value = colors; else
		fill.colors = colors;

		// Opacity order gets flipped when color stops are specified
		fill.opacity = color2[1];
		fill['ao:opacity2'] = color1[1];

		fill.on = true;
		this.element.appendChild(fill);
		return fill;
	},
	
	_setColor: function(type, color){
		var element = this[type + 'Element'];
		if (color == null){
			element.on = false;
		} else {
			color = Color.detach(color);
			element.color = color[0];
			element.opacity = color[1];
			element.on = true;
		}
	},
	
	fill: function(color){
		if (arguments.length > 1){
			this.fillLinear(arguments);
		} else {
			this._boxCoords = defaultBox;
			var fill = this.fillElement;
			fill.type = 'solid';
			fill.color2 = '';
			fill['ao:opacity2'] = '';
			if (fill.colors) fill.colors.value = '';
			this._setColor('fill', color);
		}
		return this;
	},

	fillRadial: function(stops, focusX, focusY, radiusX, radiusY, centerX, centerY){
		var fill = this._createGradient('gradientradial', stops);
		if (focusX == null) focusX = this.left + this.width * 0.5;
		if (focusY == null) focusY = this.top + this.height * 0.5;
		if (radiusY == null) radiusY = radiusX || (this.height * 0.5);
		if (radiusX == null) radiusX = this.width * 0.5;
		if (centerX == null) centerX = focusX;
		if (centerY == null) centerY = focusY;
		
		centerX += centerX - focusX;
		centerY += centerY - focusY;
		
		var box = this._boxCoords = {
			left: centerX - radiusX * 2,
			top: centerY - radiusY * 2,
			width: radiusX * 4,
			height: radiusY * 4
		};
		focusX -= box.left;
		focusY -= box.top;
		focusX /= box.width;
		focusY /= box.height;

		fill.focussize = '0 0';
		fill.focusposition = focusX + ',' + focusY;
		fill.focus = '50%';
		
		this._transform();
		
		return this;
	},

	fillLinear: function(stops, x1, y1, x2, y2){
		var fill = this._createGradient('gradient', stops);
		fill.focus = '100%';
		if (arguments.length == 5){
			var w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
			this._boxCoords = {
				left: Math.min(x1, x2),
				top: Math.min(y1, y2),
				width: w < 1 ? h : w,
				height: h < 1 ? w : h
			};
			fill.angle = (360 + Math.atan2((x2 - x1) / h, (y2 - y1) / w) * 180 / Math.PI) % 360;
		} else {
			this._boxCoords = null;
			fill.angle = (x1 == null) ? 0 : (90 + x1) % 360;
		}
		this._transform();
		return this;
	},

	fillImage: function(url, width, height, left, top, color1, color2){
		var fill = this.fillElement;
		if (color1 != null){
			color1 = Color.detach(color1);
			if (color2 != null) color2 = Color.detach(color2);
			fill.type = 'pattern';
			fill.color = color1[0];
			fill.color2 = color2 == null ? color1[0] : color2[0];
			fill.opacity = color2 == null ? 0 : color2[1];
			fill['ao:opacity2'] = color1[1];
		} else {
			fill.type = 'tile';
			fill.color = '';
			fill.color2 = '';
			fill.opacity = 1;
			fill['ao:opacity2'] = 1;
		}
		if (fill.colors) fill.colors.value = '';
		fill.rotate = true;
		fill.src = url;
		
		fill.size = '1,1';
		fill.position = '0,0';
		fill.origin = '0,0';
		fill.aspect = 'ignore'; // ignore, atleast, atmost
		fill.on = true;

		if (!left) left = 0;
		if (!top) top = 0;
		this._boxCoords = width ? { left: left + 0.5, top: top + 0.5, width: width, height: height } : null;
		this._transform();
		return this;
	},

	/* stroke */
	
	stroke: function(color, width, cap, join){
		var stroke = this.strokeElement;
		this._strokeWidth = (width != null) ? width : 1;
		stroke.weight = (width != null) ? width + 'px' : 1;
		stroke.endcap = (cap != null) ? ((cap == 'butt') ? 'flat' : cap) : 'round';
		stroke.joinstyle = (join != null) ? join : 'round';

		this._setColor('stroke', color);
		return this;
	}

});

// VML Shape Class

ART.VML.Shape = new Class({

	Extends: ART.VML.Base,
	
	initialize: function(path, width, height){
		this.parent('shape');

		var p = this.pathElement = document.createElement('av:path');
		p.gradientshapeok = true;
		this.element.appendChild(p);
		
		this.width = width;
		this.height = height;
		
		if (path != null) this.draw(path);
	},
	
	// SVG to VML
	
	draw: function(path, width, height){
		
		if (!(path instanceof ART.Path)) path = new ART.Path(path);
		this._vml = path.toVML(precision);
		this._size = path.measure();
		
		if (width != null) this.width = width;
		if (height != null) this.height = height;
		
		if (!this._boxCoords) this._transform();
		this._redraw(this._prefix, this._suffix);
		
		return this;
	},
	
	// radial gradient workaround

	_redraw: function(prefix, suffix){
		var vml = this._vml || '';

		this._prefix = prefix;
		this._suffix = suffix
		if (prefix){
			vml = [
				prefix, vml, suffix,
				// Don't stroke the path with the extra ellipse, redraw the stroked path separately
				'ns e', vml, 'nf'
			].join(' ');
		}

		this.element.path = vml + 'e';
	},

	fill: function(){
		this._redraw();
		return this.parent.apply(this, arguments);
	},

	fillLinear: function(){
		this._redraw();
		return this.parent.apply(this, arguments);
	},

	fillImage: function(){
		this._redraw();
		return this.parent.apply(this, arguments);
	},

	fillRadial: function(stops, focusX, focusY, radiusX, radiusY, centerX, centerY){
		var fill = this._createGradient('gradientradial', stops);
		if (focusX == null) focusX = (this.left || 0) + (this.width || 0) * 0.5;
		if (focusY == null) focusY = (this.top || 0) + (this.height || 0) * 0.5;
		if (radiusY == null) radiusY = radiusX || (this.height * 0.5) || 0;
		if (radiusX == null) radiusX = (this.width || 0) * 0.5;
		if (centerX == null) centerX = focusX;
		if (centerY == null) centerY = focusY;

		centerX += centerX - focusX;
		centerY += centerY - focusY;
		
		var cx = Math.round(centerX * precision),
			cy = Math.round(centerY * precision),

			rx = Math.round(radiusX * 2 * precision),
			ry = Math.round(radiusY * 2 * precision),

			arc = ['wa', cx - rx, cy - ry, cx + rx, cy + ry].join(' ');

		this._redraw(
			// Resolve rendering bug
			['m', cx, cy - ry, 'l', cx, cy - ry].join(' '),
			// Draw an ellipse around the path to force an elliptical gradient on any shape
			[
				'm', cx, cy - ry,
				arc, cx, cy - ry, cx, cy + ry, arc, cx, cy + ry, cx, cy - ry,
				arc, cx, cy - ry, cx, cy + ry, arc, cx, cy + ry, cx, cy - ry
			].join(' ')
		);

		this._boxCoords = { left: focusX - 2, top: focusY - 2, width: 4, height: 4 };
		
		fill.focusposition = '0.5,0.5';
		fill.focussize = '0 0';
		fill.focus = '50%';
		
		this._transform();
		
		return this;
	}

});

var fontAnchors = { start: 'left', middle: 'center', end: 'right' };

ART.VML.Text = new Class({

	Extends: ART.VML.Base,

	initialize: function(text, font, alignment, path){
		this.parent('shape');
		
		var p = this.pathElement = document.createElement('av:path');
		p.textpathok = true;
		this.element.appendChild(p);
		
		p = this.textPathElement = document.createElement("av:textpath");
		p.on = true;
		p.style['v-text-align'] = 'left';
		this.element.appendChild(p);
		
		this.draw.apply(this, arguments);
	},
	
	draw: function(text, font, alignment, path){
		var element = this.element,
		    textPath = this.textPathElement,
		    style = textPath.style;
		
		textPath.string = text;
		
		if (font){
			if (typeof font == 'string'){
				style.font = font;
			} else {
				for (var key in font){
					var ckey = key.camelCase ? key.camelCase() : key;
					if (ckey == 'fontFamily') style[ckey] = "'" + font[key] + "'";
					// NOT UNIVERSALLY SUPPORTED OPTIONS
					// else if (ckey == 'kerning') style['v-text-kern'] = !!font[key];
					// else if (ckey == 'rotateGlyphs') style['v-rotate-letters'] = !!font[key];
					// else if (ckey == 'letterSpacing') style['v-text-spacing'] = Number(font[key]) + '';
					else style[ckey] = font[key];
				}
			}
		}
		
		if (alignment) style['v-text-align'] = fontAnchors[alignment] || alignment;
		
		if (path){
			this.currentPath = path = new ART.Path(path);
			this.element.path = path.toVML(precision);
		} else if (!this.currentPath){
			var i = -1, offsetRows = '\n';
			while ((i = text.indexOf('\n', i + 1)) > -1) offsetRows += '\n';
			textPath.string = offsetRows + textPath.string;
			this.element.path = 'm0,0l1,0';
		}
		
		// Measuring the bounding box is currently necessary for gradients etc.
		
		// Clone element because the element is dead once it has been in the DOM
		element = element.cloneNode(true);
		style = element.style;
		
		// Reset coordinates while measuring
		element.coordorigin = '0,0';
		element.coordsize = '10000,10000';
		style.left = '0px';
		style.top = '0px';
		style.width = '10000px';
		style.height = '10000px';
		style.rotation = 0;
		element.removeChild(element.firstChild); // Remove skew
		
		// Inject the clone into the document
		
		var canvas = new ART.VML(1, 1),
		    group = new ART.VML.Group(), // Wrapping it in a group seems to alleviate some client rect weirdness
		    body = element.ownerDocument.body;
		
		canvas.inject(body);
		group.element.appendChild(element);
		group.inject(canvas);
		
		var ebb = element.getBoundingClientRect(),
		    cbb = canvas.toElement().getBoundingClientRect();
		
		canvas.eject();
		
		this.left = ebb.left - cbb.left;
		this.top = ebb.top - cbb.top;
		this.width = ebb.right - ebb.left;
		this.height = ebb.bottom - ebb.top;
		this.right = ebb.right - cbb.left;
		this.bottom = ebb.bottom - cbb.top;
		
		this._transform();

		this._size = { left: this.left, top: this.top, width: this.width, height: this.height};
		return this;
	}

});

// VML Path Extensions

var path, p, round = Math.round;

function moveTo(sx, sy, x, y){
	path.push('m', round(x * p), round(y * p));
};

function lineTo(sx, sy, x, y){
	path.push('l', round(x * p), round(y * p));
};

function curveTo(sx, sy, p1x, p1y, p2x, p2y, x, y){
	path.push('c',
		round(p1x * p), round(p1y * p),
		round(p2x * p), round(p2y * p),
		round(x * p), round(y * p)
	);
};

function arcTo(sx, sy, ex, ey, cx, cy, r, sa, ea, ccw){
	cx *= p;
	cy *= p;
	r *= p;
	path.push(ccw ? 'at' : 'wa',
		round(cx - r), round(cy - r),
		round(cx + r), round(cy + r),
		round(sx * p), round(sy * p),
		round(ex * p), round(ey * p)
	);
};

function close(){
	path.push('x');
};

ART.Path.implement({

	toVML: function(precision){
		if (this.cache.vml == null){
			path = [];
			p = precision;
			this.visit(lineTo, curveTo, arcTo, moveTo, close);
			this.cache.vml = path.join(' ');
		}
		return this.cache.vml;
	}

});

})();
/*
---
name: ART.Base
description: "Implements ART, ART.Shape and ART.Group based on the current browser."
provides: [ART.Base, ART.Group, ART.Shape, ART.Text]
requires: [ART.VML, ART.SVG]
...
*/

(function(){
	
var SVG = function(){

	var implementation = document.implementation;
	return (implementation && implementation.hasFeature && implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1"));

};

var VML = function(){

	return ART.VML.init(document);

};

var MODE = SVG() ? 'SVG' : VML() ? 'VML' : null;
if (!MODE) return;

ART.Shape = new Class({Extends: ART[MODE].Shape});
ART.Group = new Class({Extends: ART[MODE].Group});
ART.Text = new Class({Extends: ART[MODE].Text});
ART.implement({Extends: ART[MODE]});

})();

/*
---
 
script: ART.js
 
description: ART extensions
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
- ART/ART.Path
- ART/ART.SVG
- ART/ART.VML
- ART/ART.Base
- Core/Browser
 
provides: [ART, ART.Features]
 
...
*/

ART.implement({

  setHeight: function(height) {
    this.element.setAttribute('height', height);
    return this;
  },

  setWidth: function(width) {
    this.element.setAttribute('width', width);
    return this;
  }

});



ART.Features = {};
ART.Features.Blur = Browser.firefox; //TODO: Figure it out
/*
---
 
script: Arrow.js
 
description: An arrow shape. Useful for all the chat bubbles and validation errors.
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - ART/ART.Shape
 
provides: 
  - ART.Shape.Arrow
 
...
*/

ART.Shape.Arrow = new Class({

  Extends: ART.Shape,
  
  properties: ['width', 'height', 'radius', 'arrowWidth', 'arrowHeight', 'arrowSide', 'arrowPosition', 'arrowX', 'arrowY'],
  
  draw: function(width, height, radius, aw, ah, as, ap, ax, ay){

    var path = new ART.Path;
    
    if (!radius) radius = 0;

    if (typeof radius == 'number') radius = [radius, radius, radius, radius];

    var tl = radius[0], tr = radius[1], br = radius[2], bl = radius[3];

    if (tl < 0) tl = 0;
    if (tr < 0) tr = 0;
    if (bl < 0) bl = 0;
    if (br < 0) br = 0;
    
    var sides = {
      top: Math.abs(width) - (tr + tl),
      right: Math.abs(height) - (tr + br),
      bottom: Math.abs(width) - (br + bl),
      left: Math.abs(height) - (bl + tl)
    };
    
    switch (as){
      case 'top': path.move(0, ah); break;
      case 'left': path.move(ah, 0); break;
    }

    path.move(0, tl);
    
    if (typeof ap == 'string') ap = ((sides[as] - aw) * (ap.toFloat() / 100));
    if (ap < 0) ap = 0;
    else if (ap > sides[as] - aw) ap = sides[as] - aw;
    var ae = sides[as] - ap - aw, aw2 = aw / 2;

    if (width < 0) path.move(width, 0);
    if (height < 0) path.move(0, height);
    
    // top

    if (tl > 0) path.arc(tl, -tl);
    if (as == 'top') path.line(ap, 0).line(aw2, -ah).line(aw2, ah).line(ae, 0);
    else path.line(sides.top, 0);
    
    // right

    if (tr > 0) path.arc(tr, tr);
    if (as == 'right') path.line(0, ap).line(ah, aw2).line(-ah, aw2).line(0, ae);
    else path.line(0, sides.right);
    
    // bottom

    if (br > 0) path.arc(-br, br);
    if (as == 'bottom') path.line(-ap, 0).line(-aw2, ah).line(-aw2, -ah).line(-ae, 0);
    else path.line(-sides.bottom, 0);
    
    // left

    if (bl > 0) path.arc(-bl, -bl);
    if (as == 'left') path.line(0, -ap).line(-ah, -aw2).line(ah, -aw2).line(0, -ae);
    else path.line(0, -sides.left);

    return this.parent(path);
  },

  getOffset: function(styles) {
    return {
      left: (styles.arrowSide == 'left') ? styles.arrowWidth : 0,
      right: (styles.arrowSide == 'right') ? styles.arrowWidth : 0,
      top: (styles.arrowSide == 'top') ? styles.arrowHeight : 0,
      bottom: (styles.arrowSide == 'bottom') ? styles.arrowHeight : 0
    }
  },
  
  render: function(context) {
    return this.draw(context.size.width, context.size.height, context.radius)
  }

});

/*
---
 
script: Ellipse.js
 
description: Draw ellipses and circles without a hassle
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
- ART/ART.Shape
 
provides: [ART.Shape.Ellipse]
 
...
*/

ART.Shape.Ellipse = new Class({
  
  Extends: ART.Shape,
  
  properties: ['width', 'height'],
  
  initialize: function(width, height){
    this.parent();
    if (width != null && height != null) this.draw(width, height);
  },
  
  draw: function(width, height){
    var path = new ART.Path;
    var rx = width / 2, ry = height / 2;
    path.move(0, ry).arc(width, 0, rx, ry).arc(-width, 0, rx, ry);
    return this.parent(path);
  },
  
  produce: function(delta) {
    return new ART.Shapes.Ellipse(this.style.width + delta * 2, this.style.height + delta * 2)
  }

});
/*
---
 
script: Flower.js
 
description: Ever wanted a flower button? Here you go
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
- ART/ART.Shape
 
provides: [ART.Shape.Flower]
 
...
*/

ART.Shape.Flower = new Class({
  
  Extends: ART.Shape,
  
  properties: ['width', 'height', 'leaves', 'radius'],
  
  draw: function(width, height, leaves, radius){
     var path = new ART.Path,
         outside = width / 2,
         cx = width / 2,
         cy = cx,
         inside = outside * (radius || 0.5);
     
    leaves = Math.max(leaves || 0, 5);
    path.move(0, inside);
    var points = ["M", cx, cy + rin, "Q"],
        R;
    for (var i = 1; i < leaves * 2 + 1; i++) {
        R = i % 2 ? rout : rin;
        points = points.concat([+(cx + R * Math.sin(i * Math.PI / n)).toFixed(3), +(cy + R * Math.cos(i * Math.PI / n)).toFixed(3)]);
    }
    points.push("z");
    return this.path(points);
    
    
    return this.parent(path.close());
  },

  getOffset: function(styles, offset) {
    var stroke = (styles.strokeWidth || 0);
    return {
      left: ((styles.width == 'auto') ? Math.max(stroke - offset.left, 0) : stroke),
      top: 0,
      right: ((styles.width == 'auto') ? Math.max(stroke - offset.right, 0) : stroke),
      bottom: stroke
    }
  }

});  

//Raphael.fn.flower = function (cx, cy, rout, rin, n) {
//    rin = rin || rout * .5;
//    n = +n < 3 || !n ? 5 : n;
//    var points = ["M", cx, cy + rin, "Q"],
//        R;
//    for (var i = 1; i < n * 2 + 1; i++) {
//        R = i % 2 ? rout : rin;
//        points = points.concat([+(cx + R * Math.sin(i * Math.PI / n)).toFixed(3), +(cy + R * Math.cos(i * Math.PI / n)).toFixed(3)]);
//    }
//    points.push("z");
//    return this.path(points);
//};

/*
---
 
script: Rectangle.js
 
description: Rectangles with rounded corners
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
- ART/ART.Shape
 
provides: [ART.Shape.Rectangle]
 
...
*/

ART.Shape.Rectangle = new Class({

  Extends: ART.Shape,
  
  draw: function(width, height, radius) {
    var path = new ART.Path;
    if (!radius){

      path.move(0, 0).line(width, 0).line(0, height).line(-width, 0).line(0, -height);

    } else {

      if (typeof radius == 'number') radius = [radius, radius, radius, radius];

      var tl = radius[0], tr = radius[1], br = radius[2], bl = radius[3];

      if (tl < 0) tl = 0;
      if (tr < 0) tr = 0;
      if (bl < 0) bl = 0;
      if (br < 0) br = 0;

      path.move(0, tl);

      if (width < 0) path.move(width, 0);
      if (height < 0) path.move(0, height);

      if (tl > 0) path.arc(tl, -tl);
      path.line(Math.abs(width) - (tr + tl), 0);

      if (tr > 0) path.arc(tr, tr);
      path.line(0, Math.abs(height) - (tr + br));

      if (br > 0) path.arc(-br, br);
      path.line(- Math.abs(width) + (br + bl), 0);

      if (bl > 0) path.arc(-bl, -bl);
      path.line(0, - Math.abs(height) + (bl + tl));
    }
    
    return this.parent(path);
  },
  
  render: function(context) {
    var radius = context.radius;     
    if (radius && radius.length == 4) radius = [radius[0], radius[2], radius[3], radius[1]]       
    return this.draw(context.size.width, context.size.height, radius)
  }
});
/*
---
 
script: Star.js
 
description: A star with variable number of edges
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - ART/ART.Shape
 
provides: 
  - ART/ART.Shape.Star
 
...
*/

ART.Shape.Star = new Class({
  
  Extends: ART.Shape,
  
  properties: ['width', 'height', 'starRays', 'starRadius', 'starOffset'],
  
  draw: function(width, height, rays, radius, offset){
    if (rays == null) rays = 5;
    var path = new ART.Path;
    var outer = width / 2;
    var angle = Math.PI / rays;
    offset = angle / (offset || 2.1);
    if (radius == null) radius = outer *.582;
    var lx = 0, ly = 0;
    for (var i = 0; i < rays * 2; i++) { 
      var r = i % 2 ? outer : radius; 
      var x = r * Math.cos(i * angle + offset);
      var y = r * Math.sin(i * angle + offset);
      if (i == 0) {
        path.move(x - lx + outer, y - ly + outer)
      } else {
        path.line(x - lx, y - ly);
      }
      lx = x;
      ly = y;
    }
    return this.parent(path.close());
  }

});

!function() {
  var Properties = {
    starRays: ['number'],
    starRadius: ['length', 'percentage']
  }
}();
/*
---
 
script: Glyphs.js
 
description: Glyph library
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
- ART/ART
 
provides: [ART.Glyphs]
 
...
*/

ART.Glyphs = {
  
  wrench: 'M11.414,11.415c-0.781,0.78-2.048,0.78-2.829,0L3.17,5.999C3.112,6.002,3.058,6.016,3,6.016c-1.657,0-3-1.347-3-3.008c0-0.464,0.114-0.899,0.302-1.292l1.987,1.988c0.391,0.39,1.023,0.39,1.414,0c0.391-0.391,0.391-1.023,0-1.414L1.715,0.3C2.105,0.113,2.538,0,3,0c1.657,0,3,1.347,3,3.008c0,0.051-0.012,0.099-0.015,0.149l5.429,5.429C12.195,9.368,12.195,10.634,11.414,11.415z M11,9.501c0-0.276-0.224-0.5-0.5-0.5h-1c-0.277,0-0.501,0.224-0.501,0.5v1c0,0.275,0.224,0.5,0.501,0.5h1c0.276,0,0.5-0.225,0.5-0.5V9.501z',
  
  refresh: 'M0,0M5.142,6.504l-2,1.174c1.07,1.899,3.709,2.232,5.203,0.661l1.603,0.688c-2.096,2.846-6.494,2.559-8.234-0.508L0,9.524c0.199-1.665,0.398-3.329,0.597-4.993C2.112,5.189,3.626,5.847,5.142,6.504M6.858,5.51L6.844,5.505l0.013-0.008L6.858,5.51 M5.142,6.491C5.16,6.494,5.16,6.498,5.143,6.503L5.142,6.491 M11.402,7.466L12,2.477l-1.714,1.007C8.549,0.411,4.147,0.131,2.054,2.971L3.655,3.66C5.156,2.089,7.78,2.425,8.857,4.322l-2,1.175L11.402,7.466M12,12z',
  
  search: 'M0,0M11.707,11.707c-0.391,0.391-1.024,0.391-1.415,0L7.759,9.174c-0.791,0.523-1.736,0.832-2.755,0.832C2.24,10.006,0,7.766,0,5.003S2.24,0,5.003,0s5.003,2.24,5.003,5.003c0,1.02-0.309,1.966-0.833,2.755l2.533,2.533C12.098,10.683,12.098,11.315,11.707,11.707z M5.003,2.002c-1.658,0-3.002,1.344-3.002,3.001c0,1.658,1.344,3.002,3.002,3.002c1.657,0,3.001-1.344,3.001-3.002C8.005,3.346,6.66,2.002,5.003,2.002M12,12z',
  
  smallCross: 'M0,0M8.708,4.706L7.414,6l1.294,1.294c0.391,0.391,0.391,1.023,0,1.414s-1.023,0.391-1.414,0L6,7.414L4.706,8.708c-0.391,0.391-1.023,0.391-1.415,0c-0.39-0.391-0.39-1.023,0-1.414L4.586,6L3.292,4.706c-0.39-0.391-0.39-1.024,0-1.415c0.391-0.391,1.024-0.39,1.415,0L6,4.586l1.294-1.294c0.391-0.391,1.023-0.39,1.414,0C9.099,3.683,9.099,4.315,8.708,4.706M12,12z',
  
  smallPlus: 'M0,0M7,3.17V5h1.83c0.552,0,1,0.448,1,1c0,0.553-0.448,1-1,1H7v1.83c0,0.553-0.448,1-1,1.001c-0.552-0.001-1-0.448-1-1V7L3.17,7c-0.552,0-1-0.448-1-1c0-0.553,0.448-1,1-1H5v-1.83c0-0.552,0.448-1,1-1C6.552,2.17,7,2.617,7,3.17M12,12z',
  
  smallMinus: 'M0,0M8.83,5c0.553,0,1,0.448,1,1l0,0c0,0.552-0.447,1-1,1H3.17c-0.552,0-1-0.448-1-1l0,0c0-0.552,0.448-1,1-1H8.83M12,12z',
  
  resize: 'M0,0M8.299,12L12,8.299v1.414L9.713,12H8.299z M4.244,12L12,4.244v1.414L5.658,12H4.244z M0.231,12L12,0.231v1.414L1.646,12H0.231M12,12z',
  
  checkMark: 'M8.277,0.046L6.301,0L2.754,4.224L0.967,2.611L0,3.633l3.464,3.51L8.277,0.046z',
  radio: 'M2.5,0C3.881,0,5,1.119,5,2.5S3.881,5,2.5,5S0,3.881,0,2.5S1.119,0,2.5,0z',
  
  //triangles
  
  triangleUp: "M0,8L4,0L8,8L0,8",
  triangleDown: "M0,0L8,0L4,8L0,0",
  triangleLeft: "M0,4L8,0L8,8L0,4",
  triangleRight: "M0,0L8,4L0,8L0,0",
  triangles: "M0,6L3,0L6,6L0,6M0,10L6,10L3,16L0,10",
  
  plus: "M3,0L6,0L6,3L9,3L9,6L6,6L6,9L3,9L3,6L0,6L0,3L3,3Z",
  minus: "M9,9M0,1.5L9,1.5L9,4.5L0,4.5Z",
  shutdown: "M21.816,3.999c-0.993-0.481-2.189-0.068-2.673,0.927c-0.482,0.995-0.066,2.191,0.927,2.673c3.115,1.516,5.265,4.705,5.263,8.401c-0.01,5.154-4.18,9.324-9.333,9.333c-5.154-0.01-9.324-4.18-9.334-9.333c-0.002-3.698,2.149-6.89,5.267-8.403c0.995-0.482,1.408-1.678,0.927-2.673c-0.482-0.993-1.676-1.409-2.671-0.927C5.737,6.152,2.667,10.72,2.665,16C2.667,23.364,8.634,29.332,16,29.334c7.365-0.002,13.333-5.97,13.334-13.334C29.332,10.722,26.266,6.157,21.816,3.999z M16,13.833c1.104,0,1.999-0.894,1.999-2V2.499C17.999,1.394,17.104,0.5,16,0.5c-1.106,0-2,0.895-2,1.999v9.333C14,12.938,14.894,13.833,16,13.833z"
  
};
/*
---

name: Object

description: Object generic methods

license: MIT-style license.

requires: Type

provides: [Object, Hash]

...
*/


Object.extend({
	
	subset: function(object, keys){
		var results = {};
		for (var i = 0, l = keys.length; i < l; i++){
			var k = keys[i];
			results[k] = object[k];
		}
		return results;
	},
	
	map: function(object, fn, bind){
		var results = {};
		for (var key in object){
			if (object.hasOwnProperty(key)) results[key] = fn.call(bind, object[key], key, object);
		}
		return results;
	},
	
	filter: function(object, fn, bind){
		var results = {};
		Object.each(object, function(value, key){
			if (fn.call(bind, value, key, object)) results[key] = value;
		});
		return results;
	},
	
	every: function(object, fn, bind){
		for (var key in object){
			if (object.hasOwnProperty(key) && !fn.call(bind, object[key], key)) return false;
		}
		return true;
	},
	
	some: function(object, fn, bind){
		for (var key in object){
			if (object.hasOwnProperty(key) && fn.call(bind, object[key], key)) return true;
		}
		return false;
	},
	
	keys: function(object){
		var keys = [];
		for (var key in object){
			if (object.hasOwnProperty(key)) keys.push(key);
		}
		return keys;
	},
	
	values: function(object){
		var values = [];
		for (var key in object){
			if (object.hasOwnProperty(key)) values.push(object[key]);
		}
		return values;
	},
	
	getLength: function(object){
		return Object.keys(object).length;
	},
	
	keyOf: function(object, value){
		for (var key in object){
			if (object.hasOwnProperty(key) && object[key] === value) return key;
		}
		return null;
	},
	
	contains: function(object, value){
		return Object.keyOf(object, value) != null;
	},
	
	toQueryString: function(object, base){
		var queryString = [];
		
		Object.each(object, function(value, key){
			if (base) key = base + '[' + key + ']';
			var result;
			switch (typeOf(value)){
				case 'object': result = Object.toQueryString(value, key); break;
				case 'array':
					var qs = {};
					value.each(function(val, i){
						qs[i] = val;
					});
					result = Object.toQueryString(qs, key);
				break;
				default: result = key + '=' + encodeURIComponent(value);
			}
			if (value != undefined) queryString.push(result);
		});

		return queryString.join('&');
	}
	
});


//<1.2compat>

Hash.implement({

	has: Object.prototype.hasOwnProperty,

	keyOf: function(value){
		return Object.keyOf(this, value);
	},

	hasValue: function(value){
		return Object.contains(this, value);
	},

	extend: function(properties){
		Hash.each(properties || {}, function(value, key){
			Hash.set(this, key, value);
		}, this);
		return this;
	},

	combine: function(properties){
		Hash.each(properties || {}, function(value, key){
			Hash.include(this, key, value);
		}, this);
		return this;
	},

	erase: function(key){
		if (this.hasOwnProperty(key)) delete this[key];
		return this;
	},

	get: function(key){
		return (this.hasOwnProperty(key)) ? this[key] : null;
	},

	set: function(key, value){
		if (!this[key] || this.hasOwnProperty(key)) this[key] = value;
		return this;
	},

	empty: function(){
		Hash.each(this, function(value, key){
			delete this[key];
		}, this);
		return this;
	},

	include: function(key, value){
		if (this[key] == undefined) this[key] = value;
		return this;
	},

	map: function(fn, bind){
		return new Hash(Object.map(this, fn, bind));
	},

	filter: function(fn, bind){
		return new Hash(Object.filter(this, fn, bind));
	},

	every: function(fn, bind){
		return Object.every(this, fn, bind);
	},

	some: function(fn, bind){
		return Object.some(this, fn, bind);
	},

	getKeys: function(){
		return Object.keys(this);
	},

	getValues: function(){
		return Object.values(this);
	},

	toQueryString: function(base){
		return Object.toQueryString(this, base);
	}

});

Hash.extend = Object.append;

Hash.alias({indexOf: 'keyOf', contains: 'hasValue'});

//</1.2compat>

/*
---
 
script: Base.js
 
description: Speedy function that checks equality of objects (doing some nasty type assumption)
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

extends: Core/Object

*/



Object.equals = function(one, another) {
  if (one == another) return true;
  if ((!one) ^ (!another)) return false;
  if (typeof one == 'undefined') return false;
  
  if ((one instanceof Array) || one.callee) {
    var j = one.length;
    if (j != another.length) return false;
    for (var i = 0; i < j; i++) if (!Object.equals(one[i], another[i])) return false;
    return true;
  } else if (one instanceof Color) {
    return (one.red == another.red) && (one.green == another.green) && (one.blue == another.blue) && (one.alpha == another.alpha)
  } else if (typeof one == 'object') {
    if (one.equals) return one.equals(another)
    for (var i in one) if (!Object.equals(one[i], another[i])) return false;
    return true;
  }
  return false;
};
/*
---

name: Event

description: Contains the Event Class, to make the event object cross-browser.

license: MIT-style license.

requires: [Window, Document, Array, Function, String, Object]

provides: Event

...
*/

var Event = new Type('Event', function(event, win){
	if (!win) win = window;
	var doc = win.document;
	event = event || win.event;
	if (event.$extended) return event;
	this.$extended = true;
	var type = event.type,
		target = event.target || event.srcElement,
		page = {},
		client = {};
	while (target && target.nodeType == 3) target = target.parentNode;

	if (type.test(/key/)){
		var code = event.which || event.keyCode;
		var key = Object.keyOf(Event.Keys, code);
		if (type == 'keydown'){
			var fKey = code - 111;
			if (fKey > 0 && fKey < 13) key = 'f' + fKey;
		}
		if (!key) key = String.fromCharCode(code).toLowerCase();
	} else if (type.test(/click|mouse|menu/i)){
		doc = (!doc.compatMode || doc.compatMode == 'CSS1Compat') ? doc.html : doc.body;
		page = {
			x: (event.pageX != null) ? event.pageX : event.clientX + doc.scrollLeft,
			y: (event.pageY != null) ? event.pageY : event.clientY + doc.scrollTop
		};
		client = {
			x: (event.pageX != null) ? event.pageX - win.pageXOffset : event.clientX,
			y: (event.pageY != null) ? event.pageY - win.pageYOffset : event.clientY
		};
		if (type.test(/DOMMouseScroll|mousewheel/)){
			var wheel = (event.wheelDelta) ? event.wheelDelta / 120 : -(event.detail || 0) / 3;
		}
		var rightClick = (event.which == 3) || (event.button == 2),
			related = null;
		if (type.test(/over|out/)){
			related = event.relatedTarget || event[(type == 'mouseover' ? 'from' : 'to') + 'Element'];
			var testRelated = function(){
				while (related && related.nodeType == 3) related = related.parentNode;
				return true;
			};
			var hasRelated = (Browser.firefox2) ? testRelated.attempt() : testRelated();
			related = (hasRelated) ? related : null;
		}
	} else if (type.test(/gesture|touch/i)){
		this.rotation = event.rotation;
		this.scale = event.scale;
		this.touches = event.touches;
		this.targetTouches = event.targetTouches;
		this.changedTouches = event.changedTouches;
	}

	return Object.append(this, {
		event: event,
		type: type,

		page: page,
		client: client,
		rightClick: rightClick,

		wheel: wheel,

		relatedTarget: document.id(related),
		target: document.id(target),

		code: code,
		key: key,

		shift: event.shiftKey,
		control: event.ctrlKey,
		alt: event.altKey,
		meta: event.metaKey
	});
});

Event.Keys = {
	'enter': 13,
	'up': 38,
	'down': 40,
	'left': 37,
	'right': 39,
	'esc': 27,
	'space': 32,
	'backspace': 8,
	'tab': 9,
	'delete': 46
};

//<1.2compat>

Event.Keys = new Hash(Event.Keys);

//</1.2compat>

Event.implement({

	stop: function(){
		return this.stopPropagation().preventDefault();
	},

	stopPropagation: function(){
		if (this.event.stopPropagation) this.event.stopPropagation();
		else this.event.cancelBubble = true;
		return this;
	},

	preventDefault: function(){
		if (this.event.preventDefault) this.event.preventDefault();
		else this.event.returnValue = false;
		return this;
	}

});

/*
---
 
script: LSD.js
 
description: LSD namespace definition
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Core/Class
  - Core/Events
  - Core/Options
  - Core/Browser
  - Core/Object
  - Ext/Macro
  - Ext/States
  - Ext/Class.mixin
  - Ext/FastArray
  - Ext/Class.Mutators.Includes
 
provides: 
  - LSD
 
...
*/

if (!window.console) window.console = {};
if (!window.console.log) window.console.log = function() {};

var LSD = Object.append(new Events, {
  Events: {},
  Attributes: {
    Numeric: Array.fast('tabindex', 'width', 'height'),
    Boolean: Array.fast('readonly', 'disabled', 'hidden')
  },
  Styles: {},
  States: {
    Known: {
      built:    {enabler: 'build',      disabler: 'destroy',   reflect: false},
      attached: {enabler: 'attach',     disabler: 'detach',    reflect: false},
      hidden:   {enabler: 'hide',       disabler: 'show'},
      disabled: {enabler: 'disable',    disabler: 'enable'},   
      focused:  {enabler: 'focus',      disabler: 'blur'},     
      selected: {enabler: 'select',     disabler: 'unselect'}, 
      checked:  {enabler: 'check',      disabler: 'uncheck',   toggler: 'toggle'},
      collapsed:{enabler: 'collapse',   disabler: 'expand',  toggler: 'toggle'},
      working:  {enabler: 'busy',       disabler: 'idle'},
      chosen:   {enabler: 'choose',     disabler: 'forget'},
      empty:    {enabler: 'empty',      disabler: 'fill',      property: 'unfilled', initial: true},
      invalid:  {enabler: 'invalidate', disabler: 'validate',   events: {enabler: 'invalid', disabler: 'valid'}},
      valid:    {enabler: 'validate',   disabler: 'invalidate', events: {enabler: 'valid', disabler: 'invalid'}},
      working:  {enabler: 'busy',       disabler: 'idle'},
      editing:  {enabler: 'edit',       disabler: 'finish'}
    },
    Positive: {
      disabled: 'disabled',
      focused: 'focused'
    },
    Negative: {
      enabled: 'disabled',
      blured: 'focused'
    },
    Attributes: {
      disabled: 'disabled',
      hidden: 'hidden'
    },
    Classes: {
      selected: 'selected',
      empty: 'empty',
      working: 'working'
    }
  },
  Options: {},
  useNative: true
});

Object.append(LSD, {
  position: function(box, size, x, y) {
    var position = {x: 0, y: 0};

    switch (x) {
      case "left":
        position.x = 0;
      case "right":
        position.x = box.width - size.width;
      case "center":
        position.x = (box.width - size.width) / 2;
    }
    switch (y) {
      case "top":
        position.y = 0;
      case "bottom":
        position.y = box.height - size.height;
      case "center":
        position.y = (box.height- size.height) / 2;
    }
    return position;
  },
  
  addEvents: function(object, events) {
    if (!object.$events) object.$events = {};
    for (var event in events) Events.prototype.addEvent.call(object, event, events[event]);
  },
  
  toLowerCase: function(lowercased) {
    return function(string) { 
      return (lowercased[string]) || (lowercased[string] = string.toLowerCase())
    }
  }(LSD.lowercased = {}),
  
  capitalize: function(capitalized) {
    return function(string) {
      return (capitalized[string]) || (capitalized[string] = string.capitalize())
    }
  }(LSD.capitalized = {}),
  
  toClassName: function(classnamed) {
    return function(string) {
      return (classnamed[string]) || (classnamed[string] = string.replace(/(^|-)([a-z])/g, function(a, b, c) { return (b ? '.' : '') + c.toUpperCase()}))
    }
  }(LSD.classnamed = {}),
  
  uid: function(object) {
    if (object.lsd) return object.lsd;
    if (object.localName) return $uid(object);
    return (object.lsd = ++LSD.UID); 
  },
  
  UID: 0,
  
  slice: (Browser.ie ? function(list, start) {
    for (var i = start || 0, j = list.length, ary = []; i < j; i++) ary.push(list[i]);
    return ary;
  } : function(list, start) {
    return Array.prototype.slice.call(list, start || 0);
  })
});

States.get = function(name) { 
  return LSD.States.Known[name];
};

(function(toString) {
  Type.isEnumerable = function(item){
    return (item != null && typeof item.length == 'number' && toString.call(item) != '[object Function]' && !item.localName && !item.nodeType);
  };
})(Object.prototype.toString);

/*
---
 
script: Behavior.js
 
description: Defines global selectors that mix the mixins in
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD
  - Slick/Slick.Parser
  
provides:
  - LSD.Behavior
  
...
*/

LSD.Behavior = function() {
  this.attached = [];
  this.expectations = {};
  this.parsed = {};
}

LSD.Behavior.prototype = {
  define: function(selector, behavior) {
    selector.split(/\s*,\s*/).each(function(bit) {
      var group = this.expectations[bit];
      if (!group) group = this.expectations[bit] = [];
      group.push(behavior);
      this.attached.each(function(object) {
        this.expect(object, bit, behavior)
      }, this);
    }, this);
  },
  
  expect: function(object, selector, behavior) {
    var proto = object.prototype, type = typeOf(behavior);
    var watcher = function(widget, state) {
      if (type == 'object') widget[state ? 'setOptions' : 'unsetOptions'](behavior);
      else widget[state ? 'mixin' : 'unmix'](behavior, true);
    }
    if (proto.expect) {
      //var parsed// = this.parsed[selector];
      //if (!parsed) {
        var parsed = this.parsed[selector] = Object.clone(Slick.parse(selector).expressions[0][0]);
        delete parsed.combinator;
      //}
      proto.expect(parsed, watcher);
    } else {
      //var options = proto.options, expectations = options.expectations;
      //if (!expectations) expectations = options.expecations = {};
      //expectations[selector] = watcher;
    }
  },
  
  attach: function(object) {
    this.attached.push(object);
    for (var expectation in this.expectations) 
      for (var exps = this.expectations[expectation], i = 0, exp; exp = exps[i++];)
        this.expect(object, expectation, exp);
  }
};

LSD.Behavior = new LSD.Behavior;
/*
---
 
script: Checkbox.js
 
description: Abstract command
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD
 
provides: 
  - LSD.Command
 
...
*/

LSD.Command = function(document, options) {
  this.setOptions(options);
  this.widgets = [];
  this.$events = Object.clone(this.$events);
  if (document) {
    this.document = document;
    if (!this.document.commands) this.document.commands = {};
    this.document.commands[this.options.id] = this;
  }
  if (this.options.type) this.setType(this.options.type);
};

LSD.Command.prototype = Object.append(new Options, new Events, new States, {
  options: {
    id: null,
    action: null
  },
  
  click: function() {
    this.fireEvent('click', arguments);
  },
  
  attach: function(widget) {
    for (var name in this.$states) {
      if (!widget.$states[name]) {
        widget.addState(name);
        widget.$states[name].origin = this;
      }
      this.linkState(widget, name, name, true);
    }
    widget.fireEvent('register', ['command', this]);
    this.widgets.push(widget);
    return this;
  },
  
  detach: function(widget) {
    widget.fireEvent('unregister', ['command', this]);
    for (var name in this.$states) {
      this.linkState(widget, name, name, false);
      if (widget.$states[name].origin == this); widget.removeState(name);
    }
    this.widgets.erase(widget);
    return this;
  },
  
  setType: function(type, unset) {
    if (this.type == type) return;
    if (this.type) this.unsetType(type);
    switch (type) {
      case "checkbox":
        /*
          Checkbox commands are useful when you need to track and toggle
          state of some linked object. 

          Provide your custom logic hooking on *check* and *uncheck*
          state transitions. Use *checked* property to get the current state.

          Examples:
            - Button that toggles visibility of a sidebar
            - Context menu item that shows or hides line numbers in editor
        */
        this.events = {
          click: function() {
            this.toggle();
          }
        }
        break;
        

      /*
        Radio groupping is a way to links commands together to allow
        only one in the group be active at the moment of time.

        Activation (*check*ing) of the commands deactivates all 
        other commands in a radiogroup.

        Examples: 
          - Tabs on top of a content window
          - Select box with a dropdown menu
      */
      case "radio":
        var name = this.options.radiogroup;
        if (name) {
          var groups = this.document.radiogroups;
          if (!groups) groups = this.document.radiogroups = {};
          var group = groups[name];
          if (!group) group = groups[name] = [];
          group.push(this);
          this.group = group;
          this.events = {
            click: function() {
              this.check.apply(this, arguments);
            },
            check: function() {
              group.each(function(sibling) {
                if (sibling != this) sibling.uncheck();
              }, this);
            }
          };
        }
    }
    if (this.events) this.addEvents(this.events);
  },
  
  unsetType: function() {
    if (this.events) {
      this.removeEvents(this.events);
      delete this.events;
    }
    delete this.type;
  }
});

LSD.Command.prototype.addStates('disabled', 'checked');
/*
---
 
script: Relation.js
 
description: An unsettable relation that dispatches options to specific widgets
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD

provides: 
  - LSD.Relation
 
...
*/

!function() {
  
LSD.Relation = function(name, origin, options) {
  this.name = name;
  this.origin = origin;
  if (this.$events) this.$events = Object.clone(this.$events);
  this.onChange = this.onChange.bind(this);
  this.options = {};
  this.$options = [];
  this.memo = {};
  this.widgets = [];
  this.target = origin;
  origin.relations[name] = this;
  if (options) this.setOptions(options);
}

LSD.Relation.prototype = Object.append({
  
  setOptions: function(options, unset) {
    this.$options[unset ? 'erase' : 'include'](options);
    this.options = Object.merge.apply(Object, [{}].concat(this.$options));
    if (options.target) this.memo.target = Options.target.call(this, options.target, true);
    for (name in options) {
      var setter = Options[name], value = options[name];
      if (!setter || !setter.call) 
        for (var i = 0, widget; widget = this.widgets[i++];) 
          this.applyOption(widget, name, value, unset, setter);
      else this.memo[name] = setter.call(this, value, !unset, this.memo[name]);
    }
    return this;
  },
  
  applyOption: function(widget, name, value, unset, setter) {
    if (setter) {
      if (!setter.call) {
        if (setter.process) {
          if (setter.process.call) value = setter.process.call(this, value);
          else value = widget[setter.process](value);
        }
        var method = setter[unset ? 'remove' : 'add'];
        if (setter.iterate) {
          var length = value.length;
          if (length != null) for (var i = 0, j = value.length; i < j; i++) method.call(this, widget, value[i]);
          else for (var i in value) method.call(this, widget, i, value[i])
        } else method.call(this, widget, value);
      }
    } else {
      widget.setOption(name, value, unset);
    }
  },
  
  applyOptions: function(widget, unset) {
    for (var name in this.options)
      this.applyOption(widget, name, this.options[name], unset, Options[name]);
  },
  
  onChange: function(widget, state) {
    return this[state ? 'onFind' : 'onLose'](widget);
  },
  
  onFind: function(widget) {
    if (widget == this) return;
    this.add(widget);
    this.applyOptions(widget);
    this.fireEvent('add', widget);
    this.origin.fireEvent('relate', [widget, this.name]);
  },
  
  onLose: function(widget) {
    if (widget == this) return;
    this.origin.fireEvent('unrelate', [widget, this.name]);
    this.remove(widget);
    this.fireEvent('remove', widget);
    this.applyOptions(widget, true);
  },
  
  add: function(widget) {
    if (this.options.multiple) {
      if (this.widgets.include(widget) > 1) return; 
    } else {
      this.widget = widget;
      this.widgets = [widget];
      this.origin[this.name] = widget;
    }
    delete this.empty;
    this.fireEvent('fill');
  },
  
  remove: function(widget) {
    if (this.options.multiple) {
      if (this.widgets.erase(widget).length) return;
    } else {
      delete this.widget;
      delete this.origin[this.name];
      this.widgets.splice(0, 1);
    }
    this.empty = true;
    this.fireEvent('empty');
  },
  
  proxy: function(widget) {
    if (this.widget) return this.widget.appendChild(widget);
    if (!this.proxied) {
      this.proxied = [];
      this.addEvent('fill:once', function() {
        for (var proxied; proxied = this.proxied.shift();) this.widget.appendChild(proxied);
      });
    }
    (this.proxied || (this.proxied = [])).push(widget);
  },
  
  getSource: function() {
    return this.options.source || this.options.selector;
  }
}, Events.prototype);

var Options = LSD.Relation.Options = {
  selector: function(selector, state, memo) {
    if (memo) memo[0].unwatch(memo[1], this.onChange);
    if (state && this.target) {
      if (selector.call) selector = selector.call(this.origin);
      this.target.watch(selector, this.onChange);
      return [this.target, selector];
    }
  },
  
  expectation: function(expectation, state, memo) {
    if (memo) memo[0].unexpect(memo[1], this.onChange);
    if (state && this.target) {
      if (expectation.call && !(expectation = expectation.call(this.origin))) return;
      this.target.expect(expectation, this.onChange);
      return [this.target, expectation];
    }
  },
  
  target: function(target, state, memo) {
    if (target.call) target = target.call(this.origin);
    if (this.targeted == target) return;
    this.targeted = target;
    if (memo) this.origin.removeEvents(memo);
    var setting = Targets[target];
    if (setting) {
      var relation = this, events = Object.map(setting.events, function(value, event) {
        return function(object) {
          if (value) {
            relation.target = object.nodeType == 9 ? object.body : object;
            var selector = relation.options.selector, expectation = relation.options.expectation;
            if (selector) Options.selector.call(relation, selector, true, relation.memo.selector);
            if (expectation) Options.expectation.call(relation, expectation, true, relation.memo.expectation);
          }
        }
      })
      this.origin.addEvents(events);
      if (setting.getter && !this.target) this.target = this.origin[setting.getter];
      return events;
    } else {
      if (this.origin[target]) this.target = this.origin[target];
    }
  },
  
  mutation: function(mutation, state, memo) {
    if (memo) this.origin.removeMutation(mutation, memo);
    if (state) {
      if (this.origin.parentNode || (this.origin.document && !this.origin.document.building)) {
        this.origin.toElement().getElements(mutation).each(function(element) {
          var mutated = this.origin.context.use(element, {source: this.options.source}, this.origin)
          if (mutated) mutated.inject(this.origin);
        }, this)
      }
      this.origin.addMutation(mutation, this.options.source);
      return this.options.source;
    }
  },
  
  proxy: function(condition, state, memo) {
    if (state) {
      var proxy = memo || {container: this.proxy.bind(this)};
      proxy.condition = condition;
      if (!memo) this.origin.addProxy(this.name, proxy);
      return proxy;
    } else {
      this.origin.removeProxy(this.name, memo);
    }
  },

  relay: function(events, state, memo) {
    if (state) {
      var origin = this.origin, relation = this, relay = Object.map(events, function(callback, event) {
        return function(event) {
          for (var widget = Element.get(event.target, 'widget'); widget; widget = widget.parentNode) {
            if (relation.widgets.indexOf(widget) > -1) {
              callback.apply(widget, arguments);
              break;
            }
          }
        };
      });
      var fillers = {
        fill: function() { 
          origin.addEvent('element', relay)
        },
        empty: function() {
          origin.removeEvent('element', relay)
        }
      };
      this.addEvents(fillers);
      if (!this.empty) fillers.fill();
      return fillers;
    } else {
      this.removeEvents(memo);
      if (!this.empty) memo.empty();
    }
  },
  
  multiple: function(multiple, state, memo) {
    if (multiple) {
      this.origin[this.name] = this.widgets
    } else {
      delete this.origin[this.name];
    }
  },
  
  callbacks: function(events, state) {
    for (var name in events) {
      var event = events[name];
      event = event.indexOf ? this.origin.bindEvent(event) : event.bind(this.origin);
      this[state ? 'addEvent' : 'removeEvent'](name, event);
    }
  },
  
  through: function(name, state, memo) {
    return LSD.Relation.Options.selector.call(this, '::' + name + '::' + (this.options.as || this.name), state, memo)
  },
  
  scope: function(name, state, memo) {
    if (memo) {
      for (var i = 0, widget; widget = this.widgets[i++];) memo.callbacks.remove.call(this, widget);
      this.origin.removeRelation(name, memo);
    }
    if (state) {
      var self = this, relation = this.origin.relations[name];
      memo = {
        callbacks: {
          add: function(widget) {
            widget.expect(self.options.filter, self.onChange, true)
          },
          remove: function(widget) {
            widget.unexpect(self.options.filter, self.onChange, true, true);
          }
        }
      };
      if (relation) for (var i = 0, widget; widget = relation.widgets[i++];) memo.callbacks.add.call(this, widget);
      this.origin.addRelation(name, memo);
      return memo;
    }
  },
  
  scopes: function(scopes, state, memo) {
    for (var scope in scopes) {
      var name = LSD.Relation.getScopeName(this.name, scope), relation = scopes[scope];
      this.origin[state ? 'addRelation' : 'removeRelation'](name, relation);
      var options = {};
      if (!relation.scope) options.scope = this.name;
      if (this.options.multiple) options.multiple = true;
      this.origin[state ? 'addRelation' : 'removeRelation'](name, options);
    }
  },
  
  states: {
    add: function(widget, states) {
      var get = states.get, set = states.set, add = states.add, lnk = states.link;
      if (get) for (var from in get) widget.linkState(this.origin, from, (get[from] === true) ? from : get[from]);
      if (set) for (var to in set) this.origin.linkState(widget, to, (set[to] === true) ? to : set[to]);
      if (add) for (var index in add) widget.addState(index, add[index]);
      if (lnk) for (var to in lnk) widget.linkState(widget, to, (lnk[to] === true) ? to : lnk[to]);
    },
    remove: function(widget, states) {
      var get = states.get, set = states.set, add = states.add, lnk = states.link;
      if (get) for (var from in get) widget.unlinkState(this.origin, from, (get[from] === true) ? from : get[from]);
      if (set) for (var to in set) this.origin.unlinkState(widget, to, (set[to] === true) ? to : set[to]);
      if (add) for (var index in add) widget.removeState(index, add[index]);
      if (lnk) for (var to in lnk) widget.unlinkState(widget, to, (lnk[to] === true) ? to : lnk[to]);
    }
  },
  
  as: {
    add: function(widget, name) {
      if (!widget[name]) widget[name] = this.origin;
    },
    remove: function(widget, name) {
      if (widget[name] == this.origin) delete widget[name];
    }
  },
  
  collection: {
    add: function(widget, name) {
      (widget[name] || (widget[name] = [])).push(this.origin);
    },
    remove: function(widget, name) {
      widget[name].erase(this.origin);
    }
  },
  
  events: {
    add: function(widget, events) {
      widget.addEvents(events);
    },
    remove: function(widget, events) {
      widget.removeEvents(events);
    },
    process: function(events) {
      return this.origin.bindEvents(events);
    }
  },
  
  relations: {
    add: function(widget, name, relation) {
      widget.addRelation(name, relation);
    },
    remove: function(widget, name, relation) {
      widget.removeRelation(name, relation);
    },
    iterate: true
  },
  
  options: {
    add: function(widget, options) {
      widget.setOptions(options.call ? options.call(this.origin) : options);
    },
    remove: function(widget, options) {
      widget.setOptions(options.call ? options.call(this.origin) : options, true);
    }
  }
};

LSD.Relation.getScopeName = function(scoped) {
  return function(relation, scope, multiple) {
    var key = Array.prototype.join.call(arguments);
    return (scoped[key] || (scoped[key] = (scope + LSD.capitalize(relation))))
  }
}({});

Options.has = Object.append({
  process: function(has) {
    var one = has.one, many = has.many, relations = {};
    if (one) for (var name in one) relations[name] = one[name];
    if (many) for (var name in many) relations[name] = Object.append(many[name], {multiple: true});
    return relations;
  }
}, Options.relations);

var Targets = LSD.Relation.Targets = {
  document: {
    getter: 'document',
    events: {
      setDocument: true,
      unsetDocument: true
    }
  },
  parent: {
    getter: 'parentNode',
    events: {
      setParent: true,
      unsetParent: true
    }
  },
  root: {
    getter: 'root',
    events: {
      setRoot: true,
      unsetRoot: true
    }
  }
};
}();
/*
---
 
script: Action.js
 
description: Action is a class that adds some feature to widget by mixing up in runtime
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires: 
  - LSD
 
provides: 
  - LSD.Action
 
...
*/


LSD.Action = function(options, name) {
  this.options = this.options ? Object.append(options || {}, this.options) : options || {};
  this.name = name;
  this.events = {
    enable:  this.enable.bind(this),
    disable: this.disable.bind(this),
    detach:  this.disable.bind(this)
  };  
  return this;
};

LSD.Action.prototype = {
  enable: function() {
    if (this.enabled) return false;
    this.commit(this.target, arguments, this.target);
    if (this.options.events) this.target.addEvents(this.target.events[this.options.events]);
    if (this.enabled == null) this.target.addEvents(this.events);
    this.enabled = true;
    return true;
  },

  disable: function() {
    if (!this.enabled) return false;
    this.revert(this.target, arguments, this.target);
    if (this.options.events) this.target.removeEvents(this.target.events[this.options.events]);
    if (this.enabled != null) this.target.removeEvents(this.events);
    this.enabled = false;
    return true;
  },
  
  commit: function(target, args, bind) {
    if (this.state) this.target[this.state.enabler]();
    var result = this.options.enable.apply(bind || this, [target].concat(args));
    return result;
  },
  
  revert: function(target, args, bind) {
    if (this.state) this.target[this.state.disabler]();
    return this.options.disable.apply(bind || this, [target].concat(args));
  },
  
  perform: function(target, args) {
    var method = (!this.options.getState || this.options.getState.apply(this, [target].concat(args))) ? 'commit' : 'revert';
    return this[method].apply(this, arguments);
  },

  use: function(widget, state) {
    var widgets = Array.prototype.slice.call(arguments, 0);
    var state = widgets.pop();
    this[state ? 'enable' : 'disable'].apply(this, widgets);
  },

  watch: function(widget, state) {
    if (!this[state ? 'enable' : 'disable'](widget)) //try enable the action
      this.options[state ? 'enable' : 'disable'].call(this.target, widget); //just fire the callback 
  },
  
  inject: function() {
    this.enable();
    if (this.state) this[state.enabler]();
  },

  attach: function(widget) {
    this.target = widget;
    this.state = this.name && widget.$states && widget.$states[this.name];
    if (this.state) {
      this.events[this.state.enabler] = this.options.enable.bind(this.target);
      this.events[this.state.disabler] = this.options.disabler.bind(this.target);
    }
    this.target.addEvents(this.events);
    if (this.options.uses) {
      this.target.use(this.options.uses, this.use.bind(this));
    } else if (this.options.watches) {
      this.target.watch(this.options.watches, this.watch.bind(this));
    } else if (!this.state || (name && this.target[name])) {
      if (this.target.onDOMInject) this.target.onDOMInject(this.inject.bind(this));
      else this.inject()
    }
  },

  detach: function(widget) {
    this.target.removeEvents(this.events);
    if (this.options.watches) this.target.unwatch(this.options.watches, this.watch);
    if (this.enabled) this.disable();
    if (this.state) {
      this[this.state.disabler]();
      delete this.events[this.state.enabler], this.events[this.state.disabler];
    }
    this.target = this.state = null;
  },
  
  store: function(key, value) {
    if (!this.storage) this.storage = {};
    if (!key.indexOf && (typeof key !== 'number')) key = LSD.uid(key);
    this.storage[key] = value;
   },
  
  retrieve: function(key) {
    if (!this.storage) return;
    if (!key.indexOf && (typeof key !== 'number')) key = LSD.uid(key);
    return this.storage[key];
  },
  
  eliminate: function(key) {
    if (!this.storage) return;
    if (!key.indexOf && (typeof key !== 'number')) key = LSD.uid(key);
    delete this.storage[key];
  },
  
  getInvoker: function() {
    return this.invoker;
  },
  
  getDocument: function() {
    return this.invoker && this.invoker.document;
  }
}

LSD.Action.build = function(curry) {
  var action = function() {
    LSD.Action.apply(this, arguments);
  };
  action.prototype = Object.merge({options: curry}, LSD.Action.prototype);
  return action;
};
/*
---
 
script: Create.js
 
description: Creates a layout based on selector object or DOM elements
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action
 
provides:
  - LSD.Action.Create
 
...
*/


LSD.Action.Create = LSD.Action.build({
  enable: function(target) {
    
  }
});
/*
---
 
script: Update.js
 
description: Update widget with html or json
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action

provides:
  - LSD.Action.Update

...
*/

LSD.Action.Update = LSD.Action.build({
  enable: function(target, content) {
    var widget = LSD.Module.DOM.find(target);
    var fragment = document.createFragment(content);
    var children = LSD.slice(fragment.childNodes);
    document.id(target).empty().appendChild(fragment);
    widget.fireEvent('DOMNodeInserted', [children]);
  }
});
/*
---

script: Delete.js

description: Deletes a widget or element

license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

requires:
  - LSD.Action

provides:
  - LSD.Action.Delete

...
*/


LSD.Action.Delete = LSD.Action.build({
  enable: function(target) {
    if (!target.lsd) {
      var widget = LSD.Module.DOM.find(target);
      LSD.Module.DOM.walk(target, function(node) {
        widget.dispatchEvent('nodeRemoved', node);
      });
    }
    target.dispose();
    if (target.getModel) return target.getModel()['delete']()
  }
});
/*
---
 
script: Value.js
 
description: Changes or synchronizes values
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action

provides:
  - LSD.Action.Value
 
...
*/
/*
---
 
script: Replace.js
 
description: Replaces one widget with another
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action
 
provides:
  - LSD.Action.Replace
 
...
*/


LSD.Action.Replace = LSD.Action.build({
  enable: function(target, content) {
    var widget = LSD.Module.DOM.find(target);
    if (widget == target) widget = widget.parentNode;
		var fragment = document.createFragment(content);
    var children = LSD.slice(fragment.childNodes);
    if (content) target.parentNode.replaceChild(fragment, target);
    widget.fireEvent('DOMNodeInserted', [children]);
  }
});
/*
---
 
script: Submit.js
 
description: Does a request or navigates url to the link
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action
 
provides:
  - LSD.Action.Submit
 
...
*/


LSD.Action.Submit = LSD.Action.build({
  fork: true,
  
  enable: function(target) {
    if (this.retrieve(target)) return;
    var args = Array.prototype.slice.call(arguments, 1);
    if (target.lsd && !target.submit && this.invoker != target) {
      if (target.chainPhase == -1 || (target.getCommandAction && target.getCommandAction() == 'submit')) 
        return target.callChain.apply(target, args);
    }
    var method = (target.submit || target.send || target.click);
    var submission = method.apply(target, args);
    if (submission && submission != target) {
      this.store(target, submission);
      var self = this, callback = function() {
        this.removeEvents(events);
        self.eliminate(target);
      };
      var events = { complete: callback, cancel: callback };
      submission.addEvents(events);
    }
    return submission
  },
  
  disable: function(target) {
    var submission = this.retrieve(target);
    if (submission) {
      if (submission !== true && submission.running) submission.cancel();
      this.eliminate(target);
    } else {
      if (target.cancel) return target.cancel.apply(target, Array.prototype.slice.call(arguments, 1));
    }
  },
  
  getState: function(target) {
    var submission = this.retrieve(target);
    return !submission || !(submission !== true || submission.running);
  }
});
/*
---
 
script: State.js
 
description: Changes the state of a widget
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action
 
provides:
  - LSD.Action.State
 
...
*/

LSD.Action.State = LSD.Action.build({
  enable: function(target, name) {
    target.addClass(name);
  },
  
  disable: function(target, name) {
    target.removeClass(name);
  },
  
  getState: function(target, name, state) {
    return !((state !== true && state !== false) ? target.hasClass(name) : state);
  }
});
/*
---
 
script: Set.js
 
description: Changes or synchronizes values
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action

provides:
  - LSD.Action.Set
 
...
*/

LSD.Action.Set = LSD.Action.build({
  enable: function(target, value) {
    switch (Element.get(target, 'tag')) {
      case 'input': case 'textarea':
        if (target.applyValue) target.applyValue(value);
        else target.value = value; break;
      default: 
        if (!target.lsd) target.set('html', value); break;
    }
  }
});
/*
---
 
script: Display.js
 
description: Shows or hides things
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action
 
provides:
  - LSD.Action.Display
 
...
*/

LSD.Action.Display = LSD.Action.build({
  enable: function(target) {
    if (target.show) target.show();
    else if (target.setStyle) {
      target.setStyle('display', target.retrieve('style:display') || 'inherit');
      target.removeAttribute('hidden');
    }
  },
  
  disable: function(target) {
    if (target.hide) target.hide();
    else if (target.setStyle) {
      target.store('style:display', target.getStyle('display'));
      target.setStyle('display', 'none');
      target.setAttribute('hidden', 'hidden');
    }
  },
  
  getState: function(target) {
    var element = (target.element || target);
    return target.hidden || (target.getAttribute && target.getAttribute('hidden')) || (element.getStyle && (element.getStyle('display') == 'none'));
  }
});
/*
---
 
script: Dialog.js
 
description: Shows a dialog
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action
 
provides:
  - LSD.Action.Dialog
 
...
*/


LSD.Action.Dialog = LSD.Action.build({
  priority: 50,
  
  enable: function(target) {
    var args = Array.link(Array.prototype.slice(arguments, 1), 
      {content: String.type, data: Object.type, interpolate: Function.type});
    if (target.element) {
      var dialog = target;
      target = target.element;
    } else var dialog = this.retrieve(target);
    if (dialog && dialog.layout.interpolated) {
      dialog.destroy();
      dialog = null;
    }
    if (!dialog) {
      var invoker = this.invoker, options = {
        tag: 'body',
        attributes: {
          type: 'dialog'
        },
        interpolate: LSD.Interpolation.from(args.data, invoker.dataset, args.callback),
        document: this.getDocument(),
        invoker: this.invoker
      };
      if (!target.indexOf) {
        if (target.hasClass('singlethon')) options.clone = false;
        var element = target;
      } else options.attributes.kind = target;
      var dialog = $dialog = new LSD.Widget(options, element);
    }
    if (args.content) dialog.write(content);
    dialog.show();
    this.store(target, dialog);
    return false;
  },
  
  disable: function(target) {
    var dialog = this.retrieve(target);
    if (dialog) dialog.hide();
  }
});
/*
---
 
script: Check.js
 
description: Changes the state of a widget
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action
 
provides:
  - LSD.Action.Check
 
...
*/


LSD.Action.Check = LSD.Action.build({
  enable: function(target) {
    if (!target || target == this.invoker || target.element == this.invoker) return;
    if (!target.checked) (target.check || target.click).apply(target, Array.prototype.slice.call(arguments, 1));
  },
  
  disable: function(target) {
    if (!target || target == this.invoker || target.element == this.invoker) return;
    if (target.checked) (target.uncheck || target.click).apply(target, Array.prototype.slice.call(arguments, 1));
  },
  
  getState: function(target, name, state) {
    return (state !== true && state !== false) ? this.invoker.checked : !state;
  }
});
/*
---
 
script: Clone.js
 
description: Clones an element and inserts it back to parent again
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action
 
provides:
  - LSD.Action.Clone
 
...
*/


LSD.Action.Clone = LSD.Action.build({
  enable: function(target) {
    var widget = LSD.Module.DOM.find(target);
    if (widget == target) var element = widget.element, parent = widget.parentNode;
    else var element = target, parent = widget;
    var clone = this.root.layout.render(element, parent, 'clone');
    (clone.toElement ? clone.toElement() : clone).inject(target, 'after');
  }
});
/*
---
 
script: Append.js
 
description: Append some content to widget
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action

provides:
  - LSD.Action.Append

...
*/

LSD.Action.Append = LSD.Action.build({
  enable: function(target, content) {
    var widget = LSD.Module.DOM.find(target);
    var fragment = document.createFragment(content);
    var children = LSD.slice(fragment.childNodes);
    document.id(target).appendChild(fragment);
    widget.fireEvent('DOMNodeInserted', [children]);
  }
});
/*
---
 
script: History.js
 
description: History Action Management.
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action
  - History/History
 
provides:
  - LSD.Action.History
 
...
*/

LSD.Action.History = LSD.Action.build({
  enable: function(target, content) {
    var url = target.getAttribute('src')|| target.getAttribute('action') || target.getAttribute('href');
    History[content && typeof(content) == 'string' ? content : 'push'](url);
  }
});
/*
---
 
script: Focus.js
 
description: Brings attention to element
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action
 
provides:
  - LSD.Action.Focus
 
...
*/

LSD.Action.Focus = LSD.Action.build({
  enable: function(target) {
    return (target.focus || target.click).apply(target, Array.prototype.slice(arguments, 1));
  },
  
  disable: function(target) {
    if (target.blur) return target.blur();
  }
})
/*
---

script: More.js

name: More

description: MooTools More

license: MIT-style license

authors:
  - Guillermo Rauch
  - Thomas Aylott
  - Scott Kyle

requires:
  - Core/MooTools

provides: [MooTools.More]

...
*/

MooTools.More = {
	'version': '1.3.0.1dev',
	'build': '%build%'
};

/*
---

script: Class.Binds.js

name: Class.Binds

description: Automagically binds specified methods in a class to the instance of the class.

license: MIT-style license

authors:
  - Aaron Newton

requires:
  - Core/Class
  - /MooTools.More

provides: [Class.Binds]

...
*/

Class.Mutators.Binds = function(binds){
    return binds;
};

Class.Mutators.initialize = function(initialize){
	return function(){
		Array.from(this.Binds).each(function(name){
			var original = this[name];
			if (original) this[name] = original.bind(this);
		}, this);
		return initialize.apply(this, arguments);
	};
};


/*
---

script: Class.Binds.js

description: Removes mutators added by Class.Binds that breaks multiple inheritance

license: MIT-style license

authors:
  - Aaron Newton

extends: More/Class.Binds
...
*/

//empty

delete Class.Mutators.Binds;
delete Class.Mutators.initialize;
/*
---

script: String.QueryString.js

name: String.QueryString

description: Methods for dealing with URI query strings.

license: MIT-style license

authors:
  - Sebastian Markbåge, Aaron Newton, Lennart Pilon, Valerio Proietti

requires:
  - Core/Array
  - Core/String
  - /MooTools.More

provides: [String.QueryString]

...
*/

String.implement({

	parseQueryString: function(){
		var vars = this.split(/[&;]/), res = {};
		
		if (vars.length){
			
			vars.each(function(val){
			
				var index = val.indexOf('='),
					keys = index < 0 ? [''] : val.substr(0, index).match(/[^\]\[]+/g),
					value = decodeURIComponent(val.substr(index + 1)),
					obj = res;
					
				keys.each(function(key, i){
					var current = obj[key];
					if (i < keys.length - 1){
						obj = obj[key] = current || {};
					} else if (typeOf(current) == 'array'){
						current.push(value);
					} else {
						obj[key] = current != null ? [current, value] : value;
					}
				});
			});

		}
		return res;
	},

	cleanQueryString: function(method){
		return this.split('&').filter(function(val){
			
			var index = val.indexOf('='),
				key = index < 0 ? '' : val.substr(0, index),
				value = val.substr(index + 1);
			return method ? method.run([key, value]) : (value || value === 0);
			
		}).join('&');
	}

});

/*
---

script: Object.Extras.js

name: Object.Extras

description: Extra Object generics, like getFromPath which allows a path notation to child elements.

license: MIT-style license

authors:
  - Aaron Newton

requires:
  - Core/Object
  - /MooTools.More

provides: [Object.Extras]

...
*/

Object.extend({

	getFromPath: function(source, key){

		var parts = key.split('.');
		for (var i = 0, l = parts.length; i < l; i++){
			if (source.hasOwnProperty(parts[i])) source = source[parts[i]];
			else return null;
		}
		return source;
		
	},

	cleanValues: function(object, method){
		method = method || function(obj){
			return obj != null;
		};
		for (key in object){
			if (!method(object[key])) delete object[key];
		}
		return object;
	},

	erase: function(object, key){
		if (object.hasOwnProperty(key)) delete object[key];
		return object;
	},

	run: function(object){
		var args = Array.slice(arguments, 1);
		for (key in object){
			if (typeOf(object[key]) == 'function') object[key].apply(object,  args);
		}
	}

});

/*
---

script: Locale.js

name: Locale

description: Provides methods for localization.

license: MIT-style license

authors:
  - Aaron Newton
  - Arian Stolwijk

requires:
  - Core/Events
  - /Object.Extras
  - /MooTools.More

provides: [Locale]

...
*/

(function(){

	var current = 'en-US',
	
	data = {
		'en-US': {}
	},
	
	cascades = {},

	cascadeMethods = {};
	
	['erase', 'include', 'reverse', 'sort', 'unshift', 'push', 'append', 'include'].each(function(method){
		cascadeMethods[method] = function(){
			cascades[current][method].apply(cascades[current], arguments);
		};
	});

	var Locale = this.Locale = {
		
		define: function(name, set, key, value){
			/*<1.2compat>*/
			if (name == 'cascades') return this.setCascades(current, set);
			if (set == 'cascades') return this.setCascades(name, key);
			/*</1.2compat>*/

			data[name] = data[name] || {};
			data[name][set] = data[name][set] || {};
			if (typeOf(key) == 'object'){
				data[name][set] = Object.merge(data[name][set] || {}, key);
			} else {
				data[name][set][key] = value;
			}
			
			return this;
		},
		
		setCurrent: function(name){
			if (data[name]) current = name;
			this.fireEvent('change', name)/*<1.2compat>*/.fireEvent('langChange', name)/*</1.2compat>*/;
			return this;
		},
		
		getCurrent: function(){
			return current;
		},
		
		get: function(key, args){
			var locales = this.getCascades().clone().include('en-US');
			locales.unshift(current);

			for (var i = 0; i < locales.length; i++){
				var dataSet = data[locales[i]];
				if (!dataSet) continue;

				var value = Object.getFromPath(dataSet, key);
				if (value != null) return (typeof value == 'function') ? value.apply(null, Array.from(args)) : value;
			}

			return null;
		},
		
		setCascades: function(name, value){
			cascades[name] = Array.from(value);
			return this;
		},
		
		getCascades: function(name){
			return cascades[name || current] || [];
		},
		
		cascades: function(){
			if (!cascades[current]) cascades[current] = [];
			return cascadeMethods;
		},
		
		list: function(){
			return Object.keys(data);
		}
		
	};

	Object.append(Locale, new Events());	
	
	/*<1.2compat>*/
	var lang = MooTools.lang = {};
	lang.setLanguage = Locale.setCurrent;
	lang.getCurrentLanguage = Locale.getCurrent;
	lang.set = Locale.define;
	for (var key in Locale) lang[key] = Locale[key];
	
	lang.get = function(set, key, args){
		if (key) set += '.' + key;

		return Locale.get(set, args);
	};
	/*</1.2compat>*/

})();

/*
---

script: Date.English.US.js

name: Date.English.US

description: Date messages for US English.

license: MIT-style license

authors:
  - Aaron Newton

requires:
  - /Locale

provides: [Date.English.US]

...
*/

Locale.define('en-US', 'Date', {

	months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
	days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],

	// Culture's date order: MM/DD/YYYY
	dateOrder: ['month', 'date', 'year'],
	shortDate: '%m/%d/%Y',
	shortTime: '%I:%M%p',
	AM: 'AM',
	PM: 'PM',

	// Date.Extras
	ordinal: function(dayOfMonth){
		// 1st, 2nd, 3rd, etc.
		return (dayOfMonth > 3 && dayOfMonth < 21) ? 'th' : ['th', 'st', 'nd', 'rd', 'th'][Math.min(dayOfMonth % 10, 4)];
	},

	lessThanMinuteAgo: 'less than a minute ago',
	minuteAgo: 'about a minute ago',
	minutesAgo: '{delta} minutes ago',
	hourAgo: 'about an hour ago',
	hoursAgo: 'about {delta} hours ago',
	dayAgo: '1 day ago',
	daysAgo: '{delta} days ago',
	weekAgo: '1 week ago',
	weeksAgo: '{delta} weeks ago',
	monthAgo: '1 month ago',
	monthsAgo: '{delta} months ago',
	yearAgo: '1 year ago',
	yearsAgo: '{delta} years ago',

	lessThanMinuteUntil: 'less than a minute from now',
	minuteUntil: 'about a minute from now',
	minutesUntil: '{delta} minutes from now',
	hourUntil: 'about an hour from now',
	hoursUntil: 'about {delta} hours from now',
	dayUntil: '1 day from now',
	daysUntil: '{delta} days from now',
	weekUntil: '1 week from now',
	weeksUntil: '{delta} weeks from now',
	monthUntil: '1 month from now',
	monthsUntil: '{delta} months from now',
	yearUntil: '1 year from now',
	yearsUntil: '{delta} years from now'

});

/*
---

script: Date.js

name: Date

description: Extends the Date native object to include methods useful in managing dates.

license: MIT-style license

authors:
  - Aaron Newton
  - Nicholas Barthelemy - https://svn.nbarthelemy.com/date-js/
  - Harald Kirshner - mail [at] digitarald.de; http://digitarald.de
  - Scott Kyle - scott [at] appden.com; http://appden.com

requires:
  - Core/Array
  - Core/String
  - Core/Number
  - /Locale
  - /Date.English.US
  - /MooTools.More

provides: [Date]

...
*/

(function(){

var Date = this.Date;

Date.Methods = {
	ms: 'Milliseconds',
	year: 'FullYear',
	min: 'Minutes',
	mo: 'Month',
	sec: 'Seconds',
	hr: 'Hours'
};

['Date', 'Day', 'FullYear', 'Hours', 'Milliseconds', 'Minutes', 'Month', 'Seconds', 'Time', 'TimezoneOffset',
	'Week', 'Timezone', 'GMTOffset', 'DayOfYear', 'LastMonth', 'LastDayOfMonth', 'UTCDate', 'UTCDay', 'UTCFullYear',
	'AMPM', 'Ordinal', 'UTCHours', 'UTCMilliseconds', 'UTCMinutes', 'UTCMonth', 'UTCSeconds', 'UTCMilliseconds'].each(function(method){
	Date.Methods[method.toLowerCase()] = method;
});

var pad = function(what, length){
	return new Array(length - String(what).length + 1).join('0') + what;
};

Date.implement({

	set: function(prop, value){
		switch (typeOf(prop)){
			case 'object':
				for (var p in prop) this.set(p, prop[p]);
				break;
			case 'string':
				prop = prop.toLowerCase();
				var m = Date.Methods;
				if (m[prop]) this['set' + m[prop]](value);
		}
		return this;
	},

	get: function(prop){
		prop = prop.toLowerCase();
		var m = Date.Methods;
		if (m[prop]) return this['get' + m[prop]]();
		return null;
	},

	clone: function(){
		return new Date(this.get('time'));
	},

	increment: function(interval, times){
		interval = interval || 'day';
		times = times != null ? times : 1;

		switch (interval){
			case 'year':
				return this.increment('month', times * 12);
			case 'month':
				var d = this.get('date');
				this.set('date', 1).set('mo', this.get('mo') + times);
				return this.set('date', d.min(this.get('lastdayofmonth')));
			case 'week':
				return this.increment('day', times * 7);
			case 'day':
				return this.set('date', this.get('date') + times);
		}

		if (!Date.units[interval]) throw new Error(interval + ' is not a supported interval');

		return this.set('time', this.get('time') + times * Date.units[interval]());
	},

	decrement: function(interval, times){
		return this.increment(interval, -1 * (times != null ? times : 1));
	},

	isLeapYear: function(){
		return Date.isLeapYear(this.get('year'));
	},

	clearTime: function(){
		return this.set({hr: 0, min: 0, sec: 0, ms: 0});
	},

	diff: function(date, resolution){
		if (typeOf(date) == 'string') date = Date.parse(date);
		
		return ((date - this) / Date.units[resolution || 'day'](3, 3)).toInt(); // non-leap year, 30-day month
	},

	getLastDayOfMonth: function(){
		return Date.daysInMonth(this.get('mo'), this.get('year'));
	},

	getDayOfYear: function(){
		return (Date.UTC(this.get('year'), this.get('mo'), this.get('date') + 1) 
			- Date.UTC(this.get('year'), 0, 1)) / Date.units.day();
	},

	getWeek: function(){
		return (this.get('dayofyear') / 7).ceil();
	},
	
	getOrdinal: function(day){
		return Date.getMsg('ordinal', day || this.get('date'));
	},

	getTimezone: function(){
		return this.toString()
			.replace(/^.*? ([A-Z]{3}).[0-9]{4}.*$/, '$1')
			.replace(/^.*?\(([A-Z])[a-z]+ ([A-Z])[a-z]+ ([A-Z])[a-z]+\)$/, '$1$2$3');
	},

	getGMTOffset: function(){
		var off = this.get('timezoneOffset');
		return ((off > 0) ? '-' : '+') + pad((off.abs() / 60).floor(), 2) + pad(off % 60, 2);
	},

	setAMPM: function(ampm){
		ampm = ampm.toUpperCase();
		var hr = this.get('hr');
		if (hr > 11 && ampm == 'AM') return this.decrement('hour', 12);
		else if (hr < 12 && ampm == 'PM') return this.increment('hour', 12);
		return this;
	},

	getAMPM: function(){
		return (this.get('hr') < 12) ? 'AM' : 'PM';
	},

	parse: function(str){
		this.set('time', Date.parse(str));
		return this;
	},

	isValid: function(date){
		return !!(date || this).valueOf();
	},

	format: function(f){
		if (!this.isValid()) return 'invalid date';
		f = f || '%x %X';
		f = formats[f.toLowerCase()] || f; // replace short-hand with actual format
		var d = this;
		return f.replace(/%([a-z%])/gi,
			function($0, $1){
				switch ($1){
					case 'a': return Date.getMsg('days')[d.get('day')].substr(0, 3);
					case 'A': return Date.getMsg('days')[d.get('day')];
					case 'b': return Date.getMsg('months')[d.get('month')].substr(0, 3);
					case 'B': return Date.getMsg('months')[d.get('month')];
					case 'c': return d.toString();
					case 'd': return pad(d.get('date'), 2);
					case 'e': return d.get('date');
					case 'H': return pad(d.get('hr'), 2);
					case 'I': return ((d.get('hr') % 12) || 12);
					case 'j': return pad(d.get('dayofyear'), 3);
					case 'm': return pad((d.get('mo') + 1), 2);
					case 'M': return pad(d.get('min'), 2);
					case 'o': return d.get('ordinal');
					case 'p': return Date.getMsg(d.get('ampm'));
					case 'S': return pad(d.get('seconds'), 2);
					case 'U': return pad(d.get('week'), 2);
					case 'w': return d.get('day');
					case 'x': return d.format(Date.getMsg('shortDate'));
					case 'X': return d.format(Date.getMsg('shortTime'));
					case 'y': return d.get('year').toString().substr(2);
					case 'Y': return d.get('year');
					case 'T': return d.get('GMTOffset');
					case 'Z': return d.get('Timezone');
					case 'z': return pad(d.get('ms'));
				}
				return $1;
			}
		);
	},

	toISOString: function(){
		return this.format('iso8601');
	}

});


Date.alias('toJSON', 'toISOString');
Date.alias('compare', 'diff');
Date.alias('strftime', 'format');

var formats = {
	db: '%Y-%m-%d %H:%M:%S',
	compact: '%Y%m%dT%H%M%S',
	iso8601: '%Y-%m-%dT%H:%M:%S%T',
	rfc822: '%a, %d %b %Y %H:%M:%S %Z',
	'short': '%d %b %H:%M',
	'long': '%B %d, %Y %H:%M'
};

var parsePatterns = [];
var nativeParse = Date.parse;

var parseWord = function(type, word, num){
	var ret = -1;
	var translated = Date.getMsg(type + 's');
	switch (typeOf(word)){
		case 'object':
			ret = translated[word.get(type)];
			break;
		case 'number':
			ret = translated[word];
			if (!ret) throw new Error('Invalid ' + type + ' index: ' + word);
			break;
		case 'string':
			var match = translated.filter(function(name){
				return this.test(name);
			}, new RegExp('^' + word, 'i'));
			if (!match.length)    throw new Error('Invalid ' + type + ' string');
			if (match.length > 1) throw new Error('Ambiguous ' + type);
			ret = match[0];
	}

	return (num) ? translated.indexOf(ret) : ret;
};

Date.extend({

	getMsg: function(key, args){
		return Locale.get('Date.' + key, args);
	},

	units: {
		ms: Function.from(1),
		second: Function.from(1000),
		minute: Function.from(60000),
		hour: Function.from(3600000),
		day: Function.from(86400000),
		week: Function.from(608400000),
		month: function(month, year){
			var d = new Date;
			return Date.daysInMonth(month != null ? month : d.get('mo'), year != null ? year : d.get('year')) * 86400000;
		},
		year: function(year){
			year = year || new Date().get('year');
			return Date.isLeapYear(year) ? 31622400000 : 31536000000;
		}
	},

	daysInMonth: function(month, year){
		return [31, Date.isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
	},

	isLeapYear: function(year){
		return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
	},

	parse: function(from){
		var t = typeOf(from);
		if (t == 'number') return new Date(from);
		if (t != 'string') return from;
		from = from.clean();
		if (!from.length) return null;

		var parsed;
		parsePatterns.some(function(pattern){
			var bits = pattern.re.exec(from);
			return (bits) ? (parsed = pattern.handler(bits)) : false;
		});

		return parsed || new Date(nativeParse(from));
	},

	parseDay: function(day, num){
		return parseWord('day', day, num);
	},

	parseMonth: function(month, num){
		return parseWord('month', month, num);
	},

	parseUTC: function(value){
		var localDate = new Date(value);
		var utcSeconds = Date.UTC(
			localDate.get('year'),
			localDate.get('mo'),
			localDate.get('date'),
			localDate.get('hr'),
			localDate.get('min'),
			localDate.get('sec'),
			localDate.get('ms')
		);
		return new Date(utcSeconds);
	},

	orderIndex: function(unit){
		return Date.getMsg('dateOrder').indexOf(unit) + 1;
	},

	defineFormat: function(name, format){
		formats[name] = format;
	},

	defineFormats: function(formats){
		for (var name in formats) Date.defineFormat(name, formats[name]);
	},

//<1.2compat>
	parsePatterns: parsePatterns, // this is deprecated
//</1.2compat>
	
	defineParser: function(pattern){
		parsePatterns.push((pattern.re && pattern.handler) ? pattern : build(pattern));
	},
	
	defineParsers: function(){
		Array.flatten(arguments).each(Date.defineParser);
	},
	
	define2DigitYearStart: function(year){
		startYear = year % 100;
		startCentury = year - startYear;
	}

});

var startCentury = 1900;
var startYear = 70;

var regexOf = function(type){
	return new RegExp('(?:' + Date.getMsg(type).map(function(name){
		return name.substr(0, 3);
	}).join('|') + ')[a-z]*');
};

var replacers = function(key){
	switch(key){
		case 'x': // iso8601 covers yyyy-mm-dd, so just check if month is first
			return ((Date.orderIndex('month') == 1) ? '%m[.-/]%d' : '%d[.-/]%m') + '([.-/]%y)?';
		case 'X':
			return '%H([.:]%M)?([.:]%S([.:]%s)?)? ?%p? ?%T?';
	}
	return null;
};

var keys = {
	d: /[0-2]?[0-9]|3[01]/,
	H: /[01]?[0-9]|2[0-3]/,
	I: /0?[1-9]|1[0-2]/,
	M: /[0-5]?\d/,
	s: /\d+/,
	o: /[a-z]*/,
	p: /[ap]\.?m\.?/,
	y: /\d{2}|\d{4}/,
	Y: /\d{4}/,
	T: /Z|[+-]\d{2}(?::?\d{2})?/
};

keys.m = keys.I;
keys.S = keys.M;

var currentLanguage;

var recompile = function(language){
	currentLanguage = language;
	
	keys.a = keys.A = regexOf('days');
	keys.b = keys.B = regexOf('months');
	
	parsePatterns.each(function(pattern, i){
		if (pattern.format) parsePatterns[i] = build(pattern.format);
	});
};

var build = function(format){
	if (!currentLanguage) return {format: format};
	
	var parsed = [];
	var re = (format.source || format) // allow format to be regex
	 .replace(/%([a-z])/gi,
		function($0, $1){
			return replacers($1) || $0;
		}
	).replace(/\((?!\?)/g, '(?:') // make all groups non-capturing
	 .replace(/ (?!\?|\*)/g, ',? ') // be forgiving with spaces and commas
	 .replace(/%([a-z%])/gi,
		function($0, $1){
			var p = keys[$1];
			if (!p) return $1;
			parsed.push($1);
			return '(' + p.source + ')';
		}
	).replace(/\[a-z\]/gi, '[a-z\\u00c0-\\uffff]'); // handle unicode words

	return {
		format: format,
		re: new RegExp('^' + re + '$', 'i'),
		handler: function(bits){
			bits = bits.slice(1).associate(parsed);
			var date = new Date().clearTime();
			['d', 'm', 'b', 'B'].each(function(letter){
				if (letter in bits) handle.call(date, letter, 1);
			});
			for (var key in bits) handle.call(date, key, bits[key]);
			return date;
		}
	};
};

var handle = function(key, value){
	if (!value) return this;

	switch(key){
		case 'a': case 'A': return this.set('day', Date.parseDay(value, true));
		case 'b': case 'B': return this.set('mo', Date.parseMonth(value, true));
		case 'd': return this.set('date', value);
		case 'H': case 'I': return this.set('hr', value);
		case 'm': return this.set('mo', value - 1);
		case 'M': return this.set('min', value);
		case 'p': return this.set('ampm', value.replace(/\./g, ''));
		case 'S': return this.set('sec', value);
		case 's': return this.set('ms', ('0.' + value) * 1000);
		case 'w': return this.set('day', value);
		case 'Y': return this.set('year', value);
		case 'y':
			value = +value;
			if (value < 100) value += startCentury + (value < startYear ? 100 : 0);
			return this.set('year', value);
		case 'T':
			if (value == 'Z') value = '+00';
			var offset = value.match(/([+-])(\d{2}):?(\d{2})?/);
			offset = (offset[1] + '1') * (offset[2] * 60 + (+offset[3] || 0)) + this.getTimezoneOffset();
			return this.set('time', this - offset * 60000);
	}

	return this;
};

Date.defineParsers(
	'%Y([-./]%m([-./]%d((T| )%X)?)?)?', // "1999-12-31", "1999-12-31 11:59pm", "1999-12-31 23:59:59", ISO8601
	'%Y%m%d(T%H(%M%S?)?)?', // "19991231", "19991231T1159", compact
	'%x( %X)?', // "12/31", "12.31.99", "12-31-1999", "12/31/2008 11:59 PM"
	'%d%o( %b( %Y)?)?( %X)?', // "31st", "31st December", "31 Dec 1999", "31 Dec 1999 11:59pm"
	'%b( %d%o)?( %Y)?( %X)?', // Same as above with month and day switched
	'%Y %b( %d%o( %X)?)?', // Same as above with year coming first
	'%o %b %d %X %T %Y' // "Thu Oct 22 08:11:23 +0000 2009"
);

Locale.addEvent('change', function(language){
	if (Locale.get('Date')) recompile(language);
}).fireEvent('change', Locale.getCurrent());

})();

/*
---
 
script: Type.js
 
description: A base class for all class pools
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Behavior
  - More/Object.Extras
  
provides:
  - LSD.Type
  - LSD.Module
  - LSD.Trait
  - LSD.Mixin
  - LSD.Element
  - LSD.Native
  
...
*/

LSD.Type = function(name, namespace) {
  this.name = name;
  this.namespace = namespace || 'LSD';
  var holder = Object.getFromPath(window, this.namespace);
  if (this.storage = holder[name]) {
    
    for (var key in this) {
      this.storage[key] = (this[key].call) ? this[key].bind(this) : this[key];
    }
  }
  else this.storage = (holder[name] = this);
  if (typeOf(this.storage) == 'class') this.klass = this.storage;
  this.pool = [this.storage];
  this.queries = {};
};

LSD.Type.prototype = {
  each: function(callback, bind) {
    for (var name in this.storage) {
      var value = this.storage[name];
      if (value && value.$family && value.$family() == 'class') callback.call(bind || this, value, name)
    }
  },
  
  find: function(name) {
    if (name.push) {
      for (; name.length; name.pop()) {
        var found = this.find(name.join('-'));
        if (found) return found;
      }
      return false;
    }
    if (!this.queries) this.queries = {};
    else if (this.queries[name] != null) return this.queries[name];
    name = LSD.toClassName(name);
    for (var i = 0, storage; storage = this.pool[i++];) {
      var result = Object.getFromPath(storage, name);
      if (result) return (this.queries[name] = result);
    }
    return (this.queries[name] = false);
  },
  
  create: function(element, options) {
    return new LSD.Widget(element, options)
  },
  
  use: function(element, options, parent) {
    if (parent) var mutation = LSD.Layout.mutate(element, parent);
    options = mutation && options ? Object.merge(mutation, options) : mutation || options;
    options.context = LSD.toLowerCase(this.name);
    return this.convert(element, options);
  },
  
  convert: function(element, options) {
    var source = (options && options.source) || LSD.Layout.getSource(element);
    if (!this.find(source)) return;
    var klass = this.klass || LSD.Widget;
    return new LSD.Widget(element, options);
  }
}
// must-have stuff for all widgets 
new LSD.Type('Module');
// some widgets may use those
new LSD.Type('Trait');
// these may be applied in runtime
new LSD.Type('Mixin');
// a widget holder
new LSD.Type('Element');
// native browser controls
new LSD.Type('Native');

// Inject native widgets into default widget pool as a fallback
LSD.Element.pool[LSD.useNative ? 'unshift' : 'push'](LSD.Native);
/*
---
 
script: Fieldset.js
 
description: Wrapper around set of form fields
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Mixin
 
provides: 
  - LSD.Mixin.Fieldset
 
...
*/
!function() {
  
LSD.Mixin.Fieldset = new Class({
  options: {
    has: {
      many: {
        elements: {
          selector: ':form-associated',
          scopes: {
            submittable: {
              filter: '[name]:valued'
            }
          },
          callbacks: {
            'add': 'addField',
            'remove': 'removeField'
          }
        }
      }
    },
    expects: {
      ':form': function(widget, state) {
        widget[state ? 'addRelation' : 'removeRelation']('elements', {as: 'form'})
      }
    }
  },
  
  initializers: {
    fieldset: function() {
      this.names = {};
      this.params = {};
      return {
        events: {
          request: {
            request: 'validateFields',
            badRequest: 'parseFieldErrors'
          },
          self: {
            mutateLayout: function(query) {
              var element = query.element, name = element.name, id = element.id, mutation;
              var widget = Element.retrieve(element, 'widget');
              if (!widget) return;
              if (name && this.names[name]) {
                var bumped = Fieldset.bumpName(name);
                if (bumped) (mutation || (mutation = {attributes: {}})).attributes.name = bumped;
              }
              // bump id index
              if (id) {
                bumped = Fieldset.bumpId(id);
                if (bumped != id) (mutation || (mutation = {attributes: {}})).attributes.id = bumped;
              }
              // bump name index
              if (LSD.toLowerCase(element.tagName) == 'label') {
                var four = element.htmlFor
                if (four) {
                  bumped = Fieldset.bumpId(four);
                  if (bumped != four) (mutation || (mutation = {attributes: {}})).attributes['for'] = bumped;
                }
              }
              if (query.mutation) Object.append(query.mutation, mutation);
              else query.mutation = mutation;
            }
          }
        }
      }
    }
  },
  
  checkValidity: function() {
    var valid = true;
    for (var i = 0, element; element = this.elements[i++];) if (!element.checkValidity()) valid = false;
    return valid;
  },
  
  getData: function() {
    var data = {}
    for (var name in this.names) {
      var memo = this.names[name];
      if (memo.push) {
        for (var i = 0, radio; radio = memo[i++];) if (radio.checked) data[name] = radio.toData(); break;
      } else {
        var value = memo.toData();
        if (value != null) data[name] = value;
      }
    }
    return data;
  },

  getRequestData: function() {
    return this.getData();
  },
  
  reset: function() {
    
  },
  
  addFieldErrors: function(errors) {
    for (var name in errors) {
      var field = this.names[name];
      if (!field) continue;
      field.invalidate(errors[name]);
      this.invalid = true;
    }
  },

  parseFieldErrors: function(response) {
    var result = {}, errors = response.errors;
    if (errors) { //rootless response ({errors: {}), old rails
      for (var i = 0, error; error = errors[i++];)
        result[Fieldset.getName(this.getModelName(error[0]), error[0])] = error[1];
    } else { //rooted response (publication: {errors: {}}), new rails
      var regex = Fieldset.rPrefixAppender;
      for (var model in response) {
        var value = response[model], errors = value.errors;
        if (!errors) continue;
        for (var i = 0, error; error = errors[i++];)
          result[Fieldset.getName(model, error[0])] = error[1];
      }
    }
    if (Object.getLength(result) > 0) this.addFieldErrors(result);
  },
  
  addField: function(widget) {
    var name = widget.attributes.name, radio = (widget.commandType == 'radio');
    if (!name) return;
    if (radio) {
      if (!this.names[name]) this.names[name] = [];
      this.names[name].push(widget);
    } else this.names[name] = widget;
    for (var regex = Fieldset.rNameParser, object = this.params, match, bit;;) {
      match = regex.exec(name)
      if (bit != null) {
        if (!match) {
          if (!object[bit] && radio) object[bit] = [];
          if (object[bit] && object[bit].push) object[bit].push(widget);
          else object[bit] = widget;
        } else object = object[bit] || (object[bit] = (bit ? {} : []));
      }
      if (!match) break;
      else bit = match[1] ||match[2];
    }
    return object
  },
  
  getParams: function(object) {
    if (!object) object = this.params;
    var result = {};
    for (var name in object) {
      var value = object[name];
      if (value && !value.indexOf) value = value.nodeType ? value.getValue() : this.getParams(value);
      result[name] = value;
    }
    return result;
  },
  
  removeField: function(widget) {
    var name = widget.attributes.name, radio = (widget.commandType == 'radio');
    if (!name) return;
    if (radio) this.names[name].erase(widget);
    else delete this.names[name];
    for (var regex = Fieldset.rNameParser, object = this.params, match, bit;;) {
      match = regex.exec(name)
      if (bit != null) {
        if (!match) {
          if (radio) object[bit].erase(widget)
          else delete object[bit];
        } else object = object[bit];
      }
      if (!match) break;
      else bit = match[1] ||match[2];
    }
    return object
  },

  invalidateFields: function(errors) {
    this.getFields(errors, function(field, error) {
      field.invalidate(error);
    });
  },
  
  getFieldsByName: function(fields, callback, root) {
    if (fields.call && (callback = fields)) fields = null;
    if (!fields) fields = this.elements;
    if (!callback && fields.indexOf) return root[fields]
    if (fields.map && fields.each && (!callback || !root)) return fields.map(function(field) {
      return this.getFieldsByName(field, callback, root)
    }.bind(this));
  },
  
  validateFields: function(fields) {
    if (!this.invalid) return;
    this.elements.each(function(field) {
      if (field.invalid) field.validate(true);
    });
  },

  getModelName: Macro.getter('modelName', function() {
    for (var name in this.params) if (!this.params[name].nodeType) return name;
  })
});

var Fieldset = Object.append(LSD.Mixin.Fieldset, {
  rNameIndexBumper: /(\[)(\d+?)(\])/,
  rIdIndexBumper:   /(_)(\d+?)(_|$)/,
  rNameParser:      /(^[^\[]+)|\[([^\]]*)\]/g,
  rNameMultiplier:  /(?:\[\])?$/,
  rPrefixAppender:  /^[^\[]+/,
  getName: function(model, name) {
    return model + name.replace(Fieldset.rPrefixAppender, function(match) {return '[' + match + ']'});
  },
  bumpName: function(string) {
    return string.replace(Fieldset.rNameIndexBumper, function(m, a, index, b) { 
      return a + (parseInt(index) + 1) + b;
    })
  },
  bumpId: function(string) {
    return string.replace(Fieldset.rIdIndexBumper, function(m, a, index, b) { 
      return a + (parseInt(index) + 1) + b;
    })
  },
  multiplyName: function(string) {
    return string.replace(Fieldset.rNameMultiplier, '[]')
  }
});

LSD.Behavior.define(':fieldset', Fieldset);

}();
/*
---
 
script: Placeholder.js
 
description: Placeholder for form fileds.
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Mixin

 
provides:   
  - LSD.Mixin.Placeholder
 
...
*/


LSD.Mixin.Placeholder = new Class({
  
  options: {
    actions: {
      placeholder: {
        enable: function(){
          this.element.set('autocomplete', 'off');
          this.onPlacehold();
        },
        disable: function(){
          this.onUnplacehold();
        }
      }
    },
    events: {
      enabled: {
        element: {
          'focus': 'onUnplacehold',
          'blur': 'onPlacehold',
          'keypress': 'onUnplacehold'
        }
      }
    },
    states: {
      placeheld: {
        enabler: 'placehold',
        disabler: 'unplacehold'
      }
    }
  },
  
  getPlaceholder: Macro.getter('placeholder', function(){
    return this.attributes.placeholder;
  }),
  
  onUnplacehold: function(){
    if (this.placeheld){
      this.applyValue('');
      this.unplacehold();
      return true;
    };
  },
  
  onPlacehold: function(){
    var value = this.getRawValue();
    if (!value || value.match(/^\s*$/) || value == this.getPlaceholder()){
      this.applyValue(this.getPlaceholder());
      this.placehold();
      return true;
    };
  }
  
});

LSD.Behavior.define('[placeholder]', LSD.Mixin.Placeholder);
/*
---
 
script: Validity.js
 
description: Validates widgets against preset rules
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
references:
  - http://www.w3.org/TR/html5/association-of-controls-and-forms.html#constraints
 
requires:
  - LSD.Mixin
 
provides: 
  - LSD.Mixin.Validity
...
*/

/* 
  There is a slight difference between this and a w3c spec.
  Spec states that as a result of a validation, there should
  be a .validity object on widget that holds all possible
  validation errors as keys and true or false as values. 
  
  Our .validity object doesnt not contain validations that
  passed successfuly and only holds errors. This gets it
  closer to ActiveRecord's validation system.
*/
   

!function() {

LSD.Mixin.Validity = new Class({
  initialize: function() {
    this.parent.apply(this, arguments);
    this.addClass(this.attributes.required ? 'required' : 'optional');
  },
  
  checkValidity: function() {
    var validity = this.validity = {};
    var value = this.getValue();
    for (attribute in Attributes) {
      var constraint = this.attributes[attribute]
      if (!constraint) continue;
      var result = Attributes[attribute].call(this, value, constraint)
      if (!result) continue;
      validity[result] = true;
    }
    for (var i in validity) return !this.invalidate();
    return this.validate(true);
  },
  
  validate: function(value) {
    if (value !== true && !this.checkValidity()) return false;
    this.setStateTo('valid', true);
    this.setStateTo('invalid', false);
    return true;
  },
  
  invalidate: function(value) {
    this.setStateTo('invalid', true);
    this.setStateTo('valid', false);
    return true;
  },
  
  setCustomValidity: function(validity) {
    this.validationMessage = validity;
    this.validity.customError = true;
  }
});

var Attributes = LSD.Mixin.Validity.Attributes = {
  required: function(value) {
    if (!value) return "valueMissing"
  },
  type: function(value, type) {
    if (!value.match()) return "typeMismatch"
  },
  pattern: function(value, pattern) {
    if (!value.match(pattern)) return "patternMismatch"
  },
  maxlength: function(value, length) {
    if ((value !== null) && (value.toString().length > length)) return "tooLong"
  },
  min: function(value, min) {
    if (value < min) return "rangeUnderflow"
  },
  max: function(value, max) {
    if (value > max) return "rangeOverflow"
  },
  step: function(value, step) {
    if (value % step > 0) return "stepMismatch"
  }
}

LSD.Behavior.define('[name], :value', LSD.Mixin.Validity);

}();
/*
---
 
script: Value.js
 
description: Add your widget have a real form value.
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Mixin
 
provides: 
  - LSD.Mixin.Value
 
...
*/

LSD.Mixin.Value = new Class({
  options: {
    events: {
      change: 'callChain'
    },
    actions: {
      value: {
        enable: function() {
          if (this.attributes.multiple) this.values = [];
          if (this.getValue() != null) return;
          var raw = this.getRawValue();
          if (raw != null) this.setValue(raw);
        },
        disable: function() {
          
        }
      }
    }
  },
  
  setValue: function(item, unset) {
    if (item == null || (item.event && item.type)) item = this.getRawValue();
    else if (item.getValue) item = item.getValue();
    
    var value = this.processValue(item), result = false;
    if (this.isValueDifferent(value) ^ (!!unset)) {
      result = this.writeValue(value, unset);
      this.onChange(value, this.getPreviousValue());
    }
    return result
  },
  
  unsetValue: function(item) {
    return this.setValue(item, true)
  },
  
  isValueDifferent: function(value) {
    if (this.attributes.multiple) {
      return this.values.indexOf(value) == -1
    } else {
      return this.value != value;
    }
  },
  
  canElementHoldValue: function() {
    var tag = LSD.toLowerCase(this.element.tagName)
    return (!this.attributes.multiple && this.attributes.type != 'file' 
      && (tag == 'input' || tag == 'textarea')) 
  },
  
  getValueInput: function() {
    if (this.canElementHoldValue()) return this.element;
    var name = this.attributes.name;
    if (this.attributes.miltiple) name += '[]';
    return new Element('input[type=hidden]', {name: name}).inject(this.element);
  },
  
  writeValue: function(value, unset) {
    if (this.attributes.multiple) {
      if (unset) {
        var index = this.values.indexOf(value);
        if (index > -1) {
          this.values.splice(index, 1);
          this.valueInputs.splice(index, 1)[0].dispose();
        }
      } else {  
        this.previousValue = this.values.clone();
        this.values.push(value);
        (this.valueInputs || (this.valueInputs = [])).push(this.getValueInput().set('value', value));
        this.applyValue(this.values);
      }
      if (this.values.length == +!unset) this[unset ? 'removePseudo' : 'addPseudo']('valued');
    } else {
      var input = this.valueInput || (this.valueInput = this.getValueInput());
      this.previousValue = this.value;
      if (unset) {
        if (this.value) this.removePseudo('valued');
        delete this.value;
      } else {
        if (!this.value) this.addPseudo('valued');
        this.value = value;
      }
      input.set('value', unset ? '' : value);
      this.applyValue(this.value);
    }
  },
  
  getPreviousValue: function() {
    return this.previousValue
  },
  
  applyValue: function(value) {
    return this;
  },
  
  getRawValue: function() {
    return this.attributes.value || LSD.Module.DOM.getID(this) || this.innerText;
  },

  getValue: function() {
    if (this.attributes.multiple) {
      return this.values.map(this.formatValue, this)
    } else {
      return this.formatValue(this.value);
    }
  },
  
  toData: function() {
    if ((this.commandType != 'checkbox' || this.commandType != 'radio') || this.checked) return this.getValue()
  },
  
  getData: function() {
    var data = {};
    if (this.attributes.name) data[this.attributes.name] = this.toData();
    return data;
  },

  formatValue: function(value) {
    return value;
  },
  
  processValue: function(value) {
    return value;
  },
  
  onChange: function() {
    if (this.isValueChangable()) this.fireEvent('change', arguments)
    return true;
  },
  
  isValueChangable: function() {
    return this.commandType != 'radio';
  }
});

LSD.Behavior.define(':form-associated, :value', LSD.Mixin.Value);
/*
---
 
script: ContentEditable.js
 
description: Animated ways to show/hide widget
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Mixin
  
uses:
  - CKEDITOR
 
provides: 
  - LSD.Mixin.ContentEditable
...
*/

LSD.Mixin.ContentEditable = new Class({
  options: {
    ckeditor: {
      toolbarCanCollapse: false,
      linkShowAdvancedTab: false,
      linkShowTargetTab: false,
      invisibility: true,
      skin: 'ias',
      toolbar: [['Bold', 'Italic', 'Strike', '-', 'Link', 'Unlink', '-', 'NumberedList', 'BulletedList', '-', 'Indent', 'Outdent', '-','Styles', '-', 'PasteFromWord', 'RemoveFormat']],
      removeFormatTags: 'dialog,img,input,textarea,b,big,code,del,dfn,em,font,i,ins,kbd,q,samp,small,span,strike,strong,sub,sup,tt,u,var,iframe',
      removeFormatAttributes: 'id,class,style,lang,width,height,align,hspace,valign',
      contentsCss: '/stylesheets/layout/application/iframe.css',
      extraPlugins: 'autogrow',
      customConfig: false,
      language: 'en',
      removePlugins: 'bidi,dialogadvtab,liststyle,about,elementspath,blockquote,popup,undo,colorbutton,colordialog,div,entities,filebrowser,find,flash,font,format,forms,horizontalrule,image,justify,keystrokes,maximize,newpage,pagebreak,preview,print,resize,save,scayt,smiley,showblocks,showborders,sourcearea,style,table,tabletools,specialchar,templates,wsc,a11yhelp,a11yhelp',
      stylesSet: [
        { name : 'Paragraph', element : 'p' },
      	{ name : 'Heading 1', element : 'h1' },
      	{ name : 'Heading 2', element : 'h2' }
      ]
    }
  },
  
  getEditor: Macro.getter('editor', function() {
    use('CKEDITOR', function(CKEDITOR) {
      var value = this.getValueForEditor()
      var editor = this.editor = new CKEDITOR.editor( this.options.ckeditor, this.getEditedElement(), 1, value);
    
      editor.on('focus', function() {
        if (this.editor) this.getEditorContainer().addClass('focus');
      }.bind(this));
      editor.on('blur', function() {
        if (this.editor) this.getEditorContainer().removeClass('focus');
      }.bind(this));
      editor.on('contentDom', function() {
        this.showEditor();
        this.fireEvent('editorReady');
      
        !function() {
        
          if (Browser.firefox) {
            var body = this.getEditorBody()
            body.contentEditable = false;
            body.contentEditable = true;
        }
        this.editor.focus();
        this.editor.forceNextSelectionCheck();
        this.editor.focus();
      
        }.delay(100, this)
      }.bind(this));
    }.bind(this))
  }),
  
  getValueForEditor: function() {
    var element = this.getEditedElement();
    switch (element.get('tag')) {
      case "input": case "textarea":
        return element.get('value');
      default:
        return element.innerHTML;
    }
  },
  
  showEditor: function() {
    this.element.setStyle('display', 'none');
    this.getEditorContainer().setStyle('visibility', 'visible');
  },
  
  hideEditor: function() {
    this.element.setStyle('display', '');
    this.getEditorContainer().setStyle('visibility', 'hidden');
  },
  
  useEditor: function(callback) {
    if (this.editor && this.editor.document) callback.call(this.editor);
    this.addEvent('editorReady:once', callback);
    this.getEditor();
  },
  
  getEditorContainer: function() {
    return $(this.editor.container.$);
  },
  
  getEditorBody: function() {
    return this.editor.document.$.body;
  },
  
  getEditedElement: function() {
    return this.element;
  }
});

LSD.Behavior.define('[contenteditable=editor]', LSD.Mixin.ContentEditable);
/*
---
 
script: Target.js
 
description: Functions to fetch and parse target into action chains
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Mixin

provides: 
  - LSD.Mixin.Target

...
*/

!function() {
  var cache = {};
  LSD.Mixin.Target = new Class({
    options: {
      chain: {
        target: function() {
          if (!this.attributes.target) return;
          return this.parseTargetSelector(this.attributes.target).map(function(chain) {
            if (!chain.action) chain.action = this.getTargetAction(); 
            if (!chain.action) return;
            if (chain.selector) chain.target = this.getElement(chain.selector);
            return chain;
          }.bind(this));
        }
      }
    },
  
    parseTargetSelector: function(selector) {
      if (cache[selector]) return cache[selector]
      return cache[selector] = Parser.exec.apply(Parser, arguments)
    },

    getTargetAction: function() {
      return this.attributes.interaction || this.captureEvent('getTargetAction', arguments);
    }
  });
  
  
  var Parser = LSD.Mixin.Target.Parser = {
    build: function(expression, start, end, keyword) {      
      var last = expression[end - start - 1];
      if (!last.classes && !last.attributes && last.tag == '*' && !last.id && last.pseudos[0].type == 'class') {
        var actions = last.pseudos
        end--;
      };
      var built = (start < end) ? {selector: Parser.slice(expression, start, end)} : {}
      if (actions) return actions.map(function(pseudo, i) {
        var object = Object.append({action: pseudo.key}, built);
        var action = LSD.Action[LSD.toClassName(pseudo.key)];
        var priority = action && action.prototype.options && action.prototype.options.priority;
        if (priority != null) object.priority = priority;
        if (pseudo.value) object.arguments = pseudo.value;
        if (keyword) object.keyword = keyword;
        return object;
      }); else return built;
    },
    
    slice: function(expressions, start, end) {
      return {
        Slick: true,
        expressions: [expressions.slice(start, end)]
      };
    },
    
    exec: function(selector) {
      var parsed = selector.Slick ? selector : Slick.parse(selector), expressions = [];
      for (var i = 0, expression; expression = parsed.expressions[i]; i++) {
        var started = 0;
        var first = expression[0];
        var keyword = Keywords[first.tag] ? first.tag : null; 
        var exp = Parser.build(expression, started, expression.length, keyword);
        expressions.push[exp.push ? 'apply' : 'call'](expressions, exp);
      }
      return expressions;
    }
  };
  
  var Keywords = Parser.Keywords = Array.fast('if', 'then', 'else', 'or', 'and', 'before');
}();

LSD.Behavior.define('[target]', LSD.Mixin.Target);
/*
---
 
script: Root.js
 
description: The topmost widget easily accessible.
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Mixin
  - LSD.Behavior
 
provides: 
  - LSD.Mixin.Root
 
...
*/

LSD.Mixin.Root = new Class({
  options: {
    events: {
      _root: {
        nodeInserted: function(node) {
          node.root = this;
          node.fireEvent('setRoot', this);
        },
        nodeRemoved: function(node) {
          if (node.root == this) {
            node.fireEvent('unsetRoot', this);
            delete node.root;
          }
        }
      }
    }
  }
});

LSD.Behavior.define(':root', LSD.Mixin.Root);
/*
---
 
script: Allocations.js
 
description: Spares a few temporal widgets or elements
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module

provides:
  - LSD.Module.Allocations
 
...
*/

LSD.Module.Allocations = new Class({
  initializers: {
    allocations: function() {
      this.allocations = {};
    }
  },
  
  require: function(type, name) {
    var allocation = LSD.Allocations[type];
    if (allocation) {
      if (allocation.multiple) {
        var group = this.allocated[type] || (this.allocated[type] = {});
        if (group[name]) return group[name];
      } else {
        if (this.allocated[type]) return this.allocated[type];
      }
      this.allocate
    }
  },
  
  allocate: function(type, name) {
    var allocation = LSD.Allocations[type], allocations = this.allocations;
    if (!allocation) return;
    var options = this.options.allocations && this.options.allocations[type];
    if (allocation.multiple) {
      var group = allocations[type] || (allocations[type] = {});
      if (group[name]) return group[name];
      if (options) options = options[name];
    } else {
      if (allocations[type]) return allocations[type];
    }
    return ((group || allocations)[name] = allocation.call(this, type, name, options));
  },
  
  release: function(type, name) {
    
  }
  
});

LSD.Allocations = {
  input: {
    layout: function() {
      
    }
  },
  
  dialog: {
    multiple: true,
    initialize: function(type) {
      return {
        source: 'body-dialog' + (type ? '-' + type : '')
      }
    }
  },
  
  menu: {
    selector: 'menu[type=context]',
    proxy: function(widget) {
      return widget.pseudos.item;
    },
    states: {
      set: {
        expanded: 'hidden'
      }
    }
  },
  
  scrollbar: {
    
  },
  
  editor: function(name, type) {
    return {
      options: {
        attributes: {
          name: name
        }
      },
      source: type == 'area' ? 'textarea' : ('input-' + (type || 'text'))
    }
  },
  
  submit: function() {
    return new Element('input', {
      type: 'submit',
      styles: {
        width: 1,
        height: 0,
        display: 'block',
        border: 0,
        padding: 0,
        overflow: 'hidden',
        position: 'absolute'
      },
      events: {
        click: function(e) {
          e.preventDefault()
        }
      }
    });
  }
}



/*
---
 
script: Relations.js
 
description: Define a widget associations
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module
  - LSD.Relation

provides: 
  - LSD.Module.Relations

...
*/

LSD.Module.Relations = new Class({
  initializers: {
    relations: function() {
      this.relations = {};
      this.related = {};
    }
  },
  
  addRelation: function(name, options) {
    if (!this.relations[name]) new LSD.Relation(name, this);
    return this.relations[name].setOptions(options);
  },
  
  removeRelation: function(name, options) {
    this.relations[name].setOptions(options, true);
    if (!this.relations[name].$options.length) delete this.relations[name];
  }
});

LSD.Options.relations = {
  add: 'addRelation',
  remove: 'removeRelation',
  iterate: true
};

LSD.Options.has = Object.append({
  process: function(has) {
    var one = has.one, many = has.many, relations = {};
    if (one) for (var name in one) relations[name] = one[name];
    if (many) for (var name in many) relations[name] = Object.append(many[name], {multiple: true});
    return relations;
  }
}, LSD.Options.relations);

/*
---
 
script: Actions.js
 
description: Assign functions asyncronously to any widget
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

requires:
  - LSD.Module
  - LSD.Action

provides: 
  - LSD.Module.Actions
 
...
*/

LSD.Module.Actions = new Class({
  options: {
    actions: {}
  },
  
  initializers: {
    actions: function() {
      this.actions = {}
    }
  },
  
  addAction: function() {
    this.getAction.apply(this, arguments).attach(this);
  },
  
  removeAction: function() {
    this.getAction.apply(this, arguments).detach(this);
  },
  
  getAction: function(name, action) {
    return this.actions[name] || (this.actions[name] = new (LSD.Action[LSD.capitalize(name)] || LSD.Action)(action, name))
  },
  
  getActionState: function(action, args, state, revert) {
    if (state == null) {
      if (action.options.getState) state = action.options.getState.apply(action, args);
      else state = true; //enable things by default
    }
    return !!((state && state.call ? state.apply(this, args) : state) ^ revert);
  }
});

LSD.Module.Actions.attach = function(doc) {
  LSD.Mixin.each(function(mixin, name) {
    var selector = mixin.prototype.behaviour;
    if (!selector) return;
    var attached = {};
    var watcher = function (widget, state) {
      if (state) {
        if (attached[widget.lsd]) return;
        else attached[widget.lsd] = true;
        widget.mixin(mixin, true);
      } else if (attached[widget.lsd]) {
        delete attached[widget.lsd];
        widget.unmix(mixin, true);
      }
    };
    selector.split(/\s*,\s*/).each(function(bit) {
      doc.watch(bit, watcher)
    })
  });
};

LSD.Options.actions = {
  add: 'addAction',
  remove: 'removeAction',
  iterate: true
};
/*
---
 
script: Chain.js
 
description: A dynamic state machine with a trigger
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

requires:
  - LSD.Module.Actions

provides: 
  - LSD.Module.Chain
 
...
*/

!function() {

LSD.Module.Chain = new Class({
  initializers: {
    chain: function() {
      this.chains = [];
      this.chainPhase = -1;
      this.chainPhasing = [];
    }
  },
  
  addChain: function(name, chain) {
    if (!chain.name) chain.name = name;
    this.chains.push(chain);
  },
  
  removeChain: function(name, chain) {
    this.chains.erase(chain);
  },
  
  getActionChain: function() {
    var actions = [];
    for (var i = 0, chain; chain = this.chains[i++];) {
      var action = (chain.indexOf ? this[chain] : chain).apply(this, arguments);
      if (action) actions.push[action.push ? 'apply' : 'call'](actions, action);
    }
    return actions.sort(function(a, b) {
      return (b.priority || 0) - (a.priority || 0);
    });
  },
  
  callChain: function() {
    return this.eachLink('regular', arguments, true)
  },
  
  uncallChain: function() {
    return this.eachLink('regular', arguments, false, true);
  },
  
  eachLink: function(filter, args, ahead, revert, target) {
    if (filter && filter.indexOf) filter = Iterators[filter];
    if (args != null && !args.push) args = LSD.slice(args); 
    
    var chain = this.currentChain || (this.currentChain = this.getActionChain.apply(this, args));
    if (!chain.length) return this.clearChain();
    var index = this.chainPhase;
    if (ahead) index += +ahead;
    if (ahead == 1 && index == chain.length) {
      this.clearChain();
      index = 0;
    }
    var action, phases = revert ? revert.length ? revert : this.chainPhasing : [];
    for (var link; link = chain[index]; index += (revert ? -1 : 1)) {
      action = link.action ? this.getAction(link.action) : null;
      if (filter) {
        var filtered = filter.call(this, link, chain, index);
        if (filtered == null) return phases;
        else if (filtered === false) continue;
      };
      if (action) {
        if (revert) {
          var last = phases.getLast();
          if (last && last.asynchronous && last.index < this.chainPhase) break;
          phases.pop();
          if (!phases.length) revert = true;
        }
        var result = this.execute(link, args, last ? last.state : null, last ? true : revert, index - this.chainPhase);
        args = null;
      } else if (!revert) {
        if (link.arguments) args = link.arguments;
        if (link.callback) link.callback.apply(this, args);
      }
      if (!revert) phases.push({index: index, state: result, asynchronous: result == null, action: link.action});
      if (action && result == null) break; //action is asynchronous, stop chain
    }
    if (index >= chain.length) index = chain.length - 1;
    if (index > -1) {
      this.chainPhase = index;
      if (!revert) this.chainPhasing.push.apply(this.chainPhasing, phases);
    } else this.clearChain();
    return phases;
  },
  
  clearChain: function() {
    this.chainPhase = -1;
    this.chainPhasing = [];
    delete this.currentChain;
    return this;
  },
    
  execute: function(command, args, state, revert, ahead) {
    if (command.call && (!(command = command.apply(this, args))));
    else if (command.indexOf) command = {action: command}
    if (command.arguments) {
      var cargs = command.arguments.call ? command.arguments.call(this) : command.arguments;
      args = [].concat(cargs || [], args || []);
    }
    var action = this.getAction(command.action);
    var targets = command.target;
    if (targets && targets.call && (!(targets = targets.call(this)) || (targets.length === 0))) return true;
    if (state == null && command.state != null) state = command.state;
    var promised = [], succeed = [], failed = [], self = this;
    var perform = function(target) {
      var value = self.getActionState(action, [target, targets], state, revert);
      var method = value ? 'commit' : 'revert';
      var result = action[method](target, args);
      if (result && result.callChain && (command.promise !== false)) {
        if (value) var phases = self.eachLink('success', arguments, ahead + 1);
        promised.push(result);
        // waits for completion
        var callback = function(args, state) {
          (state ? succeed : failed).push([target, args]);
          result.removeEvents(events);
          // Try to fork off execution if action lets so 
          if (state && (command.fork || action.options.fork)) {
            //if (target.getCommandAction && target.getCommandAction() == command.action)
              if (target.chainPhase == -1) target.callChain.apply(target, args);
              else target.eachLink('optional', args, true);
          };
          if (failed.length + succeed.length != promised.length) return;
          if (failed.length) self.eachLink('alternative', args, true, false, succeed);
          if (self.currentChain && self.chainPhase < self.currentChain.length - 1)
            if (succeed.length) self.eachLink('regular', args, true, false, succeed);
        }
        var events = {
          complete: function() {
            callback(arguments, true);
          },
          cancel: function() {
            self.eachLink('success', arguments, ahead + phases.length - 1, phases || true);
            self.eachLink('failure', arguments, ahead + 1);
            callback(arguments, false);
          }
        }
        // If it may fail, we should not simply wait for completion
        if (result.onFailure) {
          events.failure = events.cancel;
          events.success = events.complete;
          delete events.complete;
        }
        result.addEvents(events);
        return;
      } else if (result === false) return;
      return value;
    };
    action.invoker = this;
    var ret = (targets) ? (targets.map ? targets.map(perform) : perform(targets)) : perform(this);
    delete action.invoker;
    return typeof ret == 'array' ? ret[0] : ret;
  }
});

var Iterators = LSD.Module.Chain.Iterators = {
  regular: function(link) {
    if (!link.action) return true;
    switch (link.keyword) {
      case 'or': case 'and': return false;
      default: return true;
    }
  },
  
  optional: function(link) {
    return !link.action || link.priority == null || link.priority < 0;
  },
  
  success: function(link, chain, index) {
    if (!link.action) return false;
    if (index < chain.length - 1 && link.keyword == 'and') return true;
  },
  
  failure: function(link, chain, index) {
    if (!link.action) return false;
    switch (link.keyword) {
      case 'or': return true;
      case 'and':
        for (var i = index, other; other = chain[--i];) 
          switch (other.keyword) {
            case "or": return true;
            case "and": continue;
            default: break;
          }
        for (var i = index, other; other = chain[++i];) 
          switch (other.keyword) {
            case "or": return false;
            case "and": continue;
            default: break;
          }
    }
  },
  
  alternative: function(link, chain, index) {
    if (!link.action) return false;
    switch (link.keyword) {
      case 'else': return true;
      case 'and': case 'or': case 'then':
        for (var i = index, other; other = chain[++i];)
          switch (other.keyword) {
            case 'else': return true;
            case 'and': case 'or': continue;
            default: return;
          }
    }
  }
}

LSD.Options.chain = {
  add: 'addChain',
  remove: 'removeChain',
  iterate: true
}

}();
/*
---
 
script: Dimensions.js
 
description: Get and set dimensions of widget
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module

provides: 
  - LSD.Module.Dimensions
 
...
*/


LSD.Module.Dimensions = new Class({
  initializers: {
    dimensions: function() {
      this.size = {}
    }
  },
  
  setSize: function(size) {
    if (this.size) var old = Object.append({}, this.size)
    if (!size || !(size.height || size.width)) size = {height: this.getStyle('height'), width: this.getStyle('width')}
    if (!(this.setHeight(size.height, true) + this.setWidth(size.width, true))) return false;
    this.fireEvent('resize', [this.size, old]);
    var element = this.element, padding = this.offset.padding;
    if (size.height && this.style.expressed.height) element.style.height = size.height - padding.top - padding.bottom + 'px'
    if (size.width && this.style.expressed.width) element.style.width = size.width - padding.left - padding.right + 'px';
    return true;
  },
  
  setHeight: function(value, light) {
    value = Math.min(this.style.current.maxHeight || 1500, Math.max(this.style.current.minHeight || 0, value));
    if (this.size.height == value) return false;
    this.size.height = value;
    if (!light) this.setStyle('height', value);
    return value;
  },
    
  setWidth: function(value, light) {
    value = Math.min(this.style.current.maxWidth || 3500, Math.max(this.style.current.minWidth || 0, value));
    if (this.size.width == value) return false;
    this.size.width = value;
    if (!light) this.setStyle('width', value);
    return value;
  },
  
  getClientHeight: function() {
    var style = this.style.current, height = style.height, offset = this.offset, padding = offset.padding;
    if (!height || (height == "auto")) {
      height = this.element.clientHeight;
      var inner = offset.inner || padding;
      if (height > 0 && inner) height -= inner.top + inner.bottom;
    }
    if (height != 'auto' && padding) height += padding.top + padding.bottom;
    return height;
  },
  
  getClientWidth: function() {
    var style = this.style.current, offset = this.offset, padding = offset.padding, width = style.width;
    if (typeof width != 'number') { //auto, inherit, undefined
      var inside = offset.inside, outside = offset.outside, shape = offset.shape;
      width = this.element.clientWidth;
      if (width > 0) {
        if (shape) width -= shape.left + shape.right;
        if (inside) width -= inside.left + inside.right;
        if (outside) width -= outside.left + outside.right;
      }
    }
    if (style.display != 'block' && padding && inside) width += padding.left + padding.right;
    return width;
  },
  
  getOffsetHeight: function(height) {
    var style = this.style.current, inside = this.offset.inside, bottom = style.borderBottomWidth, top = style.borderTopWidth;
    if (!height) height =  this.getClientHeight();
    if (inside)  height += inside.top + inside.bottom;
    if (top)     height += top;
    if (bottom)  height += bottom;
    return height;
  },
  
  getOffsetWidth: function(width) {
    var style = this.style.current, inside = this.offset.inside, left = style.borderLeftWidth, right = style.borderRightWidth;
    if (!width) width =  this.getClientWidth();
    if (inside) width += inside.left + inside.right;
    if (left)   width += left;
    if (right)  width += right
    return width;
  },
  
  getLayoutHeight: function(height) {
    height = this.getOffsetHeight(height);
    if (this.offset.margin)  height += this.offset.margin.top + this.offset.margin.bottom;
    if (this.offset.outside) height += this.offset.outside.top + this.offset.outside.bottom;
    return height;
  },

  getLayoutWidth: function(width) {
    var width = this.getOffsetWidth(width), offset = this.offset, margin = offset.margin, outside = offset.outside
    if (margin)  width += margin.right + margin.left;
    if (outside) width += outside.right + outside.left;
    return width;
  }
  
});
/*
---
 
script: Shortcuts.js
 
description: Add command key listeners to the widget
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Ext/Shortcuts
  - LSD.Module
  
provides: 
  - LSD.Module.Shortcuts

...
*/
LSD.Module.Shortcuts = new Class({
  Implements: Shortcuts,
  
  addShortcut: function() {
    LSD.Module.Events.setEventsByRegister.call(this, 'shortcuts', LSD.Module.Shortcuts.events);
    return Shortcuts.prototype.addShortcut.apply(this, arguments);
  },
  
  removeShortcut: function() {
    LSD.Module.Events.setEventsByRegister.call(this, 'shortcuts', LSD.Module.Shortcuts.events);
    return Shortcuts.prototype.removeShortcut.apply(this, arguments);
  }
});

LSD.Module.Shortcuts.events = {
  focus: 'enableShortcuts',
  blur: 'disableShortcuts'
};

LSD.Options.shortcuts = {
  add: 'addShortcut',
  remove: 'removeShortcut',
  //process: 'bindEvents',
  iterate: true
};
/*
---
 
script: Options.js
 
description: A module that sets and unsets various options stuff
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module
  
provides:
  - LSD.Module.Options

...
*/

LSD.Module.Options = new Class({
  Implements: [Options],
  
  setOptions: function(options) {
    for (var name in options) LSD.Module.Options.setOption.call(this, name, options[name]);
    return this;
  },
  
  unsetOptions: function(options) {
    for (var name in options) LSD.Module.Options.setOption.call(this, name, options[name], true);
    return this;
  },
  
  construct: function(object) {
    if (!object) object = this;
    var initialized = object.$initialized = [];
    /*
      Run module initializers and keep returned values
    */
    for (var name in object.initializers) {
      var initializer = object.initializers[name];
      if (initializer) {
        var result = initializer.call(this, object.options);
        if (result) initialized.push(result);
      }
    }
    /*
      Set options returned from initializers
    */
    for (var i = 0, value; value = initialized[i++];) this.setOptions(value);
    return object.options;
  },
  
  destruct: function(object) {
    if (!object) object = this;
    var initialized = object.$initialized;
    if (initialized)
      for (var i = 0, value; value = initialized[i++];) this.unsetOptions(value);
    return object.options;
  }
});

LSD.Module.Options.setOption = function(name, value, unset, context) {
  setter = (context || LSD.Options)[name];
  if (!setter) {
    Object.merge(this.options, name, value);
    return this;
  };
  if (setter.process) {
    value = (setter.process.charAt ? this[setter.process] : setter.process).call(this, value);
  }
  if (setter.events) LSD.Module.Events.setEventsByRegister.call(this, name, !unset, setter.events);
  var mode = unset ? 'remove' : 'add', method = setter[mode];
  if (method.charAt) method = this[method];
  if (setter.iterate) {
    if (value.each) {
      var length = value.length;
      if (length != null) for (var i = 0, j = value.length; i < j; i++) method.call(this, value[i]);
      else value.each(method, this);
    } else for (var i in value) method.call(this, i, value[i])
  } else method.call(this, value);
  return this;
};

LSD.Module.Options.implement('setOption', LSD.Module.Options.setOption);

LSD.Module.Options.initialize = function(element, options) {
  // Swap arguments if they are in the wrong order
  if ((element && !element.localName) || (options && options.localName)) 
    options = [element, element = options][0];
  
  // Merge given options object into this.options
  if (options) Object.merge(this.options, options);
  
  // Collection options off initializers
  options = this.construct();
  
  // Call parent class initializer (if set)
  if (Class.hasParent(this)) this.parent(element, options);
  
  // Run callbacks for all the options set
  this.setOptions(options);
  
  // Indicate readiness to start
  this.fireEvent('boot', [options, element]);
  
  // Attach to a given element
  this.fireEvent('prepare', [options, element]);
  
  // And we're all set!
  this.fireEvent('initialize', [options, this.element]);
};
/*
---
 
script: Element.js
 
description: Turns generic widget into specific by mixing in the tag class
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module
  - LSD.Module.Options

provides: 
  - LSD.Module.Tag
 
...
*/

LSD.Module.Tag = new Class({
  options: {
    context: 'element',
    namespace: 'LSD'
  },
  
  initializers: {
    tag: function(options) {
      this.setContext(options.context)
      this.nodeType = options.nodeType;
    }
  },
  
  getSource: function(raw) {
    var source = this.options.source;
    if (source) return source;
    var attributes = this.attributes;
    if ((source = attributes.source)) return source;
    source = [this.tagName];
    var type = attributes.type;
    if (type) source.push(type);
    var kind = attributes.kind;
    if (kind) source.push(kind);
    return raw ? source : source.join('-');
  },
  
  setSource: function(source) {
    if (!source) source = this.getSource(true);
    if (this.source != source && source.length) {
      if (source) {
        var role = this.context.find(source);
        if (role && role != this.role) {
          if (this.role) this.unmix(this.role);
          this.role = role;
          this.mixin(role);
        }
      }
      this.source = source ? (source.join ? source.join('-') : source) : false; 
    }
    return this;
  },
  
  unsetSource: function(source) {
    if (source != this.source) return;
    if (this.role) this.unmix(this.role);
    delete this.source;
    delete this.role;
    return this;
  },
  
  setContext: function(name) {
    name = LSD.toClassName(name);
    if (this.context && this.context.name == name) return;
    if (this.source) {
      var source = this.source;
      this.unsetSource();
    }
    this.context = window[this.options.namespace][LSD.toClassName(name)];
    if (source) this.setSource(source);
    return this;
  },
  
  setTag: function(tag) {
    var old = this.tagName;
    if (old) {
      if (old == tag) return;
      this.unsetTag(old, true);
    }
    this.nodeName = this.tagName = tag;
    this.fireEvent('tagChanged', [this.tagName, old]);
  },
  
  unsetTag: function(tag, light) {
    if (!light) this.fireEvent('tagChanged', [null, this.tagName]);
    this.unsetSource();
    delete this.tagName;
    delete this.nodeName;
  },

  mixin: function(mixin, light) {
    if (typeof mixin == 'string') mixin = LSD.Mixin[LSD.capitalize(mixin)];
    Class.mixin(this, mixin, light);
    this.setOptions(this.construct(mixin.prototype));
    return this;
  },

  unmix: function(mixin, light) {
    if (typeof mixin == 'string') mixin = LSD.Mixin[LSD.capitalize(mixin)];
    this.unsetOptions(this.destruct(mixin.prototype));
    Class.unmix(this, mixin, light);
    return this;
  }
  
});

LSD.addEvents(LSD.Module.Tag.prototype, {
  tagChanged: function() {
    if (this.source != null) this.setSource();
  },
  initialize: function() {
    this.setSource();
  },
  beforeBuild: function() {
    if (this.source == null) this.setSource();
  }
});

Object.append(LSD.Options, {
  tag: {
    add: 'setTag',
    remove: 'unsetTag'
  },
  
  context: {
    add: 'setContext',
    remove: 'unsetContext'
  },
  
  source: {
    add: 'setSource',
    remove: 'unsetSource'
  }
});
/*
---
 
script: States.js
 
description: Define class states and methods metaprogrammatically
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Ext/States
  - LSD.Module
  
provides: 
  - LSD.Module.States

...
*/

LSD.Module.States = States;

LSD.Options.states = {
  add: 'addState',
  remove: 'removeState',
  iterate: true
};
/*
---
 
script: Element.js
 
description: Attach and detach a widget to/from element
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module

provides: 
  - LSD.Module.Element
 
...
*/

LSD.Module.Element = new Class({
  options: {
    key: 'node',
    reusable: true,
    inline: null
  },
  
  initializers: {
    element: function() {
      LSD.uid(this);
    }
  },
  
  /*
    Attaches widget to a DOM element. If a widget was
    attached to some other element, it deattaches that first
  */
  
  attach: function(element) {
    if (element) {
      if (this.element) {
        if (this.built && this.element != element) this[this.options.reusable ? 'detach' : 'destroy']();
      } else this.element = document.id(element);
    }
    if (!this.built) this.build();
    this.fireEvent('register', ['element', this.element]);
    if (this.options.key) this.element.store(this.options.key, this).fireEvent('attach', this);
    return this.element;
  },

  detach: function(element) {
    this.fireEvent('unregister', ['element', this.element]);
    if (this.options.key) this.element.eliminate(this.options.key, this).fireEvent('detach', this)
    delete this.element;
  },
  
  toElement: function(){
    if (!this.built && this.build) this.build();
    return this.element;
  },
  
  build: function() {
    var options = this.options, attrs = {element: this.element};
    this.fireEvent('beforeBuild', attrs);
    var stop = (attrs.convert === false)
    delete attrs.element, delete attrs.convert;
    var attrs = Object.merge({}, options.element, attrs);
    var tag = attrs.tag || this.getElementTag();
    delete attrs.tag;
    if (!this.element || stop) this.element = new Element(tag, attrs);
    else var element = this.element.set(attrs);
    var classes = new FastArray;
    if (this.tagName != tag) classes.push('lsd', this.tagName);
    classes.concat(this.classes);
    if (Object.getLength(classes)) this.element.className = classes.join(' ');
    if (this.attributes) 
      for (var name in this.attributes) 
        if (name != 'width' && name != 'height') {
          var value = this.attributes[name];
          if (!element || element[name] != value) this.element.setAttribute(name, value);
        }

    if (this.style) for (var property in this.style.element) this.element.setStyle(property, this.style.element[property]);
    return this.element;
  },
  
  getElementTag: function(soft) {
    var options = this.options, inline = options.inline, element = options.element;
    if (element && element.tag) return element.tag;
    if (!soft) switch (inline) {
      case null:
        return this.tagName;
      case true:
        return "span";
      case false:
        return "div"
      default:
        return inline;
    }
  },
  
  destroy: function() {
    this.fireEvent('beforeDestroy');
    this.element.destroy();
    return this;
  },
  
  $family: function() {
    return this.options.key || 'widget';
  }
});

LSD.Module.Element.events = {
  prepare: function(options, element) {
    if (element) this.attach(element);
  },
  build: function() {
    this.attach.apply(this, arguments);
  },
  destroy: function() {
    this.detach.apply(this, arguments);
  }
};

LSD.addEvents(LSD.Module.Element.prototype, LSD.Module.Element.events);
/*
---
 
script: Shape.js
 
description: Draw a widget with any SVG path you want
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires: 
  - LSD.Trait
  - ART/ART.Shape
  
provides: 
  - LSD.Module.Shape
 
...
*/

LSD.Module.Shape = new Class({
  options: {
    shape: 'rectangle'
  },
  
  getShape: Macro.getter('shape', function(name) {
    return this.setShape(name);
  }),
  
  setShape: function(name) {    
    if (!name) name = this.options.shape;
    var shape = new ART.Shape[name.camelCase().capitalize()];
    shape.name = name;
    shape.widget = this;
    if (!this.shape) this.addEvents(LSD.Module.Shape.events);
    this.shape = shape;
    return shape;
  },
  
  getCanvas: Macro.getter('canvas', function() {
    var art = new ART;
    art.toElement().inject(this.toElement(), 'top');
    return art;
  })
  
});

LSD.Module.Shape.events = {
  'render': function() {
    if (this.setSize()) this.resized = true;
  },
  'update': function() {
    delete this.resized;
  }
};
/*
---
 
script: Date.js
 
description: Work with dates like a boss
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Trait
  - More/Date

provides:
  - LSD.Trait.Date
 
...
*/

LSD.Trait.Date = new Class({
  options: {
    date: {
      interval: 'month',
      format: '%b-%d-%Y'
    }
  },
  
  setDate: function(date) {
    this.date = date;
  },
  
  formatDate: function(date) {
    return date.format(this.options.date.format)
  },
  
  getDate: function() {
    if (this.date) return this.date;
    if (this.getRawDate) {
      var raw = this.getRawDate();
      if (raw) return this.parseDate(raw);
    }
    return this.getDefaultDate();
  },
  
  getDefaultDate: function() {
    return new Date;
  },
  
  parseDate: function(date) {
    return Date.parse(date);
  },
  
  increment: function(number) {
    number = number.toInt ? number.toInt() : 1;
    this.setDate(this.getDate().increment(this.options.date.interval, number))
  },

  decrement: function(number) {
    number = number.toInt ? number.toInt() : 1;
    this.setDate(this.getDate().decrement(this.options.date.interval, number))
  }
  
});
/*
---
name : sg-regex-tools
description : A few super-handy tools for messing around with RegExp

authors   : Thomas Aylott
copyright : © 2010 Thomas Aylott
license   : MIT

provides : [combineRegExp]
...
*/
;(function(exports){

exports.combineRegExp = function(regex, group){
	if (regex.source) regex = [regex]
	
	var names = [], i, source = '', this_source
	
	for (i = 0; i < regex.length; ++i){ if (!regex[i]) continue
		this_source = regex[i].source || ''+regex[i]
		if (this_source == '|') source += '|'
		else {
			source += (group?'(':'') + this_source.replace(/\s/g,'') + (group?')':'')
			if (group) names.push(group)
		}
		if (regex[i].names)	names = names.concat(regex[i].names)
	}
	try {
		regex = new RegExp(source,'gm')
	}
	catch (e){
		throw new SyntaxError('Invalid Syntax: ' + source +'; '+ e)
	}
	// [key] → 1
	for (i = -1; i < names.length; ++i) names[names[i]] = i + 1
	// [1] → key
	regex.names = names
	return regex
}

}(typeof exports != 'undefined' ? exports : this))

/*
---
name    : SheetParser.CSS

authors   : Thomas Aylott
copyright : © 2010 Thomas Aylott
license   : MIT

provides : SheetParser.CSS
requires : combineRegExp
...
*/
;(function(exports){
	

/*<depend>*/
var UNDEF = {undefined:1}
if (!exports.SheetParser) exports.SheetParser = {}

/*<CommonJS>*/
var combineRegExp = UNDEF[typeof require]
	?	exports.combineRegExp
	:	require('./sg-regex-tools').combineRegExp
var SheetParser = exports.SheetParser
/*</CommonJS>*/

/*<debug>*/;if (UNDEF[typeof combineRegExp]) throw new Error('Missing required function: "combineRegExp"');/*</debug>*/
/*</depend>*/


var CSS = SheetParser.CSS = {version: '1.0.2 dev'}

CSS.trim = trim
function trim(str){
	// http://blog.stevenlevithan.com/archives/faster-trim-javascript
	var	str = (''+str).replace(/^\s\s*/, ''),
		ws = /\s/,
		i = str.length;
	while (ws.test(str.charAt(--i)));
	return str.slice(0, i + 1);
}

CSS.camelCase = function(string){
	return ('' + string).replace(camelCaseSearch, camelCaseReplace)
}
var camelCaseSearch = /-\D/g
function camelCaseReplace(match){
	return match.charAt(1).toUpperCase()
}

CSS.parse = function(cssText){
	var	found
	,	rule
	,	rules = {length:0}
	,	keyIndex = -1
	,	regex = this.parser
	,	names = CSS.parser.names
	,	i,r,l
	,	ruleCount
	
	rules.cssText = cssText = trim(cssText)
	
	// strip comments
	cssText = cssText.replace(CSS.comment, '');
	
	regex.lastIndex = 0
	while ((found = regex.exec(cssText))){
		// avoid an infinite loop on zero-length keys
		if (regex.lastIndex == found.index) ++ regex.lastIndex
		
		// key:value
		if (found[names._key]){
			rules[rules.length ++] = found[names._key]
			rules[found[names._key]] = found[names._value]
			rules[CSS.camelCase(found[names._key])] = found[names._value]
			continue
		}
		
		rules[rules.length++] = rule = {}
		for (i = 0, l = names.length; i < l; ++i){
			if (!(names[i-1] && found[i])) continue
			rule[names[i-1]] = trim(found[i])
		}
	}
	
	var atKey, atRule, atList, atI
	for (i = 0, l = rules.length; i < l; ++i){
		if (!rules[i]) continue
		
		if (rules[i]._style_cssText){
			rules[i].style = CSS.parse(rules[i]._style_cssText)
			delete rules[i]._style_cssText
		}
		
		// _atKey/_atValue
		if (atKey = rules[i]._atKey){
			atKey = CSS.camelCase(atKey)
			atRule = {length:0}
			rules[i][atKey] = atRule
			atRule["_source"] =
			atRule[atKey + "Text"] = rules[i]._atValue
			atList = ('' + rules[i]._atValue).split(/,\s*/)
			for (atI = 0; atI < atList.length; ++atI){
				atRule[atRule.length ++] = atList[atI]
			}
			rules[i].length = 1
			rules[i][0] = atKey
			delete rules[i]._atKey
			delete rules[i]._atValue
		}
		
		if (rules[i].style)
		for (ruleCount = -1, r = -1, rule; rule = rules[i].style[++r];){
			if (typeof rule == 'string') continue
			rules[i][r] = (rules[i].cssRules || (rules[i].cssRules = {}))[++ ruleCount]  = rule
			rules[i].cssRules.length = ruleCount + 1
			rules[i].rules = rules[i].cssRules
		}
	}
	
	return rules
}

var x = combineRegExp
var OR = '|'

;(CSS.at = x(/\s*@([-a-zA-Z0-9]+)\s+(([\w-]+)?[^;{]*)/))
.names=[         '_atKey',           '_atValue', 'name']

CSS.atRule = x([CSS.at, ';'])

;(CSS.keyValue_key = x(/([-a-zA-Z0-9]+)/))
.names=[                '_key']

;(CSS.keyValue_value_end = x(/(?:;|(?=\})|$)/))

;(CSS.notString = x(/[^"']+/))
;(CSS.stringSingle = x(/"(?:[^"]|\\")*"/))
;(CSS.stringDouble = x(/'(?:[^']|\\')*'/))
;(CSS.string = x(['(?:',CSS.stringSingle ,OR, CSS.stringDouble,')']))
;(CSS.propertyValue = x([/[^;}]+/, CSS.keyValue_value_end]))

var rRound = "(?:[^()]|\\((?:[^()]|\\((?:[^()]|\\((?:[^()]|\\([^()]*\\))*\\))*\\))*\\))"

;(CSS.keyValue_value = x(
[
	x(['((?:'
	,	CSS.stringSingle
	,	OR
	,	CSS.stringDouble
	,	OR
	,	"\\("+rRound+"*\\)"
	,	OR
	,	/[^;}()]/ // not a keyValue_value terminator
	,	')*)'
	])
,	CSS.keyValue_value_end
])).names = ['_value']

;(CSS.keyValue = x([CSS.keyValue_key ,/\s*:\s*/, CSS.keyValue_value]))

;(CSS.comment = x(/\/\*\s*((?:[^*]|\*(?!\/))*)\s*\*\//))
.names=[                   'comment']

;(CSS.selector = x(['(',/\s*(\d+%)\s*/,OR,'(?:',/[^{}'"()]|\([^)]*\)|\[[^\]]*\]/,')+',')']))
.names=[    'selectorText','keyText']

var rCurly = "(?:[^{}]|\\{(?:[^{}]|\\{(?:[^{}]|\\{(?:[^{}]|\\{[^{}]*\\})*\\})*\\})*\\})"
var rCurlyRound = "(?:[^{}()]+|\\{(?:[^{}()]+|\\{(?:[^{}()]+|\\{(?:[^{}()]+|\\{[^{}()]*\\})*\\})*\\})*\\})"

;(CSS.block = x("\\{\\s*((?:"+"\\("+rRound+"*\\)|"+rCurly+")*)\\s*\\}"))
.names=[              '_style_cssText']

CSS.selectorBlock = x([CSS.selector, CSS.block])

CSS.atBlock = x([CSS.at, CSS.block])

CSS.parser = x
(
	[	x(CSS.comment)
	,	OR
	,	x(CSS.atBlock)
	,	OR
	,	x(CSS.atRule)
	,	OR
	,	x(CSS.selectorBlock)
	,	OR
	,	x(CSS.keyValue)
	]
,	'cssText'
);


})(typeof exports != 'undefined' ? exports : this);

/*
---
name    : SheetParser.Value

authors   : Yaroslaff Fedin

license   : MIT

requires : SheetParser.CSS

provides : SheetParser.Value
...
*/


(function(exports) {
  /*<CommonJS>*/
  var combineRegExp = (typeof require == 'undefined')
    ?  exports.combineRegExp
    :  require('./sg-regex-tools').combineRegExp
  var SheetParser = exports.SheetParser
  /*</CommonJS>*/
  
  var Value = SheetParser.Value = {version: '1.0.2 dev'};
  
  Value.translate = function(value) {
    var found, result = [], matched = [], scope = result, func, text;
    var regex = Value.tokenize;
    var names = regex.names;
    while (found = regex.exec(value)) matched.push(found);
    for (var i = 0; found = matched[i++];) {
      if (func = found[names['function']]) {
        var obj = {};
        var translated = obj[found[names['function']]] = Value.translate(found[names._arguments]);
        for (var j = 0, bit; bit = translated[j]; j++) if (bit && bit.length == 1) translated[j] = bit[0];
        scope.push(obj);
      } else if (found[names.comma]) {
        if (!result[0].push) result = [result];
        result.push(scope = []);
      } else if (found[names.whitespace]) {
        var length = scope.length;
        if (length && (scope == result) && !scope[length - 1].push) scope = scope[length - 1] = [scope[length - 1]];
        
      } else if (text = (found[names.dstring] || found[names.sstring])) {
        scope.push(text)
      } else if (text = found[names.token]) {
        if (!text.match(Value.hex)) {
          var match = Value.length.exec(text);
          Value.length.lastIndex = 0;
          if (match) {
            var number = parseFloat(match[1]);
            text = match[2] ? {number: number, unit: match[2]} : number;
          } else if (!text.match(Value.keyword)) return false;
        }
        scope.push(text);
      }
    }
    return result.length == 1 ? result[0] : result;
  }
  
  var x = combineRegExp
  var OR = '|'
  var rRound = "(?:[^()]|\\((?:[^()]|\\((?:[^()]|\\((?:[^()]|\\([^()]*\\))*\\))*\\))*\\))";

  ;(Value.stringDouble = x(/"((?:[^"]|\\")*)"/)).names = ['dstring']
  ;(Value.stringSingle = x(/'((?:[^']|\\')*)'/)).names = ['sstring']
  ;(Value.string = x([Value.stringSingle, OR, Value.stringDouble]))
  ;(Value.keyword = x(/[-a-zA-Z0-9]+/, "keyword"))
  ;(Value.token = x(/[^$,\s\/)]+/, "token"))
  
  ;(Value['function'] = x("([-a-zA-Z0-9]+)\\((" + rRound + "*)\\)"))
  .names = [               'function',       '_arguments']
  
  ;(Value.integer = x(/-?\d+/))
  ;(Value.float = x(/-?\d+\.\d*/))
  ;(Value.number = x(['(', Value.float,  OR, Value.integer, ')']))
  .names = [           'number']

  ;(Value.unit = x(/em|px|pt|%|fr/, 'unit'))
  ;(Value.length = x(['^', Value.number, Value.unit, "?$"]))
  ;(Value.direction = x(/top|left|bottom|right|center/, 'direction'))
  ;(Value.position = x([Value.length, OR, Value.direction]))

  ;(Value.hex = x(/#[0-9a-z]+/, 'hex'))

  ;(Value.comma = x(/\s*,\s*/, 'comma'))
  ;(Value.whitespace = x(/\s+/, 'whitespace'))
  ;(Value.slash = x(/\//, 'slash'))


  Value.tokenize = x
  (
    [ x(Value['function']),
    , OR
    , x(Value.comma)
    , OR
    , x(Value.whitespace)
    , OR
    , x(Value.slash)
    , OR
    , x(Value.string)
    , OR
    , x(Value.token)
    ]
  )
  
})(typeof exports != 'undefined' ? exports : this);
/*
---
 
script: Interpolation.js
 
description: A logic to render (and nest) widgets out of the key-value hash or dom tree
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD
  - Sheet/SheetParser.Value
  - String.Inflections/String.pluralize

provides: 
  - LSD.Interpolation
 
...
*/


!function() {
  LSD.Interpolation = {}
  var helpers = LSD.Interpolation.helpers = {
    pluralize: function(count, singular, plural) {
      var value = (count == 1) ? singular : (plural || (singular.pluralize()));
      return value.replace("%", count);
    },
    auto_pluralize: function(count, singular, plural) {
      return count + " " + helpers.pluralize(count, singular, plural);
    }
  }
  
  var regex = SheetParser.Value.tokenize;
  var parsed = {};
  
  var interpolate = LSD.Interpolation.execute = function(name, callback, simple) {
    if (!simple || (name.indexOf('(') > -1)) return run(translate(name), callback);
    return callback(name);
  }
  
  var translate = LSD.Interpolation.translate = function(value) {
    var cached = parsed[name];
    if (cached) return cached;
    var found, result = [], matched = [], scope = result, func, text;
    var names = regex.names;
    while (found = regex.exec(value)) matched.push(found);
    for (var i = 0; found = matched[i++];) {
      if (func = found[names['function']]) {
        var translated = translate(found[names._arguments]);
        for (var j = 0, bit; bit = translated[j]; j++) if (bit && bit.length == 1) translated[j] = bit[0];
        scope.push({fn: func, arguments: translated});
      } else if (text = (found[names.dstring] || found[names.sstring])) {
        scope.push(text)
      } else if (text = found[names.token]) {
        scope.push({fn: interpolate, arguments: [text, true], callback: true})
      }
    }
    return (parsed[value] = (result.length == 1 ? result[0] : result));
  };
  
  var run = LSD.Interpolation.run = function(command, callback) {
    var fn = command.fn;
    if (fn) {
      var func = fn.indexOf ? (helpers[fn] || (callback(fn))) : fn;
      if (!func) {
        console.error(fn, ' interpoaltion function is not found');
        return "";
      }
      var args = Array.prototype.slice.call(command.arguments, 0);
      for (var i = 0, j = args.length; i < j; i++) args[i] = run(args[i], callback);
      if (command.callback) args.splice(1, 0, callback);
      return func.apply(this, args);
    }
    return command;
  };
  
  var attempt = LSD.Interpolation.attempt = function(string) {
    var count = 0, args = arguments;
    string = string.replace(/\\?\{([^{}]+)\}/g, function(match, name){
      count++;
      if (match.charAt(0) == '\\') return match.slice(1);
      for (var arg, value, callback, element, i = 1, j = args.length; i < j; i++) {
        if (!(arg = args[i])) continue;
        if (arg.call) callback = call;
        else if (arg.localName) element = arg;
        else if (arg[match]) return arg[match];
      }
      return interpolate(match, callback) || (element && element.getAttribute('data-' + match.dasherize)) || "";
    });
    return count ? string : false;
  };
  
  var from = LSD.Interpolation.from = function() {
    var args = Array.prototype.slice(arguments, 0);
    return function(string) {
      return attempt.apply([string].concat(args));
    };
  };
  
}();
/*
---
 
script: Layout.js
 
description: A logic to render (and nest) widgets out of the key-value hash or dom tree
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD
  - More/Object.Extras
  - LSD.Interpolation

provides: 
  - LSD.Layout
 
...
*/

!function() {
  
/* 
  Layout takes any tree-like structure and tries
  to build layout that representats that structure.
  
  The structure can be an objects with keys as selectors
  and values with other objects, arrays and strings.
  
  You can also build a widget tree from DOM. Layout will
  extract attributes and classes from elements. There are
  three methods of conversion element to widget:
  
  * Augment - Tries to use element in widget with minimal
              changes. (default)
  * Modify  - Builds widget with new element and replaces 
              the original element (fallback, destructive)
  * Clone   - Builds new element, original element untouched
*/

LSD.Layout = function(widget, layout, options) {
  this.origin = widget;
  this.setOptions(options);
  this.context = LSD[this.options.context.capitalize()];
  if (widget) if (!layout && !widget.lsd) {
    layout = widget;
    widget = null;
  } else if (!widget.lsd) widget = this.convert(widget);
  if (layout) this.result = this.render(layout, widget);
};

LSD.Layout.prototype = Object.append(new Options, {
  
  options: {
    context: 'element',
    interpolate: null
  },
  
  $family: Function.from('layout'),
  
  render: function(layout, parent, method, opts) {
    var type = layout.push ? 'array' : layout.nodeType ? LSD.Layout.NodeTypes[layout.nodeType] : layout.indexOf ? 'string' : 'object';
    if (type) return this[type](layout, parent, method, opts);
  },
  
  materialize: function(selector, layout, parent, opts) {
    var widget = this.context.create(Object.append({}, opts, LSD.Layout.parse(selector, parent)));
    if (parent) this.appendChild(parent, widget)
    if (layout) if (layout.charAt) widget.write(layout);
    else this.render(layout, widget, null, opts);
    return widget;
  },
  
  interpolate: function(string, object) {
    if (!object) object = this.options.interpolate;
    var interpolated = LSD.Interpolation.attempt(string, object);
    if (interpolated !== false) {
      this.interpolated = true;
      return interpolated;
    } else return string;
  },
  
  // type handlers
  
  string: function(string, parent, method, opts) {
    return this.materialize(string, {}, parent, opts);
  },
  
  array: function(array, parent, method, opts) {
    for (var i = 0, result = [], length = array.length; i < length; i++) 
      result[i] = this.render(array[i], parent, method, opts)
    return result;
  },
  
  element: function(element, parent, method, opts) {
    var converted = element.uid && Element.retrieve(element, 'widget');
    var children = LSD.slice(element.childNodes), cloning = (method == 'clone');
    var options = Object.append({traverse: false}, opts);
    if (converted) var widget = cloning ? converted.cloneNode(false, options) : converted;
    else var widget = this.context.use(element, options, parent, method);
    var ascendant = parent[1] || parent, container = parent[0] || parent.toElement();
    if (widget) {
      var adoption = function() {
        if (widget.toElement().parentNode == container) return;
        if (cloning)
          container.appendChild(widget.element)
        else if (widget.origin == element && element.parentNode && element.parentNode == container)
          element.parentNode.replaceChild(widget.element, element);
      };
      if (this.appendChild(ascendant, widget, adoption))
        if (widget.document != ascendant.document) widget.setDocument(ascendant.document);
    } else {
      if (cloning) var clone = element.cloneNode(false);
      if (cloning || (ascendant.origin == element.parentNode)) this.appendChild(container, clone || element);
    }
    var newParent = [clone || (widget && widget.element) || element, widget || ascendant];
    for (var i = 0, child; child = children[i]; i++) 
      if (child.nodeType != 8)
        this[child.nodeType == 1 ? "element" : "textnode"](child, newParent, method, opts);
    return widget || clone || element;
  },
  
  textnode: function(element, parent, method) {
    var value = element.textContent;
    if (this.options.interpolate) var interpolated = this.interpolate(value);
    if (interpolated != null && interpolated != value || method == 'clone') {
      var textnode = element.ownerDocument.createTextNode(interpolated || value);
      if (method != 'clone') element.parentNode.replaceChild(textnode, element);
      this.appendChild(parent[0] || parent.toElement(), textnode || element)
    }
    return textnode || element;
  },
  
  fragment: function(element, parent, method, opts) {
    return this.walk(element, parent, method, opts);
  },
  
  object: function(object, parent, method, opts) {
    var widgets = [];
    for (var selector in object) {
      widgets.push(this.materialize(selector, object[selector] === true ? null : object[selector], parent, opts));
    }
    return widgets;
  },
  
  walk: function(element, parent, method, opts) {
    for (var nodes = LSD.slice(element.childNodes, 0), i = 0, node; node = nodes[i++];) {
      if (node.nodeType && node.nodeType != 8) this.render(node, parent, method, opts);
    }
  },
  
  appendChild: function(parent, child, adoption) {
    if (child.parentNode != parent) {
      parent.appendChild(child, adoption);
      return true;
    }
  }
});

LSD.Layout.NodeTypes = {1: 'element', 3: 'textnode', 11: 'fragment'};
LSD.Layout.TextNodes = Array.fast('script', 'button', 'textarea', 'option', 'input');

Object.append(LSD.Layout, {
  /* 
    Parsers selector and generates options for layout 
  */
  parse: function(selector, parent) {
    var options = {};
    var parsed = (selector.Slick ? selector : Slick.parse(selector)).expressions[0][0]
    if (parsed.combinator != ' ') {
      if (parsed.combinator == '::') {
        var relation = (parent[0] || parent).relations[parsed.tag];
        if (!relation) throw "Unknown pseudo element ::" + parsed.tag
        Object.append(options, LSD.Layout.parse(relation.getSource(), parent))
      } else options.combinator = parsed.combinator;
    } 
    if (parsed.tag != '*' && parsed.combinator != '::') options.source = parsed.tag;
    if (parsed.id) (options.attributes || (options.attributes = {})).id = parsed.id
    if (parsed.attributes) for (var all = parsed.attributes, attribute, i = 0; attribute = all[i++];) {
      var value = attribute.value || LSD.Attributes.Boolean[attribute.key] || "";
      (options.attributes || (options.attributes = {}))[attribute.key] = value;
    }
    if (parsed.classes) options.classes = parsed.classes.map(Macro.map('value'));
    if (parsed.pseudos) for (var all = parsed.pseudos, pseudo, i = 0; pseudo = all[i++];) 
      (options.pseudos || (options.pseudos = {})).push(pseudo.key);
    return options;
  },
  
  /* 
    Extracts options from a DOM element.
  */
  extract: function(element) {
    var options = {
      attributes: {},
      tag: LSD.toLowerCase(element.tagName)
    };
    for (var i = 0, attribute, name; (attribute = element.attributes[i++]) && (name = attribute.name);)
      options.attributes[name] = attribute.value || LSD.Attributes.Boolean[name] || "";

    if (options.attributes && options.attributes.inherit) {
      options.inherit = options.attributes.inherit;
      delete options.attributes.inherit;
    }

    if (element.id) options.attributes.id = element.id;

    var klass = options.attributes['class'];
    if (klass) {
      options.classes = klass.split(/\s+/).filter(function(name) {
        switch (name.substr(0, 3)) {
          case "is-":
            if (!options.pseudos) options.pseudos = [];
            options.pseudos.push(name.substr(3, name.length - 3));
            break;
          case "id-":
            options.attributes.id = name.substr(3, name.length - 3);
            break;
          default:
            return true;
        }
      })
      delete options.attributes['class'];
    }
    return options;
  },
  
  mutate: function(element, parent) {
    var mutation = (parent[1] || parent).mutateLayout(element);
    if (mutation && mutation.indexOf) return LSD.Layout.parse(mutation, parent);
  },
  
  getSource: function(element) {
    source = [LSD.toLowerCase(element.tagName)];
    if (element.type) switch (element.type) {
      case "select-one": 
      case "select-multiple":
      case "textarea":
        break;
      default:
        source.push(element.type);
    };
    return source;
  }
});

}();
/*
---
 
script: Expression.js
 
description: Adds layout capabilities to widget (parse and render widget trees from objects)
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module
  - LSD.Layout

provides: 
  - LSD.Module.Layout
 
...
*/
  
LSD.Module.Layout = new Class({
  options: {
    traverse: true,
    extract: true
  },
  
  initializers: {
    layout: function(options) {
      this.rendered = {};
    }
  },
  
  mutateLayout: function(element) {
    var query = {element: element, parent: this};
    this.dispatchEvent('mutateLayout', query);
    if (query.mutation) return query.mutation;
  },
  
  onMutateLayout: function(query) {
    var element = query.element;
    var mutations = (this.mutations[LSD.toLowerCase(element.tagName)] || []).concat(this.mutations['*'] || []);
    for (var i = 0, mutation; mutation = mutations[i++];) {
      if (Slick.match(element, mutation[0], this.element)) query.mutation = mutation[1];
    }
  },
  
  addMutation: function(selector, mutation) {
    if (!this.$register) this.$register = {};
    if (!this.$register.mutations) {
      this.addEvent('mutateLayout', this.onMutateLayout);
      this.$register.mutations = 1;
    } else this.$register.mutations++;
    if (!this.mutations) this.mutations = {};
    selector.split(/\s*,\s*/).each(function(bit) {
      var parsed = Slick.parse(bit);
      var tag = parsed.expressions[0].getLast().tag;
      var group = this.mutations[tag];
      if (!group) group = this.mutations[tag] = [];
      group.push([parsed, mutation]);
    }, this)
  },
  
  removeMutation: function(selector, mutation) {
    if (!(--this.$register.mutations)) this.removeEvent(mutateLayout, this.onMutateLayout);
    selector.split(/\s*,\s*/).each(function(bit) {
      var parsed = Slick.parse(bit);
      var tag = parsed.expressions[0].getLast().tag;
      var group = this.mutations[tag];
      for (var i = 0, mutation; mutation = group[i]; i++)
        if (group[0] == parsed && parsed[1] == mutation) group.splice(i--, 1);
    }, this)
  },
  
  setLayout: function(layout) {
    if (typeOf(layout) == 'layout') this.layout = this;
    else this.options.layout = layout;
  },
  
  unsetLayout: function(layout) {
    if (this.layout == layout) delete this.layout;
    else delete this.options.layout;
  },
  
  getLayout: Macro.getter('layout', function() {
    var options = {
      interpolate: this.options.interpolate,
      context: this.options.context
    };
    return new LSD.Layout(this, null, options);
  }),
  
  buildLayout: function(layout, parent, options) {
    return this.getLayout().render(layout, (parent === false || parent) ? parent : this, null, options);
  },
  
  extractLayout: function(element) {
    this.extracted = LSD.Layout.extract(element);
    if (this.tagName || this.options.source) delete this.extracted.tag;
    this.setOptions(this.extracted);
    this.fireEvent('extractLayout', [this.extracted, element])
  }
});

LSD.Module.Layout.events = {
  /*
    Extracts and sets layout options from attached element
  */
  attach: function(element) {
    if (!this.extracted && this.options.extract) 
      this.extractLayout(element);
  },
  /*
    Unsets options previously extracted from the detached element
  */
  detach: function() {
    if (!this.extracted) return;
    this.unsetOptions(this.extracted);
    delete this.extracted, delete this.origin;
  },
  /*
    Mutates element and extract options off it.
  */
  beforeBuild: function(query) {
    if (!query.element) return;
    if (this.options.extract || this.options.clone) this.extractLayout(query.element);
    var tag = this.getElementTag(true);
    if (this.options.clone || (tag && LSD.toLowerCase(query.element.tagName) != tag)) {
      this.origin = query.element;
      query.convert = false;
    }
  },
  /*
    Builds children after element is built
  */
  build: function() {
    if (this.getLayout().origin == this && this.options.traverse !== false) {
      if (this.origin && !this.options.clone) this.element.replaces(this.origin);
      var nodes = LSD.slice((this.origin || this.element).childNodes);
      this.getLayout().render(nodes, [this.element, this], this.options.clone ? 'clone' : null);
    }
    if (this.options.layout) this.buildLayout(this.options.layout);
  },
  /*
    Augments all parsed HTML that goes through standart .write() interface
  */
  write: function() {
    this.buildLayout.apply(this, arguments);
  },
  /*
    Augments all inserted nodes that come from partial html updates
  */
  DOMNodeInserted: function() {
    this.buildLayout.apply(this, arguments);
  }
};

LSD.addEvents(LSD.Module.Layout.prototype, LSD.Module.Layout.events);

Object.append(LSD.Options, {
  mutations: {
    add: 'addMutation',
    remove: 'removeMutation',
    iterate: true
  },
  
  layout: {
    add: 'setLayout',
    remove: 'unsetLayout'
  }
});
/*
---
name    : SheetParser.Property

authors   : Yaroslaff Fedin

license   : MIT

requires : SheetParser.CSS

provides : SheetParser.Property
...
*/


(function(exports) {
  /*<CommonJS>*/
  var combineRegExp = (typeof require == 'undefined')
    ?  exports.combineRegExp
    :  require('./sg-regex-tools').combineRegExp
  var SheetParser = exports.SheetParser
  /*</CommonJS>*/
  
  var Property = SheetParser.Property = {version: '0.2 dev'};
  
  /*
    Finds optional groups in expressions and builds keyword
    indecies for them. Keyword index is an object that has
    keywords as keys and values as property names.
    
    Index only holds keywords that can be uniquely identified
    as one of the properties in group.
  */
  
  Property.index = function(properties, context) {
    var index = {};
    for (var i = 0, property; property = properties[i]; i++) {
      if (property.push) {
        var group = index[i] = {};
        for (var j = 0, prop; prop = property[j]; j++) {
          var keys = context[prop].keywords;
          if (keys) for (var key in keys) {
            if (group[key] == null) group[key] = prop;
            else group[key] = false;
          }
        }
        for (var keyword in group) if (!group[keyword]) delete group[keyword];
      }
    }
    return index;
  };
  
  /*
    Simple value 
  */

  Property.simple = function(types, keywords) {
    return function(value) {
      if (keywords && keywords[value]) return true;
      if (types) for (var i = 0, type; type = types[i++];) if (Type[type](value)) return true;
      return false;
    }
  };
  
  /*
    Links list of inambigous arguments with corresponding properties keeping
    the order.
  */
  
  Property.shorthand = function(properties, keywords, context) {
    var index, r = 0;
    for (var i = 0, property; property = properties[i++];) if (!property.push) r++;
    return function() {
      var result = [], used = {}, start = 0, group, k = 0, l = arguments.length;
      for (var i = 0, argument; argument = arguments[i]; i++) {
        var property = properties[k];
        if (!property) return false;
        if ((group = (property.push && property))) property = properties[k + 1];
        if (property) {
          if (context[property](argument)) k++
          else property = false
        }
        if (group) {
          if (!property) {
            if (!index) index = Property.index(properties, context)
            if (property = index[k][argument])
              if (used[property]) return false;
              else used[property] = 1;
          }
          if ((property && !used[property]) || (i == l - 1)) {
            if (i - start > group.length) return false;
            for (var j = start; j < (i + +!property); j++) 
              if (!result[j])
                for (var m = 0, optional; optional = group[m++];) {
                  if (!used[optional] && context[optional](arguments[j])) {
                    result[j] = optional;
                    used[optional] = true
                    break;
                  }
                }
            start = i;
            k++;
          }
        }
        if (result[i] == null) result[i] = property;
      }
      if (i < r) return false
      for (var i = 0, j = arguments.length, object = {}; i < j; i++) {
        var value = result[i];
        if (!value) return false;
        object[value] = arguments[i];
      }
      return object;
    };
  }

  /*
    A shorthand that operates on collection of properties. When given values
    are not enough (less than properties in collection), the value sequence
    is repeated until all properties are filled.     
  */

  Property.collection = function(properties, keywords, context) {
    var first = context[properties[0]];
    if (first.type != 'simple') 
      return function(arg) {
        var args = (!arg || !arg.push) ? [Array.prototype.slice.call(arguments)] : arguments;
        var length = args.length;
        var result = {};
        for (var i = 0, property; property = properties[i]; i++) {
          var values = context[property].apply(1, args[i] || args[i % 2] || args[0]);
          if (!values) return false;
          for (var prop in values) result[prop] = values[prop];
        }
        return result;
      }
    else
      return function() {
        var length = arguments.length;
        var result = {};
        for (var i = 0, property; property = properties[i]; i++) {
          var values = arguments[i] || arguments[i % 2] || arguments[0];
          if (!context[property].call(1, values)) return false;
          result[property] = values;
        }
        return result;
      }
  };
  
  /* 
    Multiple value property accepts arrays as arguments
    as well as regular stuff
  */
  
  Property.multiple = function(arg) {
    //if (arg.push)
  }
  
  Property.compile = function(definition, context) {
    var properties, keywords, types;
    for (var i = 0, bit; bit = definition[i++];) {
      if (bit.push) properties = bit;
      else if (bit.indexOf) {
        if (!Type[bit]) {
          if (!keywords) keywords = {};
          keywords[bit] = 1;
        } else types ? types.push(bit) : (types = [bit]);
      } else options = bit;
    }
    var type = properties ? (keywords && keywords.collection ? "collection" : "shorthand") : 'simple'
    var property = Property[type](properties || types, keywords, context);
    if (keywords) property.keywords = keywords;
    if (properties) {
      var props = [];
      for (var i = 0, prop; prop = properties[i++];) prop.push ? props.push.apply(props, prop) : props.push(prop);
      property.properties = props;
    }
    property.type = type;
    return property;
  };
  
  
  var Type = Property.Type = {
    length: function(obj) {
      return typeof obj == 'number' || (!obj.indexOf && ('number' in obj) && obj.unit && (obj.unit != '%'))
    },
  
    color: function(obj) {
      return obj.indexOf ? obj.match(/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/) : (obj.isColor || obj.rgba || obj.rgb || obj.hsb)
    },
    
    number: function(obj) {
      return typeof obj == 'number'
    },
    
    integer: function(obj) {
      return obj % 1 == 0 && ((0 + obj).toString() == obj)
    },
  
    keyword: function(keywords) {
      var storage;
      for (var i = 0, keyword; keyword = keywords[i++];) storage[keyword] = 1;
      return function(keyword) {
        return !!storage[keyword]
      }
    },
    
    strings: function(obj) {
      return !!obj.indexOf
    },
    
    url: function(obj) {
      return !obj.indexOf && ("url" in obj);
    },
    
    position: function(obj) {        
      var positions = Type.position.positions;
      if (!positions) positions = Type.position.positions = {left: 1, top: 1, bottom: 1, right: 1, center: 1}
      return positions[obj]
    },
    
    percentage: function(obj) {
      return obj.unit == '%'
    }
  };
  
})(typeof exports != 'undefined' ? exports : this);
/*
---
name    : SheetParser.Styles

authors   : Yaroslaff Fedin

license   : MIT

requires : SheetParser.Property

provides : SheetParser.Styles
...
*/

(function() {
   
var SheetParser = (typeof exports == 'undefined') ? window.SheetParser : exports.SheetParser;
var CSS = SheetParser.Properties = {
  background:           [[['backgroundColor', 'backgroundImage', 'backgroundRepeat', 
                          'backgroundAttachment', 'backgroundPositionX', 'backgroundPositionY']], 'multiple'],
  backgroundColor:      ['color', 'transparent', 'inherit'],
  backgroundImage:      ['url', 'none', 'inherit'],
  backgroundRepeat:     ['repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'inherit', 'space', 'round'],
  backgroundAttachment: ['fixed', 'scroll', 'inherit', 'local', 'fixed'],
  backgroundPosition:   [['backgroundPositionX', 'backgroundPositionY']],
  backgroundPositionX:  ['percentage', 'center', 'left', 'right', 'length', 'inherit'],
  backgroundPositionY:  ['percentage', 'center', 'top', 'bottom', 'length', 'inherit'],
   
  textShadow:           [['textShadowBlur', 'textShadowOffsetX', 'textShadowOffsetY', 'textShadowColor'], 'multiple'],
  textShadowBlur:       ['length'],
  textShadowOffsetX:    ['length'],
  textShadowOffsetY:    ['length'],
  textShadowColor:      ['color'],
                        
  boxShadow:            [['boxShadowBlur', 'boxShadowOffsetX', 'boxShadowOffsetY', 'boxShadowColor'], 'multiple'],
  boxShadowBlur:        ['length'],
  boxShadowOffsetX:     ['length'],
  boxShadowOffsetY:     ['length'],
  boxShadowColor:       ['color'], 
  
  outline:              ['outlineWidth', 'outlineStyle', 'outlineColor'],
  outlineWidth:         ['length'],
  outlineStyle:         ['dotted', 'dashed', 'solid', 'double', 'groove', 'reidge', 'inset', 'outset'],
  outlineColor:         ['color'],
                        
  font:                 [[
                          ['fontStyle', 'fontVariant', 'fontWeight'], 
                          'fontSize', 
                          ['lineHeight'], 
                          'fontFamily'
                        ]],
  fontStyle:            ['normal', 'italic', 'oblique', 'inherit'],
  fontVariant:          ['normal', 'small-caps', 'inherit'],
  fontWeight:           ['normal', 'number', 'bold', 'inherit'],
  fontFamily:           ['strings', 'inherit'],
  fontSize:             ['length', 'percentage', 'inherit', 
                         'xx-small', 'x-small', 'small', 'medium', 'large', 'x-large', 'xx-large', 'smaller', 'larger'],
                        
  color:                ['color'],
  letterSpacing:        ['normal', 'length', 'inherit'],
  textDecoration:       ['none', 'capitalize', 'uppercase', 'lowercase'],
  textAlign:            ['left', 'right', 'center', 'justify'],
  textIdent:            ['length', 'percentage'],                 
  lineHeight:           ['normal', 'length', 'number', 'percentage'],
  
  height:               ['length', 'auto'],
  maxHeight:            ['length', 'auto'],
  minHeight:            ['length', 'auto'],
  width:                ['length', 'auto'],
  maxWidth:             ['length', 'auto'],
  minWidth:             ['length', 'auto'],
                        
  display:              ['inline', 'block', 'list-item', 'run-in', 'inline-block', 'table', 'inline-table', 'none', 
                         'table-row-group', 'table-header-group', 'table-footer-group', 'table-row', 
                         'table-column-group', 'table-column', 'table-cell', 'table-caption'],
  visibility:           ['visible', 'hidden'],
  float:                ['none', 'left', 'right'],
  clear:                ['none', 'left', 'right', 'both', 'inherit'],
  overflow:             ['visible', 'hidden', 'scroll', 'auto'],
  position:             ['static', 'relative', 'absolute', 'fixed'],
  top:                  ['length', 'auto'],
  left:                 ['length', 'auto'],
  right:                ['length', 'auto'],
  bottom:               ['length', 'auto'],
  zIndex:               ['integer'],
  cursor:               ['auto', 'crosshair', 'default', 'hand', 'move', 'e-resize', 'ne-resize', 'nw-resize', 
                         'n-resize', 'se-resize', 'sw-resize', 's-resize', 'w-resize', 'text', 'wait', 'help'],
};

var expanded = ['borderWidth', 'borderColor', 'borderStyle', 'padding', 'margin', 'border'];
for (var side, sides = ['Top', 'Right', 'Bottom', 'Left'], i = 0; side = sides[i++];) {
  CSS['border' + side]           = [['border' + side + 'Width', 'border' + side + 'Style', 'border' + side + 'Color']];
  
  CSS['border' + side + 'Width'] = ['length', 'thin', 'thick', 'medium'];
  CSS['border' + side + 'Style'] = ['none', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset', 'inherit', 'none'];
  CSS['border' + side + 'Color'] = ['color'];
  
  CSS['margin' + side]           = ['length', 'percentage', 'auto'];
  CSS['padding' + side]          = ['length', 'percentage', 'auto'];

  for (var j = 0, prop; prop = expanded[j++];) {
    if (!CSS[prop]) CSS[prop] = [[]];
    CSS[prop][0].push(prop.replace(/^([a-z]*)/, '$1' + side));
    if (i == 4) CSS[prop].push('collection')
  }

  if (i % 2 == 0) 
    for (var j = 1, adj; adj = sides[j+=2];) 
      CSS['borderRadius' + side + adj] = ['length', 'none'];
};

var Styles = SheetParser.Styles = {}
for (var property in CSS) Styles[property] = SheetParser.Property.compile(CSS[property], Styles);

})();
/*
---
name    : Sheet

authors   : Thomas Aylott
copyright : © 2010 Thomas Aylott
license   : MIT

provides : Sheet
requires : SheetParser.CSS
...
*/
;(function(exports){


/*<depend>*/
var UNDEF = {undefined:1}

/*<CommonJS>*/
var SheetParser = UNDEF[typeof require]
	?	exports.SheetParser
	:	require('./SheetParser.CSS').SheetParser

exports.Sheet = Sheet
/*</CommonJS>*/

/*<debug>*/;if (!(!UNDEF[typeof SheetParser] && SheetParser.CSS)) throw new Error('Missing required function: "SheetParser.CSS"');/*</debug>*/
/*</depend>*/


Sheet.version = '1.0.2 dev'

function Sheet(cssText){
	if (this instanceof Sheet) this.initialize(cssText)
	else return Sheet.from(cssText)
}

Sheet.from = function(cssText){
	return new Sheet(cssText)
}

Sheet.prototype = {
	
	parser: SheetParser.CSS,
	
	initialize: function(cssText){
		this.cssText = cssText || ''
		this.style = this.rules = this.cssRules = this.parser.parse(this.cssText)
		var self = this
	},
	
	update: function(){
		var cssText = '',
			i = -1,
			rule,
			rules = this.style || this.rules || this.cssRules
		
		while ((rule = rules[++i])){
			if (typeof rule == 'object'){
				// cssRule
				if (this.update) rule.cssText = this.update.call(rule)
				cssText += rule.cssText = rule.selectorText + '{' + rule.cssText + '}'
			} else {
				// style key/value
				cssText += rule + ':'
				cssText += rules[rule] + ';'
			}
		}
		
		if (rules.selectorText)
			return rules.cssText = rules.selectorText + '{' + cssText + '}'
		return rules.cssText = cssText
	}
	
}

Sheet.prototype.toString = Sheet.prototype.update


}(typeof exports != 'undefined' ? exports : this));

/*
---
name: Slick.Parser
description: Standalone CSS3 Selector parser
provides: Slick.Parser
...
*/

(function(){
	
var parsed,
	separatorIndex,
	combinatorIndex,
	reversed,
	cache = {},
	reverseCache = {},
	reUnescape = /\\/g;

var parse = function(expression, isReversed){
	if (!expression) return null;
	if (expression.Slick === true) return expression;
	expression = ('' + expression).replace(/^\s+|\s+$/g, '');
	reversed = !!isReversed;
	var currentCache = (reversed) ? reverseCache : cache;
	if (currentCache[expression]) return currentCache[expression];
	parsed = {Slick: true, expressions: [], raw: expression, reverse: function(){
		return parse(this.raw, true);
	}};
	separatorIndex = -1;
	while (expression != (expression = expression.replace(regexp, parser)));
	parsed.length = parsed.expressions.length;
	return currentCache[expression] = (reversed) ? reverse(parsed) : parsed;
};

var reverseCombinator = function(combinator){
	if (combinator === '!') return ' ';
	else if (combinator === ' ') return '!';
	else if ((/^!/).test(combinator)) return combinator.replace(/^!/, '');
	else return '!' + combinator;
};

var reverse = function(expression){
	var expressions = expression.expressions;
	for (var i = 0; i < expressions.length; i++){
		var exp = expressions[i];
		var last = {parts: [], tag: '*', combinator: reverseCombinator(exp[0].combinator)};
		
		for (var j = 0; j < exp.length; j++){
			var cexp = exp[j];
			if (!cexp.reverseCombinator) cexp.reverseCombinator = ' ';
			cexp.combinator = cexp.reverseCombinator;
			delete cexp.reverseCombinator;
		}
		
		exp.reverse().push(last);
	}
	return expression;
};

var escapeRegExp = function(string){// Credit: XRegExp 0.6.1 (c) 2007-2008 Steven Levithan <http://stevenlevithan.com/regex/xregexp/> MIT License
	return string.replace(/[-[\]{}()*+?.\\^$|,#\s]/g, "\\$&");
};

var regexp = new RegExp(
/*
#!/usr/bin/env ruby
puts "\t\t" + DATA.read.gsub(/\(\?x\)|\s+#.*$|\s+|\\$|\\n/,'')
__END__
	"(?x)^(?:\
	  \\s* ( , ) \\s*               # Separator          \n\
	| \\s* ( <combinator>+ ) \\s*   # Combinator         \n\
	|      ( \\s+ )                 # CombinatorChildren \n\
	|      ( <unicode>+ | \\* )     # Tag                \n\
	| \\#  ( <unicode>+       )     # ID                 \n\
	| \\.  ( <unicode>+       )     # ClassName          \n\
	|                               # Attribute          \n\
	\\[  \
		\\s* (<unicode1>+)  (?:  \
			\\s* ([*^$!~|]?=)  (?:  \
				\\s* (?:\
					([\"']?)(.*?)\\9 \
				)\
			)  \
		)?  \\s*  \
	\\](?!\\]) \n\
	|   :+ ( <unicode>+ )(?:\
	\\( (?:\
		 ([\"']?)((?:\\([^\\)]+\\)|[^\\(\\)]*)+)\\12\
	) \\)\
	)?\
	)"
*/
	"^(?:\\s*(,)\\s*|\\s*(<combinator>+)\\s*|(\\s+)|(<unicode>+|\\*)|\\#(<unicode>+)|\\.(<unicode>+)|\\[\\s*(<unicode1>+)(?:\\s*([*^$!~|]?=)(?:\\s*(?:([\"']?)(.*?)\\9)))?\\s*\\](?!\\])|:+(<unicode>+)(?:\\((?:([\"']?)((?:\\([^\\)]+\\)|[^\\(\\)]*)+)\\12)\\))?)"
	.replace(/<combinator>/, '[' + escapeRegExp(">+~`!@$%^&={}\\;</") + ']')
	.replace(/<unicode>/g, '(?:[\\w\\u00a1-\\uFFFF-]|\\\\[^\\s0-9a-f])')
	.replace(/<unicode1>/g, '(?:[:\\w\\u00a1-\\uFFFF-]|\\\\[^\\s0-9a-f])')
);

function parser(
	rawMatch,
	
	separator,
	combinator,
	combinatorChildren,
	
	tagName,
	id,
	className,
	
	attributeKey,
	attributeOperator,
	attributeQuote,
	attributeValue,
	
	pseudoClass,
	pseudoQuote,
	pseudoClassValue
){
	if (separator || separatorIndex === -1){
		parsed.expressions[++separatorIndex] = [];
		combinatorIndex = -1;
		if (separator) return '';
	}
	
	if (combinator || combinatorChildren || combinatorIndex === -1){
		combinator = combinator || ' ';
		var currentSeparator = parsed.expressions[separatorIndex];
		if (reversed && currentSeparator[combinatorIndex])
			currentSeparator[combinatorIndex].reverseCombinator = reverseCombinator(combinator);
		currentSeparator[++combinatorIndex] = {combinator: combinator, tag: '*'};
	}
	
	var currentParsed = parsed.expressions[separatorIndex][combinatorIndex];

	if (tagName){
		currentParsed.tag = tagName.replace(reUnescape, '');

	} else if (id){
		currentParsed.id = id.replace(reUnescape, '');

	} else if (className){
		className = className.replace(reUnescape, '');

		if (!currentParsed.classList) currentParsed.classList = [];
		if (!currentParsed.classes) currentParsed.classes = [];
		currentParsed.classList.push(className);
		currentParsed.classes.push({
			value: className,
			regexp: new RegExp('(^|\\s)' + escapeRegExp(className) + '(\\s|$)')
		});
		
	} else if (pseudoClass){
		pseudoClassValue = pseudoClassValue ? pseudoClassValue.replace(reUnescape, '') : null;
		
		if (!currentParsed.pseudos) currentParsed.pseudos = [];
		currentParsed.pseudos.push({
			key: pseudoClass.replace(reUnescape, ''),
			value: pseudoClassValue
		});
		
	} else if (attributeKey){
		attributeKey = attributeKey.replace(reUnescape, '');
		attributeValue = (attributeValue || '').replace(reUnescape, '');
		
		var test, regexp;
		
		switch (attributeOperator){
			case '^=' : regexp = new RegExp(       '^'+ escapeRegExp(attributeValue)            ); break;
			case '$=' : regexp = new RegExp(            escapeRegExp(attributeValue) +'$'       ); break;
			case '~=' : regexp = new RegExp( '(^|\\s)'+ escapeRegExp(attributeValue) +'(\\s|$)' ); break;
			case '|=' : regexp = new RegExp(       '^'+ escapeRegExp(attributeValue) +'(-|$)'   ); break;
			case  '=' : test = function(value){
				return attributeValue == value;
			}; break;
			case '*=' : test = function(value){
				return value && value.indexOf(attributeValue) > -1;
			}; break;
			case '!=' : test = function(value){
				return attributeValue != value;
			}; break;
			default   : test = function(value){
				return !!value;
			};
		}
		
		if (!test) test = function(value){
			return value && regexp.test(value);
		};
		
		if (!currentParsed.attributes) currentParsed.attributes = [];
		currentParsed.attributes.push({
			key: attributeKey,
			operator: attributeOperator,
			value: attributeValue,
			test: test
		});
		
	}
	
	return '';
};

// Slick NS

var Slick = (this.Slick || {});

Slick.parse = function(expression){
	return parse(expression);
};

Slick.escapeRegExp = escapeRegExp;

if (!this.Slick) this.Slick = Slick;
	
}).apply(/*<CommonJS>*/(typeof exports != 'undefined') ? exports : /*</CommonJS>*/this);

/*
---

name: Events.Pseudos

description: Adds the functionallity to add pseudo events

license: MIT-style license

authors:
  - Arian Stolwijk

requires: [Core/Class.Extras, Core/Slick.Parser, More/MooTools.More]
provides: [Events.Pseudos]

...
*/

Events.Pseudos = function(pseudos, addEvent, removeEvent){

	var storeKey = 'monitorEvents:';

	var getStorage = function(object){
				
		return {
			store: object.store ? function(key, value){
				object.store(storeKey + key, value);
			} : function(key, value){
				(object.$monitorEvents || (object.$monitorEvents = {}))[key] = value;
			},
			retrieve: object.retrieve ? function(key, dflt){
				return object.retrieve(storeKey + key, dflt);
			} : function(key, dflt){
				if (!object.$monitorEvents) return dflt;
				return object.$monitorEvents[key] || dflt;
			}
		};
	};

	
	var splitType = function(type){
		if (type.indexOf(':') == -1) return null;
		
		var parsed = Slick.parse(type).expressions[0][0],
			parsedPseudos = parsed.pseudos;
		
		return (pseudos && pseudos[parsedPseudos[0].key]) ? {
			event: parsed.tag,
			value: parsedPseudos[0].value,
			pseudo: parsedPseudos[0].key,
			original: type
		} : null;
	};

	
	return {
		
		addEvent: function(type, fn, internal){
			var split = splitType(type);
			if (!split) return addEvent.call(this, type, fn, internal);
			
			var storage = getStorage(this);
			var events = storage.retrieve(type, []);
					
			var self = this;
			var monitor = function(){
				pseudos[split.pseudo].call(self, split, fn, arguments);
			};
			
			events.include({event: fn, monitor: monitor});
			storage.store(type, events);
			
			return addEvent.call(this, split.event, monitor, internal);
		},
		
		removeEvent: function(type, fn){
			var split = splitType(type);
			if (!split) return removeEvent.call(this, type, fn);

			var storage = getStorage(this);
			var events = storage.retrieve(type);

			if (!events) return this;
			
			events.each(function(monitor, i){
				if (!fn || monitor.event == fn) removeEvent.call(this, split.event, monitor.monitor);
				delete events[i];
			}, this);				

			storage.store(type, events);
			return this;
		}
		
	};
	
};

(function(){

	var pseudos = {
		
		once: function(split, fn, args){
			fn.apply(this, args)
			this.removeEvent(split.original, fn);
		}
		
	};
	
	Events.definePseudo = function(key, fn){
		pseudos[key] = fn;
	};
	
	Events.implement(Events.Pseudos(pseudos, Events.prototype.addEvent, Events.prototype.removeEvent)); 

})();

/*
---
name: Slick.Finder
description: The new, superfast css selector engine.
provides: Slick.Finder
requires: Slick.Parser
...
*/

(function(){

var local = {};

// Feature / Bug detection

local.isNativeCode = function(fn){
	return (/\{\s*\[native code\]\s*\}/).test('' + fn);
};

local.isXML = function(document){
	return (!!document.xmlVersion) || (!!document.xml) || (Object.prototype.toString.call(document) === '[object XMLDocument]') ||
	(document.nodeType === 9 && document.documentElement.nodeName !== 'HTML');
};

local.setDocument = function(document){
	
	// convert elements / window arguments to document. if document cannot be extrapolated, the function returns.
	
	if (document.nodeType === 9); // document
	else if (document.ownerDocument) document = document.ownerDocument; // node
	else if (document.navigator) document = document.document; // window
	else return;
	
	// check if it's the old document
	
	if (this.document === document) return;
	this.document = document;
	var root = this.root = document.documentElement;
	
	// document sort
	
	this.brokenStarGEBTN
	= this.starSelectsClosedQSA
	= this.idGetsName
	= this.brokenMixedCaseQSA
	= this.brokenGEBCN
	= false;
	
	var starSelectsClosed, starSelectsComments,
		brokenSecondClassNameGEBCN, cachedGetElementsByClassName;
	
	if (!(this.isXMLDocument = this.isXML(document))){
		
		var testNode = document.createElement('div');
		this.root.appendChild(testNode);
		var selected, id;
		
		// IE returns comment nodes for getElementsByTagName('*') for some documents
		testNode.appendChild(document.createComment(''));
		starSelectsComments = (testNode.getElementsByTagName('*').length > 0);
		
		// IE returns closed nodes (EG:"</foo>") for getElementsByTagName('*') for some documents
		try {
			testNode.innerHTML = 'foo</foo>';
			selected = testNode.getElementsByTagName('*');
			starSelectsClosed = (selected && selected.length && selected[0].nodeName.charAt(0) == '/');
		} catch(e){};
		
		this.brokenStarGEBTN = starSelectsComments || starSelectsClosed;
		
		// IE 8 returns closed nodes (EG:"</foo>") for querySelectorAll('*') for some documents
		if (testNode.querySelectorAll) try {
			testNode.innerHTML = 'foo</foo>';
			selected = testNode.querySelectorAll('*');
			this.starSelectsClosedQSA = (selected && selected.length && selected[0].nodeName.charAt(0) == '/');
		} catch(e){};
		
		// IE returns elements with the name instead of just id for getElementById for some documents
		try {
			id = 'slick_id_gets_name';
			testNode.innerHTML = ('<a name='+id+'></a><b id='+id+'></b>');
			this.idGetsName = testNode.ownerDocument.getElementById(id) === testNode.firstChild;
		} catch(e){};
		
		// Safari 3.2 QSA doesnt work with mixedcase on quirksmode
		try {
			testNode.innerHTML = '<a class="MiXedCaSe"></a>';
			this.brokenMixedCaseQSA = !testNode.querySelectorAll('.MiXedCaSe').length;
		} catch(e){};

		try {
			testNode.innerHTML = '<a class="f"></a><a class="b"></a>';
			testNode.getElementsByClassName('b').length;
			testNode.firstChild.className = 'b';
			cachedGetElementsByClassName = (testNode.getElementsByClassName('b').length != 2);
		} catch(e){};
		
		// Opera 9.6 GEBCN doesnt detects the class if its not the first one
		try {
			testNode.innerHTML = '<a class="a"></a><a class="f b a"></a>';
			brokenSecondClassNameGEBCN = (testNode.getElementsByClassName('a').length != 2);
		} catch(e){};
		
		this.brokenGEBCN = cachedGetElementsByClassName || brokenSecondClassNameGEBCN;
		
		this.root.removeChild(testNode);
		testNode = null;
		
	}
	
	// hasAttribute
	
	this.hasAttribute = (root && this.isNativeCode(root.hasAttribute)) ? function(node, attribute) {
		return node.hasAttribute(attribute);
	} : function(node, attribute) {
		node = node.getAttributeNode(attribute);
		return !!(node && (node.specified || node.nodeValue));
	};
	
	// contains
	// FIXME: Add specs: local.contains should be different for xml and html documents?
	this.contains = (root && this.isNativeCode(root.contains)) ? function(context, node){
		return context.contains(node);
	} : (root && root.compareDocumentPosition) ? function(context, node){
		return context === node || !!(context.compareDocumentPosition(node) & 16);
	} : function(context, node){
		if (node) do {
			if (node === context) return true;
		} while ((node = node.parentNode));
		return false;
	};
	
	// document order sorting
	// credits to Sizzle (http://sizzlejs.com/)
	
	this.documentSorter = (root.compareDocumentPosition) ? function(a, b){
		if (!a.compareDocumentPosition || !b.compareDocumentPosition) return 0;
		return a.compareDocumentPosition(b) & 4 ? -1 : a === b ? 0 : 1;
	} : ('sourceIndex' in root) ? function(a, b){
		if (!a.sourceIndex || !b.sourceIndex) return 0;
		return a.sourceIndex - b.sourceIndex;
	} : (document.createRange) ? function(a, b){
		if (!a.ownerDocument || !b.ownerDocument) return 0;
		var aRange = a.ownerDocument.createRange(), bRange = b.ownerDocument.createRange();
		aRange.setStart(a, 0);
		aRange.setEnd(a, 0);
		bRange.setStart(b, 0);
		bRange.setEnd(b, 0);
		return aRange.compareBoundaryPoints(Range.START_TO_END, bRange);
	} : null ;
	
	this.getUID = (this.isXMLDocument) ? this.getUIDXML : this.getUIDHTML;
	
};
	
// Main Method

local.search = function(context, expression, append, first){
	
	var found = this.found = (first) ? null : (append || []);
	
	// no need to pass a context if its the current document
	
	if (expression == null){
		expression = context;
		context = document; // the current document, not local.document, cause it would be confusing
	}
	
	// context checks

	if (!context) return found; // No context
	if (context.navigator) context = context.document; // Convert the node from a window to a document
	else if (!context.nodeType) return found; // Reject misc junk input

	// setup
	
	var parsed, i;

	var uniques = this.uniques = {};
	
	if (this.document !== (context.ownerDocument || context)) this.setDocument(context);

	// expression checks
	
	if (typeof expression == 'string'){ // expression is a string
		
		// Overrides

		for (i = this.overrides.length; i--;){
			var override = this.overrides[i];
			if (override.regexp.test(expression)){
				var result = override.method.call(context, expression, found, first);
				if (result === false) continue;
				if (result === true) return found;
				return result;
			}
		}
		
		parsed = this.Slick.parse(expression);
		if (!parsed.length) return found;
	} else if (expression == null){ // there is no expression
		return found;
	} else if (expression.Slick){ // expression is a parsed Slick object
		parsed = expression;
	} else if (this.contains(context.documentElement || context, expression)){ // expression is a node
		(found) ? found.push(expression) : found = expression;
		return found;
	} else { // other junk
		return found;
	}
	
	// cache elements for the nth selectors
	
	/*<pseudo-selectors>*//*<nth-pseudo-selectors>*/
	
	this.posNTH = {};
	this.posNTHLast = {};
	this.posNTHType = {};
	this.posNTHTypeLast = {};
	
	/*</nth-pseudo-selectors>*//*</pseudo-selectors>*/
	
	// should sort if there are nodes in append and if you pass multiple expressions.
	// should remove duplicates if append already has items
	var shouldUniques = !!(append && append.length);
	
	// if append is null and there is only a single selector with one expression use pushArray, else use pushUID
	this.push = (!shouldUniques && (first || (parsed.length == 1 && parsed.expressions[0].length == 1))) ? this.pushArray : this.pushUID;
	
	if (found == null) found = [];
	
	// avoid duplicating items already in the append array
	if (shouldUniques) for (i = found.length; i--;) this.uniques[this.getUID(found[i])] = true;
	
	// default engine
	
	var j, m, n;
	var combinator, tag, id, classList, classes, attributes, pseudos;
	var currentItems, currentExpression, currentBit, lastBit, expressions = parsed.expressions;
	
	search: for (i = 0; (currentExpression = expressions[i]); i++) for (j = 0; (currentBit = currentExpression[j]); j++){

		combinator = 'combinator:' + currentBit.combinator;
		if (!this[combinator]) continue search;
		
		tag        = (this.isXMLDocument) ? currentBit.tag : currentBit.tag.toUpperCase();
		id         = currentBit.id;
		classList  = currentBit.classList;
		classes    = currentBit.classes;
		attributes = currentBit.attributes;
		pseudos    = currentBit.pseudos;
		lastBit    = (j === (currentExpression.length - 1));
	
		this.bitUniques = {};
		
		if (lastBit){
			this.uniques = uniques;
			this.found = found;
		} else {
			this.uniques = {};
			this.found = [];
		}

		if (j === 0){
			this[combinator](context, tag, id, classes, attributes, pseudos, classList);
			if (first && lastBit && found.length) break search;
		} else {
			if (first && lastBit) for (m = 0, n = currentItems.length; m < n; m++){
				this[combinator](currentItems[m], tag, id, classes, attributes, pseudos, classList);
				if (found.length) break search;
			} else for (m = 0, n = currentItems.length; m < n; m++) this[combinator](currentItems[m], tag, id, classes, attributes, pseudos, classList);
		}
		
		currentItems = this.found;
	}
	
	if (shouldUniques || (parsed.expressions.length > 1)) this.sort(found);
	
	return (first) ? (found[0] || null) : found;
};

// Utils

local.uidx = 1;
local.uidk = 'slick:uniqueid';

local.getUIDXML = function(node){
	var uid = node.getAttribute(this.uidk);
	if (!uid){
		uid = this.uidx++;
		node.setAttribute(this.uidk, uid);
	}
	return uid;
};

local.getUIDHTML = function(node){
	return node.uniqueNumber || (node.uniqueNumber = this.uidx++);
};

// sort based on the setDocument documentSorter method.

local.sort = function(results){
	if (!this.documentSorter) return results;
	results.sort(this.documentSorter);
	return results;
};

/*<pseudo-selectors>*//*<nth-pseudo-selectors>*/

local.cacheNTH = {};

local.matchNTH = /^([+-]?\d*)?([a-z]+)?([+-]\d+)?$/;

local.parseNTHArgument = function(argument){
	var parsed = argument.match(this.matchNTH);
	if (!parsed) return false;
	var special = parsed[2] || false;
	var a = parsed[1] || 1;
	if (a == '-') a = -1;
	var b = +parsed[3] || 0;
	parsed =
		(special == 'n')	? {a: a, b: b} :
		(special == 'odd')	? {a: 2, b: 1} :
		(special == 'even')	? {a: 2, b: 0} : {a: 0, b: a};
		
	return (this.cacheNTH[argument] = parsed);
};

local.createNTHPseudo = function(child, sibling, positions, ofType){
	return function(node, argument){
		var uid = this.getUID(node);
		if (!this[positions][uid]){
			var parent = node.parentNode;
			if (!parent) return false;
			var el = parent[child], count = 1;
			if (ofType){
				var nodeName = node.nodeName;
				do {
					if (el.nodeName !== nodeName) continue;
					this[positions][this.getUID(el)] = count++;
				} while ((el = el[sibling]));
			} else {
				do {
					if (el.nodeType !== 1) continue;
					this[positions][this.getUID(el)] = count++;
				} while ((el = el[sibling]));
			}
		}
		argument = argument || 'n';
		var parsed = this.cacheNTH[argument] || this.parseNTHArgument(argument);
		if (!parsed) return false;
		var a = parsed.a, b = parsed.b, pos = this[positions][uid];
		if (a == 0) return b == pos;
		if (a > 0){
			if (pos < b) return false;
		} else {
			if (b < pos) return false;
		}
		return ((pos - b) % a) == 0;
	};
};

/*</nth-pseudo-selectors>*//*</pseudo-selectors>*/

local.pushArray = function(node, tag, id, classes, attributes, pseudos){
	if (this.matchSelector(node, tag, id, classes, attributes, pseudos)) this.found.push(node);
};

local.pushUID = function(node, tag, id, classes, attributes, pseudos){
	var uid = this.getUID(node);
	if (!this.uniques[uid] && this.matchSelector(node, tag, id, classes, attributes, pseudos)){
		this.uniques[uid] = true;
		this.found.push(node);
	}
};

local.matchNode = function(node, selector){
	var parsed = this.Slick.parse(selector);
	if (!parsed) return true;
	
	// simple (single) selectors
	if(parsed.length == 1 && parsed.expressions[0].length == 1){
		var exp = parsed.expressions[0][0];
		return this.matchSelector(node, (this.isXMLDocument) ? exp.tag : exp.tag.toUpperCase(), exp.id, exp.classes, exp.attributes, exp.pseudos);
	}

	var nodes = this.search(this.document, parsed);
	for (var i = 0, item; item = nodes[i++];){
		if (item === node) return true;
	}
	return false;
};

local.matchPseudo = function(node, name, argument){
	var pseudoName = 'pseudo:' + name;
	if (this[pseudoName]) return this[pseudoName](node, argument);
	var attribute = this.getAttribute(node, name);
	return (argument) ? argument == attribute : !!attribute;
};

local.matchSelector = function(node, tag, id, classes, attributes, pseudos){
	if (tag){
		if (tag == '*'){
			if (node.nodeName < '@') return false; // Fix for comment nodes and closed nodes
		} else {
			if (node.nodeName != tag) return false;
		}
	}
	
	if (id && node.getAttribute('id') != id) return false;

	var i, part, cls;
	if (classes) for (i = classes.length; i--;){
		cls = ('className' in node) ? node.className : node.getAttribute('class');
		if (!(cls && classes[i].regexp.test(cls))) return false;
	}
	if (attributes) for (i = attributes.length; i--;){
		part = attributes[i];
		if (part.operator ? !part.test(this.getAttribute(node, part.key)) : !this.hasAttribute(node, part.key)) return false;
	}
	if (pseudos) for (i = pseudos.length; i--;){
		part = pseudos[i];
		if (!this.matchPseudo(node, part.key, part.value)) return false;
	}
	return true;
};

var combinators = {

	' ': function(node, tag, id, classes, attributes, pseudos, classList){ // all child nodes, any level
		
		var i, item, children;

		if (!this.isXMLDocument){
			getById: if (id){
				item = this.document.getElementById(id);
				if ((!item && node.all) || (this.idGetsName && item && item.getAttributeNode('id').nodeValue != id)){
					// all[id] returns all the elements with that name or id inside node
					// if theres just one it will return the element, else it will be a collection
					children = node.all[id];
					if (!children) return;
					if (!children[0]) children = [children];
					for (i = 0; item = children[i++];) if (item.getAttributeNode('id').nodeValue == id){
						this.push(item, tag, null, classes, attributes, pseudos);
						break;
					} 
					return;
				}
				if (!item){
					// if the context is in the dom we return, else we will try GEBTN, breaking the getById label
					if (this.contains(this.document.documentElement, node)) return;
					else break getById;
				} else if (this.document !== node && !this.contains(node, item)) return;
				this.push(item, tag, null, classes, attributes, pseudos);
				return;
			}
			getByClass: if (classes && node.getElementsByClassName && !this.brokenGEBCN){
				children = node.getElementsByClassName(classList.join(' '));
				if (!(children && children.length)) break getByClass;
				for (i = 0; item = children[i++];) this.push(item, tag, id, null, attributes, pseudos);
				return;
			}
		}
		getByTag: {
			children = node.getElementsByTagName(tag);
			if (!(children && children.length)) break getByTag;
			if (!this.brokenStarGEBTN) tag = null;
			for (i = 0; item = children[i++];) this.push(item, tag, id, classes, attributes, pseudos);
		}
	},
	
	'>': function(node, tag, id, classes, attributes, pseudos){ // direct children
		if ((node = node.firstChild)) do {
			if (node.nodeType === 1) this.push(node, tag, id, classes, attributes, pseudos);
		} while ((node = node.nextSibling));
	},
	
	'+': function(node, tag, id, classes, attributes, pseudos){ // next sibling
		while ((node = node.nextSibling)) if (node.nodeType === 1){
			this.push(node, tag, id, classes, attributes, pseudos);
			break;
		}
	},

	'^': function(node, tag, id, classes, attributes, pseudos){ // first child
		node = node.firstChild;
		if (node){
			if (node.nodeType === 1) this.push(node, tag, id, classes, attributes, pseudos);
			else this['combinator:+'](node, tag, id, classes, attributes, pseudos);
		}
	},

	'~': function(node, tag, id, classes, attributes, pseudos){ // next siblings
		while ((node = node.nextSibling)){
			if (node.nodeType !== 1) continue;
			var uid = this.getUID(node);
			if (this.bitUniques[uid]) break;
			this.bitUniques[uid] = true;
			this.push(node, tag, id, classes, attributes, pseudos);
		}
	},

	'++': function(node, tag, id, classes, attributes, pseudos){ // next sibling and previous sibling
		this['combinator:+'](node, tag, id, classes, attributes, pseudos);
		this['combinator:!+'](node, tag, id, classes, attributes, pseudos);
	},

	'~~': function(node, tag, id, classes, attributes, pseudos){ // next siblings and previous siblings
		this['combinator:~'](node, tag, id, classes, attributes, pseudos);
		this['combinator:!~'](node, tag, id, classes, attributes, pseudos);
	},
	
	'!': function(node, tag, id, classes, attributes, pseudos){  // all parent nodes up to document
		while ((node = node.parentNode)) if (node !== document) this.push(node, tag, id, classes, attributes, pseudos);
	},
	
	'!>': function(node, tag, id, classes, attributes, pseudos){ // direct parent (one level)
		node = node.parentNode;
		if (node !== document) this.push(node, tag, id, classes, attributes, pseudos);
	},
	
	'!+': function(node, tag, id, classes, attributes, pseudos){ // previous sibling
		while ((node = node.previousSibling)) if (node.nodeType === 1){
			this.push(node, tag, id, classes, attributes, pseudos);
			break;
		}
	},
	
	'!^': function(node, tag, id, classes, attributes, pseudos){ // last child
		node = node.lastChild;
		if (node){
			if (node.nodeType === 1) this.push(node, tag, id, classes, attributes, pseudos);
			else this['combinator:!+'](node, tag, id, classes, attributes, pseudos);
		}
	},

	'!~': function(node, tag, id, classes, attributes, pseudos){ // previous siblings
		while ((node = node.previousSibling)){
			if (node.nodeType !== 1) continue;
			var uid = this.getUID(node);
			if (this.bitUniques[uid]) break;
			this.bitUniques[uid] = true;
			this.push(node, tag, id, classes, attributes, pseudos);
		}
	}

};

for (var c in combinators) local['combinator:' + c] = combinators[c];

var pseudos = {
	
	/*<pseudo-selectors>*/

	'empty': function(node){
		var child = node.firstChild;
		return !(child && child.nodeType == 1) && !(node.innerText || node.textContent || '').length;
	},

	'not': function(node, expression){
		return !this.matchNode(node, expression);
	},

	'contains': function(node, text){
		return (node.innerText || node.textContent || '').indexOf(text) > -1;
	},

	'first-child': function(node){
		while ((node = node.previousSibling)) if (node.nodeType === 1) return false;
		return true;
	},

	'last-child': function(node){
		while ((node = node.nextSibling)) if (node.nodeType === 1) return false;
		return true;
	},

	'only-child': function(node){
		var prev = node;
		while ((prev = prev.previousSibling)) if (prev.nodeType === 1) return false;
		var next = node;
		while ((next = next.nextSibling)) if (next.nodeType === 1) return false;
		return true;
	},
	
	/*<nth-pseudo-selectors>*/

	'nth-child': local.createNTHPseudo('firstChild', 'nextSibling', 'posNTH'),
	
	'nth-last-child': local.createNTHPseudo('lastChild', 'previousSibling', 'posNTHLast'),
	
	'nth-of-type': local.createNTHPseudo('firstChild', 'nextSibling', 'posNTHType', true),
	
	'nth-last-of-type': local.createNTHPseudo('lastChild', 'previousSibling', 'posNTHTypeLast', true),
	
	'index': function(node, index){
		return this['pseudo:nth-child'](node, '' + index + 1);
	},

	'even': function(node, argument){
		return this['pseudo:nth-child'](node, '2n');
	},

	'odd': function(node, argument){
		return this['pseudo:nth-child'](node, '2n+1');
	},
	
	/*</nth-pseudo-selectors>*/
	
	/*<of-type-pseudo-selectors>*/
	
	'first-of-type': function(node){
		var nodeName = node.nodeName;
		while ((node = node.previousSibling)) if (node.nodeName === nodeName) return false;
		return true;
	},
	
	'last-of-type': function(node){
		var nodeName = node.nodeName;
		while ((node = node.nextSibling)) if (node.nodeName === nodeName) return false;
		return true;
	},
	
	'only-of-type': function(node){
		var prev = node, nodeName = node.nodeName;
		while ((prev = prev.previousSibling)) if (prev.nodeName === nodeName) return false;
		var next = node;
		while ((next = next.nextSibling)) if (next.nodeName === nodeName) return false;
		return true;
	},
	
	/*</of-type-pseudo-selectors>*/

	// custom pseudos

	'enabled': function(node){
		return (node.disabled === false);
	},
	
	'disabled': function(node){
		return (node.disabled === true);
	},

	'checked': function(node){
		return node.checked;
	},

	'selected': function(node){
		return node.selected;
	},
	
	'focus': function(node){
		return !this.isXMLDocument && this.document.activeElement === node && (node.href || node.type || this.hasAttribute(node, 'tabindex'));
	}
	
	/*</pseudo-selectors>*/
};

for (var p in pseudos) local['pseudo:' + p] = pseudos[p];

// attributes methods

local.attributeGetters = {

	'class': function(){
		return ('className' in this) ? this.className : this.getAttribute('class');
	},
	
	'for': function(){
		return ('htmlFor' in this) ? this.htmlFor : this.getAttribute('for');
	},
	
	'href': function(){
		return ('href' in this) ? this.getAttribute('href', 2) : this.getAttribute('href');
	},
	
	'style': function(){
		return (this.style) ? this.style.cssText : this.getAttribute('style');
	}

};

local.getAttribute = function(node, name){
	// FIXME: check if getAttribute() will get input elements on a form on this browser
	// getAttribute is faster than getAttributeNode().nodeValue
	var method = this.attributeGetters[name];
	if (method) return method.call(node);
	var attributeNode = node.getAttributeNode(name);
	return attributeNode ? attributeNode.nodeValue : null;
};

// overrides

local.overrides = [];

local.override = function(regexp, method){
	this.overrides.push({regexp: regexp, method: method});
};

/*<overrides>*/

/*<query-selector-override>*/

local.override(/./, function(expression, found, first){ //querySelectorAll override

	if (!this.querySelectorAll || this.nodeType != 9 || local.isXMLDocument || local.brokenMixedCaseQSA || Slick.disableQSA) return false;
	
	var nodes, node;
	try {
		if (first) return this.querySelector(expression) || null;
		else nodes = this.querySelectorAll(expression);
	} catch(error){
		return false;
	}

	var i, hasOthers = !!(found.length);

	if (local.starSelectsClosedQSA) for (i = 0; node = nodes[i++];){
		if (node.nodeName > '@' && (!hasOthers || !local.uniques[local.getUIDHTML(node)])) found.push(node);
	} else for (i = 0; node = nodes[i++];){
		if (!hasOthers || !local.uniques[local.getUIDHTML(node)]) found.push(node);
	}

	if (hasOthers) local.sort(found);

	return true;

});

/*</query-selector-override>*/

/*<tag-override>*/

local.override(/^[\w-]+$|^\*$/, function(expression, found, first){ // tag override
	var tag = expression;
	if (tag == '*' && local.brokenStarGEBTN) return false;
	
	var nodes = this.getElementsByTagName(tag);
	
	if (first) return nodes[0] || null;
	var i, node, hasOthers = !!(found.length);
	
	for (i = 0; node = nodes[i++];){
		if (!hasOthers || !local.uniques[local.getUID(node)]) found.push(node);
	}
	
	if (hasOthers) local.sort(found);

	return true;
});

/*</tag-override>*/

/*<class-override>*/

local.override(/^\.[\w-]+$/, function(expression, found, first){ // class override
	if (local.isXMLDocument || (!this.getElementsByClassName && this.querySelectorAll)) return false;
	
	var nodes, node, i, hasOthers = !!(found && found.length), className = expression.substring(1);
	if (this.getElementsByClassName && !local.brokenGEBCN){
		nodes = this.getElementsByClassName(className);
		if (first) return nodes[0] || null;
		for (i = 0; node = nodes[i++];){
			if (!hasOthers || !local.uniques[local.getUIDHTML(node)]) found.push(node);
		}
	} else {
		var matchClass = new RegExp('(^|\\s)'+ Slick.escapeRegExp(className) +'(\\s|$)');
		nodes = this.getElementsByTagName('*');
		for (i = 0; node = nodes[i++];){
			className = node.className;
			if (!className || !matchClass.test(className)) continue;
			if (first) return node;
			if (!hasOthers || !local.uniques[local.getUIDHTML(node)]) found.push(node);
		}
	}
	if (hasOthers) local.sort(found);
	return (first) ? null : true;
});

/*</class-override>*/

/*<id-override>*/

local.override(/^#[\w-]+$/, function(expression, found, first){ // ID override
	if (local.isXMLDocument || this.nodeType != 9) return false;
	
	var id = expression.substring(1), el = this.getElementById(id);
	if (!el) return found;
	if (local.idGetsName && el.getAttributeNode('id').nodeValue != id) return false;
	if (first) return el || null;
	var hasOthers = !!(found.length);
	if (!hasOthers || !local.uniques[local.getUIDHTML(el)]) found.push(el);
	if (hasOthers) local.sort(found);
	return true;
});

/*</id-override>*/

/*</overrides>*/

if (typeof document != 'undefined') local.setDocument(document);

// Slick

var Slick = local.Slick = (this.Slick || {});

Slick.version = '0.9dev';

// Slick finder

Slick.search = function(context, expression, append){
	return local.search(context, expression, append);
};

Slick.find = function(context, expression){
	return local.search(context, expression, null, true);
};

// Slick containment checker

Slick.contains = function(container, node){
	local.setDocument(container);
	return local.contains(container, node);
};

// Slick attribute getter

Slick.getAttribute = function(node, name){
	return local.getAttribute(node, name);
};

// Slick matcher

Slick.match = function(node, selector){
	if (!(node && selector)) return false;
	if (!selector || selector === node) return true;
	if (typeof selector != 'string') return false;
	local.setDocument(node);
	return local.matchNode(node, selector);
};

// Slick attribute accessor

Slick.defineAttributeGetter = function(name, fn){
	local.attributeGetters[name] = fn;
	return this;
};

Slick.lookupAttributeGetter = function(name){
	return local.attributeGetters[name];
};

// Slick pseudo accessor

Slick.definePseudo = function(name, fn){
	local['pseudo:' + name] = function(node, argument){
		return fn.call(node, argument);
	};
	return this;
};

Slick.lookupPseudo = function(name){
	var pseudo = local['pseudo:' + name];
	if (pseudo) return function(argument){
		return pseudo.call(this, argument);
	};
	return null;
};

// Slick overrides accessor

Slick.override = function(regexp, fn){
	local.override(regexp, fn);
	return this;
};

Slick.isXML = local.isXML;

Slick.uidOf = function(node){
	return local.getUIDHTML(node);
};

if (!this.Slick) this.Slick = Slick;
	
}).apply(/*<CommonJS>*/(typeof exports != 'undefined') ? exports : /*</CommonJS>*/this);

/*
---

name: Element

description: One of the most important items in MooTools. Contains the dollar function, the dollars function, and an handful of cross-browser, time-saver methods to let you easily work with HTML Elements.

license: MIT-style license.

requires: [Window, Document, Array, String, Function, Number, Slick.Parser, Slick.Finder]

provides: [Element, Elements, $, $$, Iframe]

...
*/

// it needs to be this.Element cause IE8 erases the Element Object while pre-processing this script
this.Element = function(tag, props){
	var konstructor = Element.Constructors[tag];
	if (konstructor) return konstructor(props);
	if (typeof tag != 'string') return document.id(tag).set(props);
	
	if (!props) props = {};
	
	if (!tag.test(/^[\w-]+$/)){
		var parsed = Slick.parse(tag).expressions[0][0];
		tag = (parsed.tag == '*') ? 'div' : parsed.tag;
		if (parsed.id && props.id == null) props.id = parsed.id;
		
		var attributes = parsed.attributes;
		if (attributes) for (var i = 0, l = attributes.length; i < l; i++){
			var attr = attributes[i];
			if (attr.value != null && attr.operator == '=' && props[attr.key] == null)
				props[attr.key] = attr.value;
		}
		
		if (parsed.classList && props['class'] == null) props['class'] = parsed.classList.join(' ');
	}
	
	return document.newElement(tag, props);
};
	
if (Browser.Element) Element.prototype = Browser.Element.prototype;

new Type('Element', Element).mirror(function(name){
	var obj = {};
	obj[name] = function(){
		var results = [], args = arguments, elements = true;
		for (var i = 0, l = this.length; i < l; i++){
			var element = this[i], result = results[i] = element[name].apply(element, args);
			elements = (elements && typeOf(result) == 'element');
		}
		return (elements) ? new Elements(results) : results;
	};
	
	Elements.implement(obj);
});

if (!Browser.Element){
	Element.parent = Object;

	Element.ProtoType = {'$family': Function.from('element').hide()};

	Element.mirror(function(name, method){
		Element.ProtoType[name] = method;
	});
}

Element.Constructors = {};

//<1.2compat>

Element.Constructors = new Hash;

//</1.2compat>

var IFrame = new Type('IFrame', function(){
	var params = Array.link(arguments, {
		properties: Type.isObject,
		iframe: function(obj){
			return (obj != null);
		}
	});
	var props = params.properties || {};
	var iframe = document.id(params.iframe);
	var onload = props.onload || function(){};
	delete props.onload;
	props.id = props.name = [props.id, props.name, iframe ? (iframe.id || iframe.name) : 'IFrame_' + Date.now()].pick();
	iframe = new Element(iframe || 'iframe', props);
	var onFrameLoad = function(){
		var host = Function.attempt(function(){
			return iframe.contentWindow.location.host;
		});
		if (!host || host == window.location.host){
			var win = new Window(iframe.contentWindow);
			new Document(iframe.contentWindow.document);
			Object.append(win.Element.prototype, Element.ProtoType);
		}
		onload.call(iframe.contentWindow, iframe.contentWindow.document);
	};
	var contentWindow = Function.attempt(function(){
		return iframe.contentWindow;
	});
	((contentWindow && contentWindow.document.body) || window.frames[props.id]) ? onFrameLoad() : iframe.addListener('load', onFrameLoad);
	return iframe;
});
 
var Elements = this.Elements = function(nodes){
	if (nodes && nodes.length){
		var uniques = {}, node;
		for (var i = 0; node = nodes[i++];){
			var uid = Slick.uidOf(node);
			if (!uniques[uid]){
				uniques[uid] = true;
				this.push(node);
			}
		}
	}
};
 
Elements.prototype = {length: 0};
Elements.parent = Array;

new Type('Elements', Elements).implement({
 
	filter: function(filter, bind){
		if (!filter) return this;
		return new Elements(Array.filter(this, (typeOf(filter) == 'string') ? function(item){
			return item.match(filter);
		} : filter, bind));
	}.protect(),
 
	push: function(){
		var length = this.length;
		for (var i = 0, l = arguments.length; i < l; i++){
			var item = document.id(arguments[i]);
			if (item) this[length++] = item;
		}
		return (this.length = length);
	}.protect()
 
}).implement(Array.prototype);
 
Array.mirror(Elements);

Document.implement({

	newElement: function(tag, props){
		if (props && props.checked != null) props.defaultChecked = props.checked;
		return this.id(this.createElement(tag)).set(props);
	},

	newTextNode: function(text){
		return this.createTextNode(text);
	},

	getDocument: function(){
		return this;
	},

	getWindow: function(){
		return this.window;
	},
	
	id: (function(){
		
		var types = {

			string: function(id, nocash, doc){
				id = Slick.find(doc, '#' + id);
				return (id) ? types.element(id, nocash) : null;
			},
			
			element: function(el, nocash){
				$uid(el);
				if (!nocash && !el.$family && !(/^object|embed$/i).test(el.tagName)){
					Object.append(el, Element.ProtoType);
				}
				return el;
			},
			
			object: function(obj, nocash, doc){
				if (obj.toElement) return types.element(obj.toElement(doc), nocash);
				return null;
			}
			
		};

		types.textnode = types.whitespace = types.window = types.document = function(zero){
			return zero;
		};
		
		return function(el, nocash, doc){
			if (el && el.$family && el.uid) return el;
			var type = typeOf(el);
			return (types[type]) ? types[type](el, nocash, doc || document) : null;
		};

	})()

});

if (window.$ == null) Window.implement('$', function(el, nc){
	return document.id(el, nc, this.document);
});

Window.implement({

	getDocument: function(){
		return this.document;
	},

	getWindow: function(){
		return this;
	}

});

[Document, Element].invoke('implement', {
 
	getElements: function(expression){
		return Slick.search(this, expression, new Elements);
	},
 
	getElement: function(expression){
		return document.id(Slick.find(this, expression));
	}
 
});

//<1.2compat>

if (window.$$ == null) Window.implement('$$', function(selector){
	var elements = new Elements;
	if (arguments.length == 1 && typeof selector == 'string') return Slick.search(this.document, selector, elements);
	var args = Array.flatten(arguments);
	for (var i = 0, l = args.length; i < l; i++){
		var item = args[i];
		switch (typeOf(item)){
			case 'element': elements.push(item); break;
			case 'string': Slick.search(this.document, item, elements);
		}
	}
	return elements;
});

//</1.2compat>

if (window.$$ == null) Window.implement('$$', function(selector){
	if (arguments.length == 1){
		if (typeof selector == 'string') return Slick.search(this.document, selector, new Elements);
		else if (Type.isEnumerable(selector)) return new Elements(selector);
	}
	return new Elements(arguments);
});

(function(){

var collected = {}, storage = {};
var props = {input: 'checked', option: 'selected', textarea: 'value'};

var get = function(uid){
	return (storage[uid] || (storage[uid] = {}));
};

var clean = function(item){
	if (item.removeEvents) item.removeEvents();
	if (item.clearAttributes) item.clearAttributes();
	var uid = item.uid;
	if (uid != null){
		delete collected[uid];
		delete storage[uid];
	}
	return item;
};

var camels = ['defaultValue', 'accessKey', 'cellPadding', 'cellSpacing', 'colSpan', 'frameBorder', 'maxLength', 'readOnly',
	'rowSpan', 'tabIndex', 'useMap'
];
var bools = ['compact', 'nowrap', 'ismap', 'declare', 'noshade', 'checked', 'disabled', 'readOnly', 'multiple', 'selected',
	'noresize', 'defer'
];
 var attributes = {
	'html': 'innerHTML',
	'class': 'className',
	'for': 'htmlFor',
	'text': (function(){
		var temp = document.createElement('div');
		return (temp.innerText == null) ? 'textContent' : 'innerText';
	})()
};
var readOnly = ['type'];
var expandos = ['value', 'defaultValue'];
var uriAttrs = /^href|src|usemap$/i;

bools = bools.associate(bools);
camels = camels.associate(camels.map(String.toLowerCase));
readOnly = readOnly.associate(readOnly);

Object.append(attributes, expandos.associate(expandos));

var inserters = {

	before: function(context, element){
		var parent = element.parentNode;
		if (parent) parent.insertBefore(context, element);
	},

	after: function(context, element){
		var parent = element.parentNode;
		if (parent) parent.insertBefore(context, element.nextSibling);
	},

	bottom: function(context, element){
		element.appendChild(context);
	},

	top: function(context, element){
		element.insertBefore(context, element.firstChild);
	}

};

inserters.inside = inserters.bottom;

//<1.2compat>

Object.each(inserters, function(inserter, where){

	where = where.capitalize();
	
	var methods = {};
	
	methods['inject' + where] = function(el){
		inserter(this, document.id(el, true));
		return this;
	};
	
	methods['grab' + where] = function(el){
		inserter(document.id(el, true), this);
		return this;
	};

	Element.implement(methods);

});

//</1.2compat>

Element.implement({

	set: function(prop, value){
		var property = Element.Properties[prop];
		(property && property.set) ? property.set.call(this, value) : this.setProperty(prop, value);
	}.overloadSetter(),

	get: function(prop){
		var property = Element.Properties[prop];
		return (property && property.get) ? property.get.apply(this) : this.getProperty(prop);
	}.overloadGetter(),

	erase: function(prop){
		var property = Element.Properties[prop];
		(property && property.erase) ? property.erase.apply(this) : this.removeProperty(prop);
		return this;
	},

	setProperty: function(attribute, value){
		attribute = camels[attribute] || attribute;
		if (value == null) return this.removeProperty(attribute);
		var key = attributes[attribute];
		(key) ? this[key] = value :
			(bools[attribute]) ? this[attribute] = !!value : this.setAttribute(attribute, '' + value);
		return this;
	},

	setProperties: function(attributes){
		for (var attribute in attributes) this.setProperty(attribute, attributes[attribute]);
		return this;
	},

	getProperty: function(attribute){
		attribute = camels[attribute] || attribute;
		var key = attributes[attribute] || readOnly[attribute];
		return (key) ? this[key] :
			(bools[attribute]) ? !!this[attribute] :
			(uriAttrs.test(attribute) ? this.getAttribute(attribute, 2) :
			(key = this.getAttributeNode(attribute)) ? key.nodeValue : null) || null;
	},

	getProperties: function(){
		var args = Array.from(arguments);
		return args.map(this.getProperty, this).associate(args);
	},

	removeProperty: function(attribute){
		attribute = camels[attribute] || attribute;
		var key = attributes[attribute];
		(key) ? this[key] = '' :
			(bools[attribute]) ? this[attribute] = false : this.removeAttribute(attribute);
		return this;
	},

	removeProperties: function(){
		Array.each(arguments, this.removeProperty, this);
		return this;
	},

	hasClass: function(className){
		return this.className.contains(className, ' ');
	},

	addClass: function(className){
		if (!this.hasClass(className)) this.className = (this.className + ' ' + className).clean();
		return this;
	},

	removeClass: function(className){
		this.className = this.className.replace(new RegExp('(^|\\s)' + className + '(?:\\s|$)'), '$1');
		return this;
	},

	toggleClass: function(className, force){
		if (force == null) force = !this.hasClass(className);
		return (force) ? this.addClass(className) : this.removeClass(className);
	},

	adopt: function(){
		var parent = this, fragment, elements = Array.flatten(arguments), length = elements.length;
		if (length > 1) parent = fragment = document.createDocumentFragment();
		
		for (var i = 0; i < length; i++){
			var element = document.id(elements[i], true);
			if (element) parent.appendChild(element);
		}
		
		if (fragment) this.appendChild(fragment);
		
		return this;
	},

	appendText: function(text, where){
		return this.grab(this.getDocument().newTextNode(text), where);
	},

	grab: function(el, where){
		inserters[where || 'bottom'](document.id(el, true), this);
		return this;
	},

	inject: function(el, where){
		inserters[where || 'bottom'](this, document.id(el, true));
		return this;
	},

	replaces: function(el){
		el = document.id(el, true);
		el.parentNode.replaceChild(this, el);
		return this;
	},

	wraps: function(el, where){
		el = document.id(el, true);
		return this.replaces(el).grab(el, where);
	},

	getPrevious: function(match){
		return document.id(Slick.find(this, '!~ ' + (match || '')));
	},

	getAllPrevious: function(match){
		return Slick.search(this, '!~ ' + (match || ''), new Elements);
	},

	getNext: function(match){
		return document.id(Slick.find(this, '~ ' + (match || '')));
	},

	getAllNext: function(match){
		return Slick.search(this, '~ ' + (match || ''), new Elements);
	},

	getFirst: function(match){
		return document.id(Slick.find(this, '> ' + (match || '')));
	},

	getLast: function(match){
		return document.id(Slick.find(this, '!^ ' + (match || '')));
	},

	getParent: function(match){
		return document.id(Slick.find(this, '! ' + (match || '')));
	},

	getParents: function(match){
		return Slick.search(this, '! ' + (match || ''), new Elements);
	},
	
	getSiblings: function(match){
		return Slick.search(this, '~~ ' + (match || ''), new Elements);
	},

	getChildren: function(match){
		return Slick.search(this, '> ' + (match || ''), new Elements);
	},

	getWindow: function(){
		return this.ownerDocument.window;
	},

	getDocument: function(){
		return this.ownerDocument;
	},

	getElementById: function(id){
		return document.id(Slick.find(this, '#' + id));
	},

	getSelected: function(){
		this.selectedIndex; // Safari 3.2.1
		return new Elements(Array.from(this.options).filter(function(option){
			return option.selected;
		}));
	},

	toQueryString: function(){
		var queryString = [];
		this.getElements('input, select, textarea').each(function(el){
			var type = el.type;
			if (!el.name || el.disabled || type == 'submit' || type == 'reset' || type == 'file' || type == 'image') return;
			
			var value = (el.get('tag') == 'select') ? el.getSelected().map(function(opt){
				// IE
				return document.id(opt).get('value');
			}) : ((type == 'radio' || type == 'checkbox') && !el.checked) ? null : el.get('value');
			
			Array.from(value).each(function(val){
				if (typeof val != 'undefined') queryString.push(encodeURIComponent(el.name) + '=' + encodeURIComponent(val));
			});
		});
		return queryString.join('&');
	},

	clone: function(contents, keepid){
		contents = contents !== false;
		var clone = this.cloneNode(contents);
		var clean = function(node, element){
			if (!keepid) node.removeAttribute('id');
			if (Browser.ie){
				node.clearAttributes();
				node.mergeAttributes(element);
				node.removeAttribute('uid');
				if (node.options){
					var no = node.options, eo = element.options;
					for (var j = no.length; j--;) no[j].selected = eo[j].selected;
				}
			}
			var prop = props[element.tagName.toLowerCase()];
			if (prop && element[prop]) node[prop] = element[prop];
		};

		if (contents){
			var ce = clone.getElementsByTagName('*'), te = this.getElementsByTagName('*');
			for (var i = ce.length; i--;) clean(ce[i], te[i]);
		}

		clean(clone, this);
		return document.id(clone);
	},
	
	destroy: function(){
		var children = clean(this).getElementsByTagName('*');
		Array.each(children, clean);
		Element.dispose(this);
		return null;
	},
	
	empty: function(){
		Array.from(this.childNodes).each(Element.dispose);
		return this;
	},

	dispose: function(){
		return (this.parentNode) ? this.parentNode.removeChild(this) : this;
	},

	match: function(expression){
		return !expression || Slick.match(this, expression);
	}

});

var contains = {contains: function(element){
	return Slick.contains(this, element);
}};

if (!document.contains) Document.implement(contains);
if (!document.createElement('div').contains) Element.implement(contains);

//<1.2compat>

Element.implement('hasChild', function(element){
	return this !== element && this.contains(element);
});

//</1.2compat>

[Element, Window, Document].invoke('implement', {

	addListener: function(type, fn){
		if (type == 'unload'){
			var old = fn, self = this;
			fn = function(){
				self.removeListener('unload', fn);
				old();
			};
		} else {
			collected[this.uid] = this;
		}
		if (this.addEventListener) this.addEventListener(type, fn, false);
		else this.attachEvent('on' + type, fn);
		return this;
	},

	removeListener: function(type, fn){
		if (this.removeEventListener) this.removeEventListener(type, fn, false);
		else this.detachEvent('on' + type, fn);
		return this;
	},

	retrieve: function(property, dflt){
		var storage = get(this.uid), prop = storage[property];
		if (dflt != null && prop == null) prop = storage[property] = dflt;
		return prop != null ? prop : null;
	},

	store: function(property, value){
		var storage = get(this.uid);
		storage[property] = value;
		return this;
	},

	eliminate: function(property){
		var storage = get(this.uid);
		delete storage[property];
		return this;
	}

});

// IE purge
if (window.attachEvent && !window.addEventListener) window.addListener('unload', function(){
	Object.each(collected, clean);
	if (window.CollectGarbage) CollectGarbage();
});

})();

Element.Properties = {};

//<1.2compat>

Element.Properties = new Hash;

//</1.2compat>

Element.Properties.style = {

	set: function(style){
		this.style.cssText = style;
	},

	get: function(){
		return this.style.cssText;
	},

	erase: function(){
		this.style.cssText = '';
	}

};

Element.Properties.tag = {

	get: function(){
		return this.tagName.toLowerCase();
	}

};

(function(maxLength){
	if (maxLength != null) Element.Properties.maxlength = Element.Properties.maxLength = {
		get: function(){
			var maxlength = this.getAttribute('maxLength');
			return maxlength == maxLength ? null : maxlength;
		}
	};
})(document.createElement('input').getAttribute('maxLength'));

Element.Properties.html = (function(){
	
	var tableTest = Function.attempt(function(){
		var table = document.createElement('table');
		table.innerHTML = '<tr><td></td></tr>';
	});
	
	var wrapper = document.createElement('div');

	var translations = {
		table: [1, '<table>', '</table>'],
		select: [1, '<select>', '</select>'],
		tbody: [2, '<table><tbody>', '</tbody></table>'],
		tr: [3, '<table><tbody><tr>', '</tr></tbody></table>']
	};
	translations.thead = translations.tfoot = translations.tbody;

	var html = {
		set: function(){
			var html = Array.flatten(arguments).join('');
			var wrap = (!tableTest && translations[this.get('tag')]);
			if (wrap){
				var first = wrapper;
				first.innerHTML = wrap[1] + html + wrap[2];
				for (var i = wrap[0]; i--;) first = first.firstChild;
				this.empty().adopt(first.childNodes);
			} else {
				this.innerHTML = html;
			}
		}
	};

	html.erase = html.set;

	return html;
})();

/*
---

name: Element.Style

description: Contains methods for interacting with the styles of Elements in a fashionable way.

license: MIT-style license.

requires: Element

provides: Element.Style

...
*/

(function(){

var html = document.html;

Element.Properties.styles = {set: function(styles){
	this.setStyles(styles);
}};

var hasOpacity = (html.style.opacity != null);
var reAlpha = /alpha\(opacity=([\d.]+)\)/i;

var setOpacity = function(element, opacity){
	if (!element.currentStyle || !element.currentStyle.hasLayout) element.style.zoom = 1;
	if (hasOpacity){
		element.style.opacity = opacity;
	} else {
		opacity = (opacity == 1) ? '' : 'alpha(opacity=' + opacity * 100 + ')';
		var filter = element.style.filter || element.getComputedStyle('filter') || '';
		element.style.filter = filter.test(reAlpha) ? filter.replace(reAlpha, opacity) : filter + opacity;
	}
};

Element.Properties.opacity = {

	set: function(opacity){
		var visibility = this.style.visibility;
		if (opacity == 0 && visibility != 'hidden') this.style.visibility = 'hidden'
		else if (opacity != 0 && visibility != 'visible') this.style.visibility = 'visible';

		setOpacity(this, opacity);
	},

	get: (hasOpacity) ? function(){
		var opacity = this.style.opacity || this.getComputedStyle('opacity');
		return (opacity == '') ? 1 : opacity;
	} : function(){
		var opacity, filter = (this.style.filter || this.getComputedStyle('filter'));
		if (filter) opacity = filter.match(reAlpha);
		return (opacity == null || filter == null) ? 1 : (opacity[1] / 100);
	}

};

var floatName = (html.style.cssFloat == null) ? 'styleFloat' : 'cssFloat';

Element.implement({

	getComputedStyle: function(property){
		if (this.currentStyle) return this.currentStyle[property.camelCase()];
		var defaultView = Element.getDocument(this).defaultView,
			computed = defaultView ? defaultView.getComputedStyle(this, null) : null;
		return (computed) ? computed.getPropertyValue((property == floatName) ? 'float' : property.hyphenate()) : null;
	},

	setOpacity: function(value){
		setOpacity(this, value);
		return this;
	},

	getOpacity: function(){
		return this.get('opacity');
	},

	setStyle: function(property, value){
		switch (property){
			case 'opacity': return this.set('opacity', parseFloat(value));
			case 'float': property = floatName;
		}
		property = property.camelCase();
		if (typeOf(value) != 'string'){
			var map = (Element.Styles[property] || '@').split(' ');
			value = Array.from(value).map(function(val, i){
				if (!map[i]) return '';
				return (typeOf(val) == 'number') ? map[i].replace('@', Math.round(val)) : val;
			}).join(' ');
		} else if (value == String(Number(value))){
			value = Math.round(value);
		}
		this.style[property] = value;
		return this;
	},

	getStyle: function(property){
		switch (property){
			case 'opacity': return this.get('opacity');
			case 'float': property = floatName;
		}
		property = property.camelCase();
		var result = this.style[property];
		if (!result || property == 'zIndex'){
			result = [];
			for (var style in Element.ShortStyles){
				if (property != style) continue;
				for (var s in Element.ShortStyles[style]) result.push(this.getStyle(s));
				return result.join(' ');
			}
			result = this.getComputedStyle(property);
		}
		if (result){
			result = String(result);
			var color = result.match(/rgba?\([\d\s,]+\)/);
			if (color) result = result.replace(color[0], color[0].rgbToHex());
		}
		if (Browser.opera || (Browser.ie && isNaN(parseFloat(result)))){
			if (property.test(/^(height|width)$/)){
				var values = (property == 'width') ? ['left', 'right'] : ['top', 'bottom'], size = 0;
				values.each(function(value){
					size += this.getStyle('border-' + value + '-width').toInt() + this.getStyle('padding-' + value).toInt();
				}, this);
				return this['offset' + property.capitalize()] - size + 'px';
			}
			if (Browser.opera && String(result).test('px')) return result;
			if (property.test(/(border(.+)Width|margin|padding)/)) return '0px';
		}
		return result;
	},

	setStyles: function(styles){
		for (var style in styles) this.setStyle(style, styles[style]);
		return this;
	},

	getStyles: function(){
		var result = {};
		Array.flatten(arguments).each(function(key){
			result[key] = this.getStyle(key);
		}, this);
		return result;
	}

});

Element.Styles = {
	left: '@px', top: '@px', bottom: '@px', right: '@px',
	width: '@px', height: '@px', maxWidth: '@px', maxHeight: '@px', minWidth: '@px', minHeight: '@px',
	backgroundColor: 'rgb(@, @, @)', backgroundPosition: '@px @px', color: 'rgb(@, @, @)',
	fontSize: '@px', letterSpacing: '@px', lineHeight: '@px', clip: 'rect(@px @px @px @px)',
	margin: '@px @px @px @px', padding: '@px @px @px @px', border: '@px @ rgb(@, @, @) @px @ rgb(@, @, @) @px @ rgb(@, @, @)',
	borderWidth: '@px @px @px @px', borderStyle: '@ @ @ @', borderColor: 'rgb(@, @, @) rgb(@, @, @) rgb(@, @, @) rgb(@, @, @)',
	zIndex: '@', 'zoom': '@', fontWeight: '@', textIndent: '@px', opacity: '@'
};

//<1.2compat>

Element.Styles = new Hash(Element.Styles);

//</1.2compat>

Element.ShortStyles = {margin: {}, padding: {}, border: {}, borderWidth: {}, borderStyle: {}, borderColor: {}};

['Top', 'Right', 'Bottom', 'Left'].each(function(direction){
	var Short = Element.ShortStyles;
	var All = Element.Styles;
	['margin', 'padding'].each(function(style){
		var sd = style + direction;
		Short[style][sd] = All[sd] = '@px';
	});
	var bd = 'border' + direction;
	Short.border[bd] = All[bd] = '@px @ rgb(@, @, @)';
	var bdw = bd + 'Width', bds = bd + 'Style', bdc = bd + 'Color';
	Short[bd] = {};
	Short.borderWidth[bdw] = Short[bd][bdw] = All[bdw] = '@px';
	Short.borderStyle[bds] = Short[bd][bds] = All[bds] = '@';
	Short.borderColor[bdc] = Short[bd][bdc] = All[bdc] = 'rgb(@, @, @)';
});

})();

/*
---

name: Element.Dimensions

description: Contains methods to work with size, scroll, or positioning of Elements and the window object.

license: MIT-style license.

credits:
  - Element positioning based on the [qooxdoo](http://qooxdoo.org/) code and smart browser fixes, [LGPL License](http://www.gnu.org/licenses/lgpl.html).
  - Viewport dimensions based on [YUI](http://developer.yahoo.com/yui/) code, [BSD License](http://developer.yahoo.com/yui/license.html).

requires: [Element, Element.Style]

provides: [Element.Dimensions]

...
*/

(function(){

Element.implement({

	scrollTo: function(x, y){
		if (isBody(this)){
			this.getWindow().scrollTo(x, y);
		} else {
			this.scrollLeft = x;
			this.scrollTop = y;
		}
		return this;
	},

	getSize: function(){
		if (isBody(this)) return this.getWindow().getSize();
		return {x: this.offsetWidth, y: this.offsetHeight};
	},

	getScrollSize: function(){
		if (isBody(this)) return this.getWindow().getScrollSize();
		return {x: this.scrollWidth, y: this.scrollHeight};
	},

	getScroll: function(){
		if (isBody(this)) return this.getWindow().getScroll();
		return {x: this.scrollLeft, y: this.scrollTop};
	},

	getScrolls: function(){
		var element = this, position = {x: 0, y: 0};
		while (element && !isBody(element)){
			position.x += element.scrollLeft;
			position.y += element.scrollTop;
			element = element.parentNode;
		}
		return position;
	},

	getOffsetParent: function(){
		var element = this;
		if (isBody(element)) return null;
		if (!Browser.ie) return element.offsetParent;
		while ((element = element.parentNode)){
			if (styleString(element, 'position') != 'static' || isBody(element)) return element;
		}
		return null;
	},

	getOffsets: function(){
		if (this.getBoundingClientRect && !Browser.Platform.ipod){
			var bound = this.getBoundingClientRect(),
				html = document.id(this.getDocument().documentElement),
				htmlScroll = html.getScroll(),
				elemScrolls = this.getScrolls(),
				elemScroll = this.getScroll(),
				isFixed = (styleString(this, 'position') == 'fixed');

			return {
				x: bound.left.toInt() + elemScrolls.x - elemScroll.x + ((isFixed) ? 0 : htmlScroll.x) - html.clientLeft,
				y: bound.top.toInt()  + elemScrolls.y - elemScroll.y + ((isFixed) ? 0 : htmlScroll.y) - html.clientTop
			};
		}

		var element = this, position = {x: 0, y: 0};
		if (isBody(this)) return position;

		while (element && !isBody(element)){
			position.x += element.offsetLeft;
			position.y += element.offsetTop;

			if (Browser.firefox){
				if (!borderBox(element)){
					position.x += leftBorder(element);
					position.y += topBorder(element);
				}
				var parent = element.parentNode;
				if (parent && styleString(parent, 'overflow') != 'visible'){
					position.x += leftBorder(parent);
					position.y += topBorder(parent);
				}
			} else if (element != this && Browser.safari){
				position.x += leftBorder(element);
				position.y += topBorder(element);
			}

			element = element.offsetParent;
		}
		if (Browser.firefox && !borderBox(this)){
			position.x -= leftBorder(this);
			position.y -= topBorder(this);
		}
		return position;
	},

	getPosition: function(relative){
		if (isBody(this)) return {x: 0, y: 0};
		var offset = this.getOffsets(),
				scroll = this.getScrolls();
		var position = {
			x: offset.x - scroll.x,
			y: offset.y - scroll.y
		};
		var relativePosition = (relative && (relative = document.id(relative))) ? relative.getPosition() : {x: 0, y: 0};
		return {x: position.x - relativePosition.x, y: position.y - relativePosition.y};
	},

	getCoordinates: function(element){
		if (isBody(this)) return this.getWindow().getCoordinates();
		var position = this.getPosition(element),
				size = this.getSize();
		var obj = {
			left: position.x,
			top: position.y,
			width: size.x,
			height: size.y
		};
		obj.right = obj.left + obj.width;
		obj.bottom = obj.top + obj.height;
		return obj;
	},

	computePosition: function(obj){
		return {
			left: obj.x - styleNumber(this, 'margin-left'),
			top: obj.y - styleNumber(this, 'margin-top')
		};
	},

	setPosition: function(obj){
		return this.setStyles(this.computePosition(obj));
	}

});


[Document, Window].invoke('implement', {

	getSize: function(){
		if (Browser.opera || Browser.safari){
			var win = this.getWindow();
			return {x: win.innerWidth, y: win.innerHeight};
		}
		var doc = getCompatElement(this);
		return {x: doc.clientWidth, y: doc.clientHeight};
	},

	getScroll: function(){
		var win = this.getWindow(), doc = getCompatElement(this);
		return {x: win.pageXOffset || doc.scrollLeft, y: win.pageYOffset || doc.scrollTop};
	},

	getScrollSize: function(){
		var doc = getCompatElement(this),
			min = this.getSize(),
			body = this.getDocument().body;
		
		return {x: Math.max(doc.scrollWidth, body.scrollWidth, min.x), y: Math.max(doc.scrollHeight, body.scrollHeight, min.y)};
	},

	getPosition: function(){
		return {x: 0, y: 0};
	},

	getCoordinates: function(){
		var size = this.getSize();
		return {top: 0, left: 0, bottom: size.y, right: size.x, height: size.y, width: size.x};
	}

});

// private methods

var styleString = Element.getComputedStyle;

function styleNumber(element, style){
	return styleString(element, style).toInt() || 0;
};

function borderBox(element){
	return styleString(element, '-moz-box-sizing') == 'border-box';
};

function topBorder(element){
	return styleNumber(element, 'border-top-width');
};

function leftBorder(element){
	return styleNumber(element, 'border-left-width');
};

function isBody(element){
	return (/^(?:body|html)$/i).test(element.tagName);
};

function getCompatElement(element){
	var doc = element.getDocument();
	return (!doc.compatMode || doc.compatMode == 'CSS1Compat') ? doc.html : doc.body;
};

})();

//aliases
Element.alias({position: 'setPosition'}); //compatability

[Window, Document, Element].invoke('implement', {

	getHeight: function(){
		return this.getSize().y;
	},

	getWidth: function(){
		return this.getSize().x;
	},

	getScrollTop: function(){
		return this.getScroll().y;
	},

	getScrollLeft: function(){
		return this.getScroll().x;
	},

	getScrollHeight: function(){
		return this.getScrollSize().y;
	},

	getScrollWidth: function(){
		return this.getScrollSize().x;
	},

	getTop: function(){
		return this.getPosition().y;
	},

	getLeft: function(){
		return this.getPosition().x;
	}

});

/*
---

script: Element.Measure.js

name: Element.Measure

description: Extends the Element native object to include methods useful in measuring dimensions.

credits: "Element.measure / .expose methods by Daniel Steigerwald License: MIT-style license. Copyright: Copyright (c) 2008 Daniel Steigerwald, daniel.steigerwald.cz"

license: MIT-style license

authors:
  - Aaron Newton

requires:
  - Core/Element.Style
  - Core/Element.Dimensions
  - /MooTools.More

provides: [Element.Measure]

...
*/

(function(){

var getStylesList = function(styles, planes){
	var list = [];
	Object.each(planes, function(directions){
		Object.each(directions, function(edge){
			styles.each(function(style){
				if (style == 'border') list.push(style + '-' + edge + '-width');
				else list.push(style + '-' + edge);
			});
		});
	});
	return list;
};

var calculateEdgeSize = function(edge, styles){
	var total = 0;
	Object.each(styles, function(value, style){
		if (style.test(edge)) total += value.toInt();
	});
	return total;
};


Element.implement({

	measure: function(fn){
		var visibility = function(el){
			return !!(!el || el.offsetHeight || el.offsetWidth);
		};
		if (visibility(this)) return fn.apply(this);
		var parent = this.getParent(),
			restorers = [],
			toMeasure = [];
		while (!visibility(parent) && parent != document.body){
			toMeasure.push(parent.expose());
			parent = parent.getParent();
		}
		var restore = this.expose();
		var result = fn.apply(this);
		restore();
		toMeasure.each(function(restore){
			restore();
		});
		return result;
	},

	expose: function(){
		if (this.getStyle('display') != 'none') return function(){};
		var before = this.style.cssText;
		this.setStyles({
			display: 'block',
			position: 'absolute',
			visibility: 'hidden'
		});
		return function(){
			this.style.cssText = before;
		}.bind(this);
	},

	getDimensions: function(options){
		options = Object.merge({computeSize: false}, options);
		var dim = {};
		
		var getSize = function(el, options){
			return (options.computeSize) ? el.getComputedSize(options) : el.getSize();
		};
		
		var parent = this.getParent('body');
		
		if (parent && this.getStyle('display') == 'none'){
			dim = this.measure(function(){
				return getSize(this, options);
			});
		} else if (parent){
			try { //safari sometimes crashes here, so catch it
				dim = getSize(this, options);
			}catch(e){}
		} else {
			dim = {x: 0, y: 0};
		}
		
		return Object.append(dim, (dim.x || dim.x === 0) ?  {
				width: dim.x,
				height: dim.y
			} : {
				x: dim.width,
				y: dim.height
			}
		);
	},

	getComputedSize: function(options){
		//<1.2compat>
		//legacy support for my stupid spelling error
		if (options && options.plains) options.planes = options.plains;
		//</1.2compat>
		
		options = Object.merge({
			styles: ['padding','border'],
			planes: {
				height: ['top','bottom'],
				width: ['left','right']
			},
			mode: 'both'
		}, options);

		var styles = {},
			size = {width: 0, height: 0};

		switch (options.mode){
			case 'vertical':
				delete size.width;
				delete options.planes.width;
				break;
			case 'horizontal':
				delete size.height;
				delete options.planes.height;
				break;
		}


		getStylesList(options.styles, options.planes).each(function(style){
			styles[style] = this.getStyle(style).toInt();
		}, this);

		Object.each(options.planes, function(edges, plane){

			var capitalized = plane.capitalize();
			styles[plane] = this.getStyle(plane).toInt();
			size['total' + capitalized] = styles[plane];

			edges.each(function(edge){
				var edgesize = calculateEdgeSize(edge, styles);
				size['computed' + edge.capitalize()] = edgesize;
				size['total' + capitalized] += edgesize;
			});
			
		}, this);
		
		return Object.append(size, styles);
	}

});

})();

/*
---

name: Fx.CSS

description: Contains the CSS animation logic. Used by Fx.Tween, Fx.Morph, Fx.Elements.

license: MIT-style license.

requires: [Fx, Element.Style]

provides: Fx.CSS

...
*/

Fx.CSS = new Class({

	Extends: Fx,

	//prepares the base from/to object

	prepare: function(element, property, values){
		values = Array.from(values);
		if (values[1] == null){
			values[1] = values[0];
			values[0] = element.getStyle(property);
		}
		var parsed = values.map(this.parse);
		return {from: parsed[0], to: parsed[1]};
	},

	//parses a value into an array

	parse: function(value){
		value = Function.from(value)();
		value = (typeof value == 'string') ? value.split(' ') : Array.from(value);
		return value.map(function(val){
			val = String(val);
			var found = false;
			Object.each(Fx.CSS.Parsers, function(parser, key){
				if (found) return;
				var parsed = parser.parse(val);
				if (parsed || parsed === 0) found = {value: parsed, parser: parser};
			});
			found = found || {value: val, parser: Fx.CSS.Parsers.String};
			return found;
		});
	},

	//computes by a from and to prepared objects, using their parsers.

	compute: function(from, to, delta){
		var computed = [];
		(Math.min(from.length, to.length)).times(function(i){
			computed.push({value: from[i].parser.compute(from[i].value, to[i].value, delta), parser: from[i].parser});
		});
		computed.$family = Function.from('fx:css:value');
		return computed;
	},

	//serves the value as settable

	serve: function(value, unit){
		if (typeOf(value) != 'fx:css:value') value = this.parse(value);
		var returned = [];
		value.each(function(bit){
			returned = returned.concat(bit.parser.serve(bit.value, unit));
		});
		return returned;
	},

	//renders the change to an element

	render: function(element, property, value, unit){
		element.setStyle(property, this.serve(value, unit));
	},

	//searches inside the page css to find the values for a selector

	search: function(selector){
		if (Fx.CSS.Cache[selector]) return Fx.CSS.Cache[selector];
		var to = {};
		Array.each(document.styleSheets, function(sheet, j){
			var href = sheet.href;
			if (href && href.contains('://') && !href.contains(document.domain)) return;
			var rules = sheet.rules || sheet.cssRules;
			Array.each(rules, function(rule, i){
				if (!rule.style) return;
				var selectorText = (rule.selectorText) ? rule.selectorText.replace(/^\w+/, function(m){
					return m.toLowerCase();
				}) : null;
				if (!selectorText || !selectorText.test('^' + selector + '$')) return;
				Element.Styles.each(function(value, style){
					if (!rule.style[style] || Element.ShortStyles[style]) return;
					value = String(rule.style[style]);
					to[style] = (value.test(/^rgb/)) ? value.rgbToHex() : value;
				});
			});
		});
		return Fx.CSS.Cache[selector] = to;
	}

});

Fx.CSS.Cache = {};

Fx.CSS.Parsers = {

	Color: {
		parse: function(value){
			if (value.match(/^#[0-9a-f]{3,6}$/i)) return value.hexToRgb(true);
			return ((value = value.match(/(\d+),\s*(\d+),\s*(\d+)/))) ? [value[1], value[2], value[3]] : false;
		},
		compute: function(from, to, delta){
			return from.map(function(value, i){
				return Math.round(Fx.compute(from[i], to[i], delta));
			});
		},
		serve: function(value){
			return value.map(Number);
		}
	},

	Number: {
		parse: parseFloat,
		compute: Fx.compute,
		serve: function(value, unit){
			return (unit) ? value + unit : value;
		}
	},

	String: {
		parse: Function.from(false),
		compute: function(zero, one){
			return one;
		},
		serve: function(zero){
			return zero;
		}
	}

};

//<1.2compat>

Fx.CSS.Parsers = new Hash(Fx.CSS.Parsers);

//</1.2compat>

/*
---

name: Fx.Tween

description: Formerly Fx.Style, effect to transition any CSS property for an element.

license: MIT-style license.

requires: Fx.CSS

provides: [Fx.Tween, Element.fade, Element.highlight]

...
*/

Fx.Tween = new Class({

	Extends: Fx.CSS,

	initialize: function(element, options){
		this.element = this.subject = document.id(element);
		this.parent(options);
	},

	set: function(property, now){
		if (arguments.length == 1){
			now = property;
			property = this.property || this.options.property;
		}
		this.render(this.element, property, now, this.options.unit);
		return this;
	},

	start: function(property, from, to){
		if (!this.check(property, from, to)) return this;
		var args = Array.flatten(arguments);
		this.property = this.options.property || args.shift();
		var parsed = this.prepare(this.element, this.property, args);
		return this.parent(parsed.from, parsed.to);
	}

});

Element.Properties.tween = {
	
	set: function(options){
		this.get('tween').cancel().setOptions(options);
		return this;
	},

	get: function(){
		var tween = this.retrieve('tween');
		if (!tween){
			tween = new Fx.Tween(this, {link: 'cancel'});
			this.store('tween', tween);
		}
		return tween;
	}

};

Element.implement({

	tween: function(property, from, to){
		this.get('tween').start(arguments);
		return this;
	},

	fade: function(how){
		var fade = this.get('tween'), o = 'opacity', toggle;
		how = [how, 'toggle'].pick();
		switch (how){
			case 'in': fade.start(o, 1); break;
			case 'out': fade.start(o, 0); break;
			case 'show': fade.set(o, 1); break;
			case 'hide': fade.set(o, 0); break;
			case 'toggle':
				var flag = this.retrieve('fade:flag', this.get('opacity') == 1);
				fade.start(o, (flag) ? 0 : 1);
				this.store('fade:flag', !flag);
				toggle = true;
			break;
			default: fade.start(o, arguments);
		}
		if (!toggle) this.eliminate('fade:flag');
		return this;
	},

	highlight: function(start, end){
		if (!end){
			end = this.retrieve('highlight:original', this.getStyle('background-color'));
			end = (end == 'transparent') ? '#fff' : end;
		}
		var tween = this.get('tween');
		tween.start('background-color', start || '#ffff88', end).chain(function(){
			this.setStyle('background-color', this.retrieve('highlight:original'));
			tween.callChain();
		}.bind(this));
		return this;
	}

});

/*
---
 
script: Animation.js
 
description: Animated ways to show/hide widget
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Mixin
  - Core/Fx.Tween
 
provides: 
  - LSD.Mixin.Animation
 
...
*/

LSD.Mixin.Animation = new Class({
  
  options: {
    animation: {}
  },
  
  getAnimation: function() {
    if (!this.animation) {
      this.animation = this.getAnimatedElement().set('tween', this.options.animation).get('tween');
      if (this.options.animation.value) this.animation.set(this.options.animation.value);
    }
    return this.animation;
  },
  
  fade: function(how){
    return this.getAnimation().start('opacity', how == 'in' ? 1 : 0);
  },
  
  slide: function(how){
    this.getAnimatedElement().store('style:overflow', this.getAnimatedElement().getStyle('overflow'));
    this.getAnimatedElement().setStyle('overflow', 'hidden');
    return this.getAnimation().start('height', how == 'in' ? this.getAnimatedElement().scrollHeight - this.getAnimatedElement().offsetHeight : 0);
  },
  
  show: function() {
    var parent = this.parent;
    this.getAnimatedElement().setStyle('display', this.getAnimatedElement().retrieve('style:display') || 'inherit');
    this[this.attributes.animation]('in').chain(function(){
      this.getAnimatedElement().setStyle('overflow', this.getAnimatedElement().retrieve('style:overflow') || 'inherit');
      LSD.Widget.prototype.show.apply(this, arguments);
    }.bind(this));
  },
  
  hide: function(how) {
    var parent = this;
    this[this.attributes.animation]('out').chain(function(){
      this.getAnimatedElement().setStyle('overflow', this.getAnimatedElement().retrieve('style:overflow') || 'inherit');
      this.getAnimatedElement().store('style:display', this.getAnimatedElement().getStyle('display'));
      this.getAnimatedElement().setStyle('display', 'none');
      LSD.Widget.prototype.hide.apply(this, arguments);
    }.bind(this));
  },
  
  remove: function() {
    return this[this.attributes.animation]('out').chain(this.dispose.bind(this));
  },
  
  dispose: function() {
    return this.getAnimatedElement().dispose()
  },
  
  getAnimatedElement: function() {
    return this.element;
  }
  
});

LSD.Behavior.define('[animation]', LSD.Mixin.Animation);
/*
---
 
script: Styles.js
 
description: Set, get and render different kind of styles on widget
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module
  - Core/Element.Style
  - Ext/FastArray
  - Sheet/SheetParser.Styles

provides: 
  - LSD.Module.Styles

...
*/

!function() {
  
var CSS = SheetParser.Styles, Paint = LSD.Styles;
var setStyle = function(element, property, value, type) {
  delete this.style.expressed[property];
  delete this.style.calculated[property];
  if (value === false) {
    if (element && this.element) delete this.element.style[property];
    delete this.style[element ? 'element' : 'paint'][property], delete this.style.current[property];
    if (type) delete this.style[type][property];
  } else {
    if (element && this.element) this.element.style[property] = (typeof value == 'number') ? value + 'px' : value;
    this.style[element ? 'element' : 'paint'][property] = this.style.current[property] = value;
    if (type) this.style[type][property] = value;
  }
}

LSD.Module.Styles = new Class({
  initializers: {
    style: function() {
      this.rules = [];
      this.style = {    // Styles that...
        current: {},    // ... widget currently has
        found: {},      // ... were found in stylesheets
        given: {},      // ... were manually assigned

        changed: {},    // ... came from stylesheet since last render
        calculated: {}, // ... are calculated in runtime
        computed: {},   // ... are already getStyled
        expressed: {},  // ... are expressed through function
        implied: {},    // ... are assigned by environment

        element: {},    // ... are currently assigned to element
        paint: {}       // ... are currently used to paint
      };
    }
  },

  setStyle: function(property, value) {
    var paint, css;
    if (!(paint = Paint[property]) && !(css = CSS[property])) return false;
    var length = arguments.length;
    if (length > 2) {
      var last = arguments[length - 1];
      if (this.style[last || 'given']) {
        var type = last;
        length--;
      }
      if (length > 2) value = Array.prototype.splice.call(arguments, 1, length);
    }
    if (value.call) {
      var expression = value;
      value = value.call(this, property);
    }
    var result = (css || paint)[value.push ? 'apply' : 'call'](this, value);
    if (result === true || result === false) setStyle.call(this, css, property, value, type);
    else for (var prop in result) setStyle.call(this, css, prop, result[prop], type);
    if (expression) {
      this.style.expressed[property] = expression
      this.style.computed[property] = value
    }
    return result;
  },

  setStyles: function(style, type) {
    for (var key in style) this.setStyle(key, style[key], type)
  },

  getStyle: function(property) {
    if (this.style.computed[property]) return this.style.computed[property];
    var value;
    var definition = Paint[property] || CSS[property];
    if (!definition) return;
    if (definition.properties) return definition.properties.map(this.getStyle.bind(this));
    var expression = this.style.expressed[property];    
    if (expression) {
      value = this.style.current[property] = this.calculateStyle(property, expression);
    } else {  
      value = this.style.current[property];
      if (property == 'height') {
        if (typeof value !== 'number') value = this.getClientHeight();
      } else if (property == 'width') {
        if (typeof value !== 'number') value = this.getClientWidth();
      } else {
        if (value == "inherit") value = this.inheritStyle(property);
        if (value == "auto") value = this.calculateStyle(property);
      }
    }
    this.style.computed[property] = value;
    return value;
  },

  getStyles: function(properties) {
    var result = {};
    for (var i = 0, property, args = arguments; property = args[i++];) result[property] = this.getStyle(property);
    return result;
  },
  
  renderStyles: function(styles) {
    var style = this.style, 
        current = style.current,
        paint = style.paint, 
        element = style.element,  
        found = style.found,
        implied = style.implied,
        calculated = style.calculated,
        given = Object.append(style.given, styles),
        changed = style.changed;
    this.setStyles(given, 'given')
    for (var property in found) if ((property in changed) && !(property in given)) this.setStyle(property, found[property]);
    Object.append(style.current, style.implied);
    for (var property in element)  {
      if (!(property in given) && !(property in found) && !(property in calculated) && !(property in implied)) {
        this.element.style[property] = '';
        delete element[property]
      }
    }
    for (var property in current)  {
      if (!(property in given) && !(property in found) && !(property in calculated) && !(property in implied)) {
        delete current[property];
        delete paint[property];
      }
    }
  },
  
  combineRules: function(rule) {
    var rules = this.rules, style = this.style, found = style.found = {}, implied = style.implied = {}, changed = style.changed;
    for (var j = rules.length, other; other = rules[--j];) {
      var setting = other.style, implying = other.implied, self = (rule == other);
      if (setting) for (var property in setting) if (!(property in found)) {
        if (self) changed[property] = setting[property];
        found[property] = setting[property];
      }
      if (implying) for (var property in implying) if (!(property in implied)) implied[property] = implying[property];
    }
  },
  
  addRule: function(rule) {
    var rules = this.rules;
    if (rules.indexOf(rule) > -1) return
    for (var i = 0, other;  other = rules[i++];) {
      if ((other.specificity > rule.specificity) || (other.specificity == rule.specificity)) 
        if (other.index > rule.index) break;
    }
    rules.splice(--i, 0, rule);
    this.combineRules(rule);
  },
  
  removeRule: function(rule) {
    var rules = this.rules, index = rules.indexOf(rule)
    if (index == -1) return
    rules.splice(index, 1);
    this.combineRules();
    var style = this.style, found = style.found, changed = style.changed, setting = rule.style;
    for (var property in setting) if (!Object.equals(found[property], setting[property])) changed[property] = found[property];
 },
  
  inheritStyle: function(property) {
    var node = this;
    var style = node.style.current[property];
    while ((style == 'inherit' || !style) && (node = node.parentNode)) style = node.style.current[property];
    return style;
  },
  
  calculateStyle: function(property, expression) {
    if (this.style.calculated[property]) return this.style.calculated[property];
    var value;
    if (expression) {
      value = expression.call(this, property);
    } else {
      switch (property) {
        case "height":
          value = this.getClientHeight();
        case "width":
          value = this.inheritStyle(property);
          if (value == "auto") value = this.getClientWidth();
        case "height": case "width":  
          //if dimension size is zero, then the widget is not in DOM yet
          //so we wait until the root widget is injected, and then try to repeat
          if (value == 0 && (this.redraws == 0)) this.halt();
      }
    }
    this.style.calculated[property] = value;
    return value;
  },
  
  render: function(style) {
    this.renderStyles(style);
    this.parent.apply(this, arguments);
  }
});

LSD.Module.Styles.events = {
  update: function() {
    this.style.calculated = {};
    this.style.computed = {};
  }
};

LSD.addEvents(LSD.Module.Styles.prototype, LSD.Module.Styles.events);

LSD.Options.styles = {
  add: 'setStyles',
  remove: 'unsetStyles'
};
}();
/*
---
 
script: Layer.js
 
description: Adds a piece of SVG that can be drawn with widget styles
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - ART/ART.Shape
  - LSD.Module.Styles
  - Sheet/SheetParser.Styles
 
provides: 
  - LSD.Layer
  - LSD.Layer.Shaped
 
...
*/

!function() {
  
LSD.Layer = function(name, styles, painters) {
  this.name = name;
  this.styles = styles;
  this.painters = painters;
}

LSD.Layer.prototype = {
  render: function(widget, commands) {
    var canvas = widget.getCanvas();
    var shape = commands.shape;
    if (shape == 'none') return;
    if (!shape) shape = widget.getStyle('shape') || 'rectangle';
    var layer = widget.shapes[this.name];
    if (shape.glyph) {
      var glyph = ART.Glyphs[shape.glyph];
      if (!glyph) return;    
      var path = new ART.Path(glyph);
      var box = path.measure();
      if (!layer) layer = new ART.Shape(path, box.width, box.height);
      if (commands.size && !Object.equals(previous ? previous.size : box, commands.size))
        layer.resizeTo(commands.size.width, commands.size.height)
        
    } else if (!shape.indexOf){
      for (var name in shape) {
        var values = shape[name];
        if (!values.push) values = [values];
        shape = name;
      }
    }
    if (!layer) {
      var path = ART.Shape[shape.capitalize()];
      if (!path) return;
      var layer = new path;
      layer.render(commands)
    } else {
      var previous = layer.commands;
      if (layer.draw && layer.render) layer.render(commands)
    }
    layer.commands = commands;
    widget.shapes[this.name] = layer;
    for (command in commands) {
      var value = commands[command];
      if (layer[command] && command != 'move') {
        if (!value || !previous || !Object.equals(previous[command], value)) layer[command][value && value.push ? 'apply' : 'call'](layer, value);
      }
    }
    var translate = commands.translate = {x: 0, y: 0}
    if (commands.inside) {
      translate.x += commands.inside.left
      translate.y += commands.inside.top;
    };
    //if (commands.outside) {
    //  top += commands.outside.top;
    //  left += commands.outside.left
    //};
    if (commands.move) {
      translate.x += commands.move.x;
      translate.y += commands.move.y;
    }
    if (!previous || !Object.equals(previous.translate, translate)) layer.moveTo(translate.x, translate.y)
  },
  
  draw: function(widget, context, previous) {
    context = Object.append({size: widget.size, style: widget.style.current}, context || {});
    if (context.style.cornerRadiusTopLeft !== null) {
      context.radius = widget.getStyle('cornerRadius')
    }
    var inherited = {}, overwritten = {};
    for (var painter, i = 0; painter = this.painters[i++];) {
      var commands = painter.paint.apply(context, painter.keys.map(function(prop) { return widget.getStyle(prop)}));
      for (var name in commands) {
        var value = commands[name];
        if (Inherit[name]) {;
          inherited[name] = merge(value, context[name])
        } else {
          if (!Accumulate[name]) overwritten[name] = context[name]
          context[name] = (Accumulate[name] || Merge[name]) ? merge(value, context[name]) : value;
        }
      }
      //for (var command in value) this[command](command[value]);
    }    
    this.render(widget, context);
    return Object.append(context, overwritten, inherited);;
  }
}

var merge = function(value, old) {
  if (typeof value == "object") {
    if (value.push) {
      for (var j = 0, k = value.length; j < k; j++) {
        var item = value[j] || 0;
        if (old) old[j] = (old[j] || 0) + item;
        else old = [item]
      }
      return old;
    } else if (!value.indexOf) {
      for (var prop in value) {
        var item = value[prop] || 0;
        if (!old) old = {}
        old[prop] = (old[prop] || 0) + item;
      }
      return old;
    }
  }  
  return value;
}

var Accumulate = LSD.Layer.accumulated = new FastArray('translate', 'radius');
var Inherit = LSD.Layer.inherited = new FastArray('inside', 'outside')
var Merge = LSD.Layer.merged = new FastArray('size')

var Property = SheetParser.Property;
var Styles = LSD.Styles;
var Map = LSD.Layer.Map = {};
var Cache = LSD.Layer.Cache = {};

//LSD.Layer.getProperty = function(property, properties)
 
LSD.Layer.generate = function(name, layers) {
  if (arguments.length > 2) layers = Array.prototype.splice.call(arguments, 1);
  var painters = [];
  var styles = LSD.Layer.prepare(name, layers, function(painter) {
    painters.push(painter)
  })
  return new LSD.Layer(name, styles, painters);
};

LSD.Layer.prepare = function(name, layers, callback) {
  var properties = [], styles = {};
  for (var i = 0, layer; layer = layers[i++];) {
    var definition = LSD.Layer[layer.capitalize()];
    if (!definition ) continue;
    var properties = definition.properties && Object.clone(definition.properties);
    if (!properties) continue;
    definition = Object.append({styles: {}, keys: []}, definition);
    var prefix = definition.prefix;
    if (prefix === false || layer == name) prefix = name;
    else if (!prefix) prefix = name + layer.capitalize();
    var length = 0;
    for (var property in properties) length++
    var simple = (length == 1);
    Object.each(properties, function(value, property) {
      if (property == layer) {
        if (simple) var style = prefix
        else return;
      } else var style = prefix + property.capitalize()
      definition.styles[style] = styles[style] = Property.compile(value, properties);
      definition.keys.push(style);
    });
    var shorthand = properties[layer];
    if (shorthand && !simple) {
      var style = (layer == name) ? name : name + layer.capitalize();
      if (length) {
        for (var j = 0, k = 0, l = 0, prop; prop = shorthand[j]; j++) {
          if (!prop.push) { 
            if (properties[prop]) {
              shorthand[j] = prefix + prop.capitalize();
              k++
            }
          } else for (var m = 0, sub; sub = prop[m]; m++) {
            if (properties[sub]) {
              prop[m] = prefix + sub.capitalize();
              l++;
            }
          }
        }
      }
      definition.styles[style] = styles[style] = Property.compile(((l > 0 && (k > 0 || j == 1)) ) ? [shorthand] : shorthand, styles);
      definition.shorthand = style;
    }
    if (definition.onCompile) definition.onCompile(name);
    if (callback) callback(definition);
  }
  for (var property in styles) {
    Styles[property] = styles[property];
    Map[property] = name;
  }
  return styles;
}

LSD.Layer.get = function(name) {
  var key = name//Array.flatten(arguments).join('');
  if (Cache[key]) return Cache[key];
  else return (Cache[key] = LSD.Layer.generate.apply(LSD.Layer, arguments))
}

}();
/*
---
 
script: Color.js
 
description: Fills shape with color
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
- LSD.Layer
 
provides: [LSD.Layer.Color, LSD.Layer.Fill]
 
...
*/

LSD.Layer.Color = {
  properties: {
    color: ['color', 'gradient', 'none']
  },
  
  paint: function(color) {
    if (color) var radial = color['radial-gradient'], gradient = color['gradient'] || color ['linear-gradient'];
    if (gradient) {
      return {fillLinear: [gradient]}
    } else if (!radial) {
      return {fill: (!color || color == 'none') ? null : color} 
    }
  }
};

LSD.Layer.Fill = {
  properties: {
    color: ['color']
  },
  
  prefix: 'fill',
  
  paint: LSD.Layer.Color.paint
};
/*
---
 
script: Stroke.js
 
description: Fills shape with color and strokes with a stroke
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Layer
  - LSD.Layer.Color
 
provides: 
  - LSD.Layer.Stroke
 
...
*/

LSD.Layer.Stroke = {
  
  properties: {
    stroke:    ['width', ['cap', 'join', 'dash'], 'color'], 
    color:     ['gradient', 'color'],
    width:     ['length'],
    cap:       ['butt', 'round', 'square'],
    join:      ['butt', 'round', 'square'],
    dash:      ['tokens']
  },
  
  paint: function(color, width, cap, join, dash) {
    if (!width) width = 0;
    var gradient = color && (color['gradient'] || color['linear-gradient']);
    var result = {    
      dash: dash,
      size: {
        width: width,
        height: width
      },
      move: {
        x: width / 2,
        y: width / 2
      },
      inside: {
        left: width,
        top: width,
        right: width,
        bottom: width
      },
      stroke: [!gradient && color || null, width, cap, join]
    };
    if (this.radius != null) {
      var radius = result.radius = []
          for (var i = 0; i < 4; i++) radius[i] = (this.radius[i] > 0) ? width / 1.5 : 0;
    }
    if (gradient) result.strokeLinear = [gradient]
    return result;
  }
}
/*
---
 
script: Offset.js
 
description: Positions layer around the canvas
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
- LSD.Layer
 
provides: [LSD.Layer.Offset]
 
...
*/

LSD.Layer.Offset = {
  properties: {  
    offset:    [['top', 'right', 'bottom', 'left']],
    top:       ['length', 'percentage'],
    left:      ['length', 'percentage'],
    bottom:    ['length', 'percentage'],
    right:     ['length', 'percentage'],
  },

  paint: function(top, right, bottom, left) {
    return {
      move: {
        x: left == null && right != null ? (this.size.width - (right || 0)) : (left || 0), 
        y: top == null && bottom != null ? (this.size.height - (bottom || 0)) : (top || 0)
      }
    }
  }
};
/*
---
 
script: Position.js
 
description: Positions layer in the box
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Layer
 
provides: 
  - LSD.Layer.Position
 
...
*/

LSD.Layer.Position = {
  properties: {
    position: [['x', 'y']],
    x:        ['length', 'percentage', 'left', 'right', 'center'],
    y:        ['length', 'percentage', 'top', 'bottom', 'center']
  },
  
  
  paint: function(x, y) {
    if (!x && !y) return;
    return {
      move: LSD.position(this.box, this.size, x || 'center', y || 'center')
    }
  }
}
/*
---
 
script: Radius.js
 
description: Rounds shapes corners
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Layer
 
provides: 
  - LSD.Layer.Radius
 
...
*/

LSD.Layer.Radius = {
  properties: {
    radius:      [['topLeft', 'bottomLeft', 'topRight', 'bottomRight'], 'collection'],
    topLeft:     ['percentage', 'length'],
    bottomLeft:  ['percentage', 'length'],
    topRight:    ['percentage', 'length'],
    bottomRight: ['percentage', 'length'],
  },
  
  paint: function() {
    return {
      radius: Array.prototype.splice.call(arguments, 0).map(function(r) { return r || 0})
    }
  }
}



LSD.Layer.prepare('corner', ['radius'], false);
/*
---
 
script: Shape.js
 
description: Base layer that provides shape
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Layer
  - ART/ART.Shape
 
provides: 
  - LSD.Layer.Shape
 
...
*/

LSD.Layer.Styles = {}
LSD.Layer.Shape = {
  properties: {
    shape:      ['url', 'shape', 'glyph']
  },
  
  paint: function(shape) {
    return {
      shape: shape
    }
  },
  
  onCompile: function(name) {
    for (var shape in ART.Shape) {
      var klass = ART.Shape[shape];
      if (!klass || !klass.prototype || !klass.prototype.properties) continue;
      var properties = klass.prototype.properties;
      LSD.Layer.Styles[name + shape] = properties.map(function(prop) { return name + prop.capitalize()});
    }
  }
}

Object.append(SheetParser.Property.Type, {
  shape: function(value) {
    if (value.indexOf) var name = value
    else for (var key in value) { var name = key; break};
    return !!ART.Shape[name.capitalize()]
  },
  
  glyph: function(value) {
    return value.glyph
  }
});

LSD.Styles.shape = SheetParser.Property.compile(LSD.Layer.Shape.properties.shape)
/*
---
 
script: Size.js
 
description: Base layer that provides shape
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Layer
 
provides: 
  - LSD.Layer.Size
 
...
*/

LSD.Layer.Size = {
  properties: {
    size:       [['height', 'width'], 'collection'],
    height:     ['length', 'percentage'],
    width:      ['length', 'percentage']
  },
  
  prefix: false,
  
  paint: function(height, width) {
    if (height !== null && width !== null) return {
      size: {
        height: this.size.height ? (height - this.size.height) : height,
        width: this.size.width ? (width - this.size.width) : width
      }
    }
  }
}
/*
---
 
script: Scale.js
 
description: Adds a way to set scale level to the layer
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Layer
 
provides: 
  - LSD.Layer.Scale
 
...
*/

LSD.Layer.Scale = {
  properties: {
    scale: [['x', 'y'], 'collection'],
    x:     ['number', 'percentage'],
    y:     ['number', 'percentage']
  },
  
  paint: function(x, y) {
    if (x != null || y != null) return {
      size: {
        width: - this.size.width * (1 - x),
        height: - this.size.height * (1 - y)
      }
    }
  }
}
/*
---
 
script: Layers.js
 
description: Make widget use layers for all the SVG
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Trait
  - LSD.Layer
  - LSD.Module.Styles

provides: 
  - LSD.Module.Layers
 
...
*/


!function() {

LSD.Module.Layers = new Class({
  initializers: {
    layers: function() {
      this.offset = {
        inside: {},
        outside: {},
        padding: {}
      };
      this.shapes = {};
      this.style.layers = {};
      this.layers = {}
    }
  },

  addLayer: function(name, value) {
    var slots = this.style.layers || (this.style.layers = {});
    var layer = this.layers[name] = LSD.Layer.get(name, Array.concat(value));
    for (var i = 0, painter; painter = layer.painters[i++];) {
      for (var group = painter.keys, j = 0, property; property = group[j++];) {
        if (!slots[property]) slots[property] = [];
        slots[property].push(name);
      }
    }
  },
  
  removeLayer: function(name, value) {
    var slots = this.style.layers || (this.style.layers = {});
    var layer = this.layers[name] = LSD.Layer.get(name, Array.concat(value));
    for (var i = 0, painter; painter = layer.painters[i++];) {
      for (var group = painter.keys, j = 0, property; property = group[j++];) {
        if (slots[property]) slots[property].erase(name);
      }
    }
  },
  
  renderLayers: function(dirty) {
    var updated = new FastArray, style = this.style, layers = style.layers, offset = this.offset;
    for (var property in dirty) if (layers[property]) updated.push.apply(updated, layers[property]);
    
    var result = {};
    for (var name in this.layers) {
      if (!updated[name]) continue;
      var layer = this.layers[name];
      var sizes = Object.append({box: this.size}, {size: Object.append({}, this.size)});
      result = layer.draw(this, Object.append(result.inside ? {inside: result.inside, outside: result.outside} : {}, sizes))
    }
    var inside  = offset.inside  = Object.append({left: 0, right: 0, top: 0, bottom: 0}, result.inside);
    var outside = offset.outside = Object.append({left: 0, right: 0, top: 0, bottom: 0}, result.outside);
    offset.shape = /*this.shape.getOffset ? this.shape.getOffset(style.current) : */{left: 0, right: 0, top: 0, bottom: 0};
    
    for (var name in this.shapes) {
      var layer = this.shapes[name];
      if (!layer) continue;
      if (!layer.injected) {
        for (var layers = Object.keys(this.layers), i = layers.indexOf(layer.name), key, next; key = layers[++i];) {
          if ((next = this.layers[key]) && next.injected && next.shape) {
            layer.inject(next.shape, 'before');
            break;
          }
        }
        if (!layer.injected) layer.inject(this.getCanvas());
        layer.injected = true;
      }
    }
  },
  
  render: function() {
    var style = this.style, last = style.last, old = style.size, paint = style.paint, changed = style.changed;
    this.parent.apply(this, arguments);
    this.setSize(this.getStyles('height', 'width'));
    var size = this.size;
    if (size && (!old || (old.width != size.width || old.height != size.height))) {
      this.fireEvent('resize', [size, old]);
      changed = paint;
    }
    if (Object.getLength(changed) > 0) this.renderLayers(changed);
    style.changed = {};
    style.last = Object.append({}, paint);
    style.size = Object.append({}, size);
    this.renderOffsets();
  },
  
  renderStyles: function() {
    this.parent.apply(this, arguments);
    var style = this.style, current = style.current;
    Object.append(this.offset, {
      padding: {left: current.paddingLeft || 0, right: current.paddingRight || 0, top: current.paddingTop || 0, bottom: current.paddingBottom || 0},
      margin: {left: current.marginLeft || 0, right: current.marginRight || 0, top: current.marginTop || 0, bottom: current.marginBottom || 0}
    });
  },
  
  renderOffsets: function() {
    var element = this.element,
        current = this.style.current, 
        offset  = this.offset,         // Offset that is provided by:
        inside  = offset.inside,       // layers, inside the widget
        outside = offset.outside,      // layers, outside of the widget
        shape   = offset.shape,        // shape
        padding = offset.padding,      // padding style declarations
        margin  = offset.margin,       // margin style declarations
        inner   = {},                  // all inside offsets above, converted to padding
        outer   = {};                  // all outside offsets above, converted to margin
        
    for (var property in inside) {
      var cc = property.capitalize();
      if (offset.inner) var last = offset.inner[property];
      inner[property] = padding[property] + inside[property] + shape[property] + outside[property];
      if (last != null ? last != inner[property] : inner[property]) element.style['padding' + cc] = inner[property] + 'px';
      if (offset.outer) last = offset.outer[property];
      outer[property] = margin[property] - outside[property];
      if (last != null ? last != outer[property] : outer[property]) element.style['margin' + cc] = outer[property] + 'px';
    }
    if (inside) Object.append(offset, {inner: inner, outer: outer});
  }
});

/*
  Default layer set 
*/

if (!LSD.Layers) LSD.Layers =  {
  shadow:     ['size', 'radius', 'shape', 'shadow'],
  stroke:     [        'radius', 'stroke', 'shape', 'fill'],
  background: ['size', 'radius', 'stroke', 'offset', 'shape', 'color'],
  foreground: ['size', 'radius', 'stroke', 'offset', 'shape', 'color'],
  reflection: ['size', 'radius', 'stroke', 'offset', 'shape', 'color'],
  icon:       ['size', 'scale', 'color', 'stroke', 'offset', 'shape', 'position','shadow'],
  glyph:      ['size', 'scale', 'color', 'stroke', 'offset', 'shape', 'position', 'shadow']
};

/*
  Pre-generate CSS grammar for layers.
  
  It is not required for rendering process itself, because
  this action is taken automatically when the first
  widget gets rendered. Declaring layer css styles upfront
  lets us use it in other parts of the framework
  (e.g. in stylesheets to validate styles)
*/

for (var layer in LSD.Layers) LSD.Layer.get(layer, LSD.Layers[layer]);

LSD.Options.layers = {
  add: 'addLayer',
  remove: 'removeLayer',
  iterate: true,
  process: function(value) {
    return (value === true) ? LSD.Layers : value;
  }
};

}();

/*
---

name: Element.Event

description: Contains Element methods for dealing with events. This file also includes mouseenter and mouseleave custom Element Events.

license: MIT-style license.

requires: [Element, Event]

provides: Element.Event

...
*/

(function(){

Element.Properties.events = {set: function(events){
	this.addEvents(events);
}};

[Element, Window, Document].invoke('implement', {

	addEvent: function(type, fn){
		var events = this.retrieve('events', {});
		if (!events[type]) events[type] = {keys: [], values: []};
		if (events[type].keys.contains(fn)) return this;
		events[type].keys.push(fn);
		var realType = type,
			custom = Element.Events[type],
			condition = fn,
			self = this;
		if (custom){
			if (custom.onAdd) custom.onAdd.call(this, fn);
			if (custom.condition){
				condition = function(event){
					if (custom.condition.call(this, event)) return fn.call(this, event);
					return true;
				};
			}
			realType = custom.base || realType;
		}
		var defn = function(){
			return fn.call(self);
		};
		var nativeEvent = Element.NativeEvents[realType];
		if (nativeEvent){
			if (nativeEvent == 2){
				defn = function(event){
					event = new Event(event, self.getWindow());
					if (condition.call(self, event) === false) event.stop();
				};
			}
			this.addListener(realType, defn);
		}
		events[type].values.push(defn);
		return this;
	},

	removeEvent: function(type, fn){
		var events = this.retrieve('events');
		if (!events || !events[type]) return this;
		var index = events[type].keys.indexOf(fn);
		if (index == -1) return this;
		events[type].keys.splice(index, 1);
		var value = events[type].values.splice(index, 1)[0];
		var custom = Element.Events[type];
		if (custom){
			if (custom.onRemove) custom.onRemove.call(this, fn);
			type = custom.base || type;
		}
		return (Element.NativeEvents[type]) ? this.removeListener(type, value) : this;
	},

	addEvents: function(events){
		for (var event in events) this.addEvent(event, events[event]);
		return this;
	},

	removeEvents: function(events){
		var type;
		if (typeOf(events) == 'object'){
			for (type in events) this.removeEvent(type, events[type]);
			return this;
		}
		var attached = this.retrieve('events');
		if (!attached) return this;
		if (!events){
			for (type in attached) this.removeEvents(type);
			this.eliminate('events');
		} else if (attached[events]){
			while (attached[events].keys[0]) this.removeEvent(events, attached[events].keys[0]);
			delete attached[events];
		}
		return this;
	},

	fireEvent: function(type, args, delay){
		var events = this.retrieve('events');
		if (!events || !events[type]) return this;
		args = Array.from(args);
		events[type].keys.each(function(fn){
			if (delay) fn.delay(delay, this, args);
			else fn.apply(this, args);
		}, this);
		return this;
	},

	cloneEvents: function(from, type){
		from = document.id(from);
		var events = from.retrieve('events');
		if (!events) return this;
		if (!type){
			for (var eventType in events) this.cloneEvents(from, eventType);
		} else if (events[type]){
			events[type].keys.each(function(fn){
				this.addEvent(type, fn);
			}, this);
		}
		return this;
	}

});

Element.NativeEvents = {
	click: 2, dblclick: 2, mouseup: 2, mousedown: 2, contextmenu: 2, //mouse buttons
	mousewheel: 2, DOMMouseScroll: 2, //mouse wheel
	mouseover: 2, mouseout: 2, mousemove: 2, selectstart: 2, selectend: 2, //mouse movement
	keydown: 2, keypress: 2, keyup: 2, //keyboard
	orientationchange: 2, // mobile
	touchstart: 2, touchmove: 2, touchend: 2, touchcancel: 2, // touch
	gesturestart: 2, gesturechange: 2, gestureend: 2, // gesture
	focus: 2, blur: 2, change: 2, reset: 2, select: 2, submit: 2, //form elements
	load: 2, unload: 1, beforeunload: 2, resize: 1, move: 1, DOMContentLoaded: 1, readystatechange: 1, //window
	error: 1, abort: 1, scroll: 1 //misc
};

var check = function(event){
	var related = event.relatedTarget;
	if (related == null) return true;
	if (!related) return false;
	return (related != this && related.prefix != 'xul' && typeOf(this) != 'document' && !this.contains(related));
};

Element.Events = {

	mouseenter: {
		base: 'mouseover',
		condition: check
	},

	mouseleave: {
		base: 'mouseout',
		condition: check
	},

	mousewheel: {
		base: (Browser.firefox) ? 'DOMMouseScroll' : 'mousewheel'
	}

};

//<1.2compat>

Element.Events = new Hash(Element.Events);

//</1.2compat>

})();

/*
---

script: Drag.js

name: Drag

description: The base Drag Class. Can be used to drag and resize Elements using mouse events.

license: MIT-style license

authors:
  - Valerio Proietti
  - Tom Occhinno
  - Jan Kassens

requires:
  - Core/Events
  - Core/Options
  - Core/Element.Event
  - Core/Element.Style
  - /MooTools.More

provides: [Drag]
...

*/

var Drag = new Class({

	Implements: [Events, Options],

	options: {/*
		onBeforeStart: function(thisElement){},
		onStart: function(thisElement, event){},
		onSnap: function(thisElement){},
		onDrag: function(thisElement, event){},
		onCancel: function(thisElement){},
		onComplete: function(thisElement, event){},*/
		snap: 6,
		unit: 'px',
		grid: false,
		style: true,
		limit: false,
		handle: false,
		invert: false,
		preventDefault: false,
		stopPropagation: false,
		modifiers: {x: 'left', y: 'top'}
	},

	initialize: function(){
		var params = Array.link(arguments, {
			'options': Type.isObject, 
			'element': function(obj){
				return obj != null;
			}
		});
		
		this.element = document.id(params.element);
		this.document = this.element.getDocument();
		this.setOptions(params.options || {});
		var htype = typeOf(this.options.handle);
		this.handles = ((htype == 'array' || htype == 'collection') ? $$(this.options.handle) : document.id(this.options.handle)) || this.element;
		this.mouse = {'now': {}, 'pos': {}};
		this.value = {'start': {}, 'now': {}};

		this.selection = (Browser.ie) ? 'selectstart' : 'mousedown';

		this.bound = {
			start: this.start.bind(this),
			check: this.check.bind(this),
			drag: this.drag.bind(this),
			stop: this.stop.bind(this),
			cancel: this.cancel.bind(this),
			eventStop: Function.from(false)
		};
		this.attach();
	},

	attach: function(){
		this.handles.addEvent('mousedown', this.bound.start);
		return this;
	},

	detach: function(){
		this.handles.removeEvent('mousedown', this.bound.start);
		return this;
	},

	start: function(event){
		var options = this.options;
		
		if (event.rightClick) return;
		
		if (options.preventDefault) event.preventDefault();
		if (options.stopPropagation) event.stopPropagation();
		this.mouse.start = event.page;
		
		this.fireEvent('beforeStart', this.element);
		
		var limit = options.limit;
		this.limit = {x: [], y: []};
		for (var z in options.modifiers){
			if (!options.modifiers[z]) continue;
			
			if (options.style) this.value.now[z] = this.element.getStyle(options.modifiers[z]).toInt();
			else this.value.now[z] = this.element[options.modifiers[z]];
			
			if (options.invert) this.value.now[z] *= -1;
			this.mouse.pos[z] = event.page[z] - this.value.now[z];
			
			if (limit && limit[z]){
				var i = 2;
				while (i--){
					var limitZI = limit[z][i];
					if (limitZI || limitZI === 0) this.limit[z][i] = (typeof limitZI == 'function') ? limitZI() : limitZI;
				}
			}
		}
		
		if (typeOf(this.options.grid) == 'number') this.options.grid = {
			x: this.options.grid, 
			y: this.options.grid
		};
		
		var events = {
			mousemove: this.bound.check, 
			mouseup: this.bound.cancel
		};
		events[this.selection] = this.bound.eventStop;
		this.document.addEvents(events);
	},

	check: function(event){
		if (this.options.preventDefault) event.preventDefault();
		var distance = Math.round(Math.sqrt(Math.pow(event.page.x - this.mouse.start.x, 2) + Math.pow(event.page.y - this.mouse.start.y, 2)));
		if (distance > this.options.snap){
			this.cancel();
			this.document.addEvents({
				mousemove: this.bound.drag,
				mouseup: this.bound.stop
			});
			this.fireEvent('start', [this.element, event]).fireEvent('snap', this.element);
		}
	},

	drag: function(event){
		var options = this.options;
		
		if (options.preventDefault) event.preventDefault();
		this.mouse.now = event.page;
		
		for (var z in options.modifiers){
			if (!options.modifiers[z]) continue;
			this.value.now[z] = this.mouse.now[z] - this.mouse.pos[z];
			if (options.invert) this.value.now[z] *= -1;
			
			if (options.limit && this.limit[z]){
				if ((this.limit[z][1] || this.limit[z][1] === 0) && (this.value.now[z] > this.limit[z][1])){
					this.value.now[z] = this.limit[z][1];
				} else if ((this.limit[z][0] || this.limit[z][0] === 0) && (this.value.now[z] < this.limit[z][0])){
					this.value.now[z] = this.limit[z][0];
				}
			}
			
			if (options.grid[z]) this.value.now[z] -= ((this.value.now[z] - (this.limit[z][0]||0)) % options.grid[z]);
			if (options.style) {
				this.element.setStyle(options.modifiers[z], this.value.now[z] + options.unit);
			} else {
				this.element[options.modifiers[z]] = this.value.now[z];
			}
		}
		
		this.fireEvent('drag', [this.element, event]);
	},

	cancel: function(event){
		this.document.removeEvents({
			mousemove: this.bound.check,
			mouseup: this.bound.cancel
		});
		if (event){
			this.document.removeEvent(this.selection, this.bound.eventStop);
			this.fireEvent('cancel', this.element);
		}
	},

	stop: function(event){
		var events = {
			mousemove: this.bound.drag,
			mouseup: this.bound.stop
		};
		events[this.selection] = this.bound.eventStop;
		this.document.removeEvents(events);
		if (event) this.fireEvent('complete', [this.element, event]);
	}

});

Element.implement({

	makeResizable: function(options){
		var drag = new Drag(this, Object.merge({
			modifiers: {
				x: 'width', 
				y: 'height'
			}
		}, options));
		
		this.store('resizer', drag);
		return drag.addEvent('drag', function(){
			this.fireEvent('resize', drag);
		}.bind(this));
	}

});

/*
---

script: Slider.js

name: Slider

description: Class for creating horizontal and vertical slider controls.

license: MIT-style license

authors:
  - Valerio Proietti

requires:
  - Core/Element.Dimensions
  - /Class.Binds
  - /Drag
  - /Element.Measure

provides: [Slider]

...
*/

var Slider = new Class({

	Implements: [Events, Options],

	Binds: ['clickedElement', 'draggedKnob', 'scrolledElement'],

	options: {/*
		onTick: function(intPosition){},
		onChange: function(intStep){},
		onComplete: function(strStep){},*/
		onTick: function(position){
			if (this.options.snap) position = this.toPosition(this.step);
			this.knob.setStyle(this.property, position);
		},
		initialStep: 0,
		snap: false,
		offset: 0,
		range: false,
		wheel: false,
		steps: 100,
		mode: 'horizontal'
	},

	initialize: function(element, knob, options){
		this.setOptions(options);
		this.element = document.id(element);
		this.knob = document.id(knob);
		this.previousChange = this.previousEnd = this.step = -1;
		var offset, limit = {}, modifiers = {'x': false, 'y': false};
		switch (this.options.mode){
			case 'vertical':
				this.axis = 'y';
				this.property = 'top';
				offset = 'offsetHeight';
				break;
			case 'horizontal':
				this.axis = 'x';
				this.property = 'left';
				offset = 'offsetWidth';
		}
		
		this.full = this.element.measure(function(){ 
			this.half = this.knob[offset] / 2; 
			return this.element[offset] - this.knob[offset] + (this.options.offset * 2); 
		}.bind(this));
		
		this.setRange(this.options.range);

		this.knob.setStyle('position', 'relative').setStyle(this.property, this.options.initialStep ? this.toPosition(this.options.initialStep) : - this.options.offset);
		modifiers[this.axis] = this.property;
		limit[this.axis] = [- this.options.offset, this.full - this.options.offset];

		var dragOptions = {
			snap: 0,
			limit: limit,
			modifiers: modifiers,
			onDrag: this.draggedKnob,
			onStart: this.draggedKnob,
			onBeforeStart: (function(){
				this.isDragging = true;
			}).bind(this),
			onCancel: function(){
				this.isDragging = false;
			}.bind(this),
			onComplete: function(){
				this.isDragging = false;
				this.draggedKnob();
				this.end();
			}.bind(this)
		};
		if (this.options.snap){
			dragOptions.grid = Math.ceil(this.stepWidth);
			dragOptions.limit[this.axis][1] = this.full;
		}

		this.drag = new Drag(this.knob, dragOptions);
		this.attach();
	},

	attach: function(){
		this.element.addEvent('mousedown', this.clickedElement);
		if (this.options.wheel) this.element.addEvent('mousewheel', this.scrolledElement);
		this.drag.attach();
		return this;
	},

	detach: function(){
		this.element.removeEvent('mousedown', this.clickedElement);
		this.element.removeEvent('mousewheel', this.scrolledElement);
		this.drag.detach();
		return this;
	},

	set: function(step){
		if (!((this.range > 0) ^ (step < this.min))) step = this.min;
		if (!((this.range > 0) ^ (step > this.max))) step = this.max;

		this.step = Math.round(step);
		this.checkStep();
		this.fireEvent('tick', this.toPosition(this.step));
		this.end();
		return this;
	},
	
	setRange: function(range, pos){
		this.min = Array.pick([range[0], 0]);
		this.max = Array.pick([range[1], this.options.steps]);
		this.range = this.max - this.min;
		this.steps = this.options.steps || this.full;
		this.stepSize = Math.abs(this.range) / this.steps;
		this.stepWidth = this.stepSize * this.full / Math.abs(this.range);
		this.set(Array.pick([pos, this.step]).floor(this.min).max(this.max));
		return this;
	},

	clickedElement: function(event){
		if (this.isDragging || event.target == this.knob) return;

		var dir = this.range < 0 ? -1 : 1;
		var position = event.page[this.axis] - this.element.getPosition()[this.axis] - this.half;
		position = position.limit(-this.options.offset, this.full -this.options.offset);

		this.step = Math.round(this.min + dir * this.toStep(position));
		this.checkStep();
		this.fireEvent('tick', position);
		this.end();
	},

	scrolledElement: function(event){
		var mode = (this.options.mode == 'horizontal') ? (event.wheel < 0) : (event.wheel > 0);
		this.set(mode ? this.step - this.stepSize : this.step + this.stepSize);
		event.stop();
	},

	draggedKnob: function(){
		var dir = this.range < 0 ? -1 : 1;
		var position = this.drag.value.now[this.axis];
		position = position.limit(-this.options.offset, this.full -this.options.offset);
		this.step = Math.round(this.min + dir * this.toStep(position));
		this.checkStep();
	},

	checkStep: function(){
		if (this.previousChange != this.step){
			this.previousChange = this.step;
			this.fireEvent('change', this.step);
		}
	},

	end: function(){
		if (this.previousEnd !== this.step){
			this.previousEnd = this.step;
			this.fireEvent('complete', this.step + '');
		}
	},

	toStep: function(position){
		var step = (position + this.options.offset) * this.stepSize / this.full * this.steps;
		return this.options.steps ? Math.round(step -= step % this.stepSize) : step;
	},

	toPosition: function(step){
		return (this.full * Math.abs(this.min - step)) / (this.steps * this.stepSize) - this.options.offset;
	}

});

/*
---
 
script: Drag.Limits.js
 
description: A set of function to easily cap Drag's limit
 
license: MIT-style license.
 
requires:
- More/Drag

provides: [Drag.Limits]
 
...
*/

Drag.implement({
  setMaxX: function(x) {
    var limit = this.options.limit;
    limit.x[1] = x//Math.max(x, limit.x[1]);
    limit.x[0] = Math.min(limit.x[0], limit.x[1]);
  },
  
  setMaxY: function(y) {
    var limit = this.options.limit;
    limit.y[1] = y//Math.max(y, limit.y[1]);
    limit.y[0] = Math.min(limit.y[0], limit.y[1]);
  },
  
  setMinX: function(x) {
    var limit = this.options.limit;
    limit.x[0] = x//Math.min(x, limit.x[0]);
    limit.x[1] = Math.max(limit.x[1], limit.x[0]);
  },
  
  setMinY: function(y) {
    var limit = this.options.limit;
    limit.y[0] = y//Math.min(y, limit.y[0]);
    limit.y[1] = Math.max(limit.y[1], limit.y[0]);
  }
});

/*
---
 
script: Slider.js
 
description: Methods to update slider without reinitializing the thing
 
license: MIT-style license.
 
requires:
- Drag.Limits
- More/Slider

provides: [Slider.prototype.update]
 
...
*/


Slider.implement({
  update: function() {
		var offset = (this.options.mode == 'vertical') ?  'offsetHeight' : 'offsetWidth'
		this.half = this.knob[offset] / 2; 
		this.full =  this.element[offset] - this.knob[offset] + (this.options.offset * 2); 
		
		//this.setRange(this.options.range);

		this.knob.setStyle(this.property, this.toPosition(this.step));
		var X = this.axis.capitalize();
		this.drag['setMin' + X](- this.options.offset)
		this.drag['setMax' + X](this.full - this.options.offset)
  }
})
/*
---
 
script: Slider.js
 
description: Because sometimes slider is the answer
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Trait
  - More/Slider
  - Ext/Slider.prototype.update
  - Ext/Class.hasParent

provides: 
  - LSD.Trait.Slider
 
...
*/

LSD.Trait.Slider = new Class({
  
  options: {
    actions: {
      slider: {
        enable: function() {
          if (!this.slider) this.getSlider();
          else this.slider.attach();
        },

        disable: function() {
          if (this.slider) this.slider.detach()
        }
      }
    },
    events: {
      parent: {
        resize: 'onParentResize'
      },
      slider: {}
    },
    slider: {},
    value: 0,
    mode: 'horizontal',
  },
  
  onParentResize: function(current, old) {
    if (this.slider) this.slider.update();
  },
  
  getSlider: Macro.getter('slider', function (update) {
    var slider = new Slider(document.id(this.getTrack()), document.id(this.getTrackThumb()), Object.merge(this.options.slider, {
      mode: this.options.mode
    })).set(parseFloat(this.options.value));
    slider.addEvent('change', this.onSet.bind(this));
    this.fireEvent('register', ['slider', slider]);
    return slider;
  }),
  
  onSet: Macro.defaults(function() {
    return true;
  }),
  
  getTrack: Macro.defaults(function() {
    return this
  }),
  
  getTrackThumb: Macro.defaults(function() {
    return this.thumb;
  }),
  
  increment: function() {
    this.slider.set((this.slider.step || 0) + 10)
  },
  
  decrement: function() {
    this.slider.set((this.slider.step || 0) - 10)
  }
  
});

Slider = new Class({
  Extends: Slider,
  
  initialize: function() {
    (this.Binds.push ? this.Binds : [this.Binds]).each(function(name){
      var original = this[name];
      if (original) this[name] = original.bind(this);
    }, this);
    return this.parent.apply(this, arguments);
  }
})
/*
---
 
script: Draggable.js
 
description: Drag widget around the screen
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Mixin
  - More/Drag

provides: 
  - LSD.Mixin.Draggable
 
...
*/

LSD.Mixin.Draggable = new Class({
  options: {
    dragger: {
      modifiers: {
        x: 'left',
        y: 'top'
      },
      snap: 5,
      style: false,
      container: true,
      limit: {
        x: [0, 3000],
        y: [0, 3000]
      },
      handle: []
    },
    actions: {
      draggable: {
        enable: function(handle) {
          if (this.index++ == 0) {
            if (this.dragger) this.dragger.attach();
            else this.getDragger();
            this.onStateChange('draggable', true);
          }
          if (!handle) return;
          this.handles.push(handle);
          document.id(handle).addEvent('mousedown', this.dragger.bound.start);
        },
        
        disable: function(handle) {
          if (!this.dragger) return;
          if (--this.index == 0) {
            this.onStateChange('draggable', false);
            this.dragger.detach();
          }
          if (!handle) return;
          this.handles.erase(handle)
          document.id(handle).removeEvent('mousedown', this.dragger.bound.start);
        }
      }
    }
  },
  
  initialize: function() {
    this.parent.apply(this, arguments);
    this.handles = [];
    this.index = 0;
  },
  
  unitialize: function() {
    this.handles.each(this.options.actions.draggable.disable, this);
    this.onStateChange('draggable', false);
    delete this.dragger;
  },
  
  getDragger: Macro.getter('dragger', function() {
    var element = this.element;
    this.onDOMInject(function() {
      var position = element.getPosition();
      element.left = position.x - element.getStyle('margin-left').toInt();
      element.top = position.y - element.getStyle('margin-top').toInt();
    }.create({delay: 50}));
    var dragger = new Drag(element, Object.append(this.options.dragger, this.options.dragger));
    dragger.addEvents(this.events.dragger);
    dragger.addEvents({
      'start': this.onDragStart.bind(this),
      'complete': this.onDragComplete.bind(this),
      'cancel': this.onDragComplete.bind(this),
      'drag': this.onDrag.bind(this)
    }, true);
    return dragger;
  }),
  
  onDragStart: function() {
    this.onStateChange('dragged', true);
  },
  
  onDragComplete: function() {
    this.onStateChange('dragged', false);
  },
  
  onDrag: function() {
    this.setStyles({
      top: this.dragger.value.now.y,
      left: this.dragger.value.now.x
    });
  }
  
});

LSD.Behavior.define('[draggable]', LSD.Mixin.Draggable);
/*
---
 
script: Resizable.js
 
description: Resize widget with the mouse freely
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Mixin
  - More/Drag

provides: 
  - LSD.Mixin.Resizable 
...
*/


LSD.Mixin.Resizable = new Class({
  options: {
    resizer: {
      modifiers: {
        x: 'width',
        y: 'height'
      },
      snap: false,
      style: false,
      crop: false,
      handle: [],
      container: true,
      limit: {
        x: [0, 3000],
        y: [0, 3000]
      },
    },
    actions: {
      resizable: {
        enable: function(handle, resizable) {
          this.handle = handle;
          this.resized = resizable || this;
          this.onStateChange('resizable', true);
          var resizer = this.resizer;
          if (resizer == this.getResizer(document.id(this.resized))) resizer.attach();
          if (handle) document.id(handle).addEvent('mousedown', this.resizer.bound.start);
          if (this.options.resizer.fit) this.fit(resizable)
        },

        disable: function(handle, content) {
          this.onStateChange('resizable', false);
          if (this.resizer) this.resizer.detach();
          if (handle) document.id(handle).removeEvent('mousedown', this.resizer.bound.start);
          delete this.resized, delete this.handle;
        },
      }
    }
  },
  
  initialize: function() {
    this.parent.apply(this, arguments);
    var options = this.options.resizer;
    var rules = (new FastArray).concat(this.getAttribute('resizable').split(/\s+/));
    options.modifiers.x = (!rules.x && rules.y) ? false : 'width';
    options.modifiers.y = (!rules.y && rules.x) ? false : 'height';
    options.fit = !!rules.fit;
  },
  
  uninitialize: function() {
    if (this.handle) this.options.actions.resizable.disable.call(this, this.handle, this.resized);
    delete this.resizer;
  },
   
  getResizer: function(resized) {
    var element = resized
    if (this.resizer) {
      if (this.resizer.element == element) return this.resizer;
      return this.resizer.element = element;
    }
    var resizer = this.resizer = new Drag(element, Object.append(this.options, this.options.resizer));
    this.fireEvent('register', ['resizer', resizer]);
    resizer.addEvents({
      'beforeStart': this.onBeforeResize.bind(this),
      'start': this.onResizeStart.bind(this),
      'complete': this.onResizeComplete.bind(this),
      'cancel': this.onResizeComplete.bind(this),
      'drag': this.onResize.bind(this)
    }, true);
    return resizer;
  },
  
  check: function(size) {
    if (!this.resizer) return;
    var width = this.element.offsetWidth - this.offset.inner.left - this.offset.inner.right;
    if (!size) size = {width: this.resized.toElement().width}
    if (size.width < width) {
      if (!$chk(this.limit)) this.limit = this.resized.getStyle('minWidth') || 1
      this.resized.setStyle('minWidth', width);
      $clear(this.delay);
      this.delay = (function() { //reset limit options in one second
        this.resized.setStyle('minWidth', this.limit);
      }).delay(1000, this); 
      size.width = width;
    }
    return size;
  },
  
  onBeforeResize: function() {
    Object.append(this.resized.toElement(), this.resized.size)
  },
  
  onResizeStart: function() {
    this.onStateChange('resized', true);
    var getLiquid = function(child, prop) {
      var value = child.style.current[prop];
      return ((value == 'inherit') || (value == 'auto') || child.style.expressed[prop]) ? value : null
    }
    if (!this.liquid) {
      this.liquid = LSD.Module.DOM.walk(this, function(child) { 
        return getLiquid(c, 'width')
      }) || []
      this.liquid.include(this.resized);
      if (this.resized != this) {
        var style = this.resized.style.liquid = {};
        var width = getLiquid(this.resized, 'width');
        if (width) style.width = width;
        var height = getLiquid(this.resized, 'height');
        if (height) style.height = height;
      }
    }
  },
  
  onResizeComplete: function() {
    if (this.resized.style.liquid) this.resized.setStyles(this.resized.style.liquid);
    this.onStateChange('resized', false);
    delete this.liquid
  },
  
  onResize: function() {
    var now = this.resizer.value.now;
    var resized = this.resized;
    if (!resized.style.dimensions) {
      resized.style.dimensions = {};
      var width = resized.style.current.width
      if (width == 'auto') resized.style.dimensions.width = 'auto';
      var height = resized.toElement().getStyle('height');
      if (height == 'auto') resized.style.dimensions.height = 'auto';
    }
    if (!now.x) now.x = resized.size.width;
    if (!now.y) now.y = resized.size.height;
    var size = this.check({width: resized.setWidth(now.x) || now.x, height: resized.setHeight(now.y) || now.y});
    resized.setStyles(size);
    if (this.liquid) {
      this.liquid.each(function(child) {
        child.update();
      })
    }
    this.refresh();
  },
  
  fit: function(content) {
    if (!content) content = this.resized;
    var element = content.getWrapper();
    var display = element.getStyle('display');
    if (display != 'inline-block') element.setStyle('display', 'inline-block');
    var width = element.offsetWidth;
    var height = element.offsetHeight;
    element.setStyle('display', display)
    content.setHeight(height);
    content.setWidth(width);
    this.refresh({
      maxWidth: width, maxHeight: height
    });
  },
  
  getScrolled: function() {
    return this.resized.getWrapper();
  }
});

LSD.Behavior.define('[resizable][resizable!=false]', LSD.Mixin.Resizable);
/*
---

name: Element.Pseudos

description: Adds the functionallity to add pseudo events for Elements

license: MIT-style license

authors:
  - Arian Stolwijk

requires: [Core/Element.Event, Events.Pseudos]
provides: [Element.Pseudos]

...
*/

(function(){

	var keysStoreKey = '$moo:keys-pressed',
		keysKeyupStoreKey = '$moo:keys-keyup';

	var pseudos = {
		
		once: function(split, fn, args){
			fn.apply(this, args);
			this.removeEvent(split.original, fn);
		},
		
		
		keys: function(split, fn, args){
			if (split.event != 'keydown') return;
			
			var event = args[0],
				keys = split.value.split('+'),
				pressed = this.retrieve(keysStoreKey, []);
			
			pressed.include(event.key);
			
			if (keys.every(function(key){
				return pressed.contains(key);
			})) fn.apply(this, args);
			
			this.store(keysStoreKey, pressed);
			
			
			if (!this.retrieve(keysKeyupStoreKey)){
				var keyup = function(){
					this.store(keysStoreKey, []);
				};
				this.store(keysKeyupStoreKey, keyup).addEvent('keyup', keyup);
			}
			
		}
		
	};
	
	Event.definePseudo = function(key, fn){
		pseudos[key] = fn;
	};
	
	Element.implement(Events.Pseudos(pseudos, Element.prototype.addEvent, Element.prototype.removeEvent)); 

})();

/*
---

script: Element.Delegation.js

name: Element.Delegation

description: Extends the Element native object to include the delegate method for more efficient event management.

credits:
  - "Event checking based on the work of Daniel Steigerwald. License: MIT-style license. Copyright: Copyright (c) 2008 Daniel Steigerwald, daniel.steigerwald.cz"

license: MIT-style license

authors:
  - Aaron Newton
  - Daniel Steigerwald

requires: [/MooTools.More, /Element.Pseudos]
provides: [Element.Delegation]

...
*/

Event.definePseudo('relay', function(split, fn, args){
	var event = args[0];
	for (var target = event.target; target && target != this; target = target.parentNode){
		if (Slick.match(target, split.value)){
			var finalTarget = document.id(target);
			if (finalTarget) fn.apply(finalTarget, [event, finalTarget]);
			return;
		}
	}
	
});

/*
---

name: Element.defineCustomEvent

description: Allows to create custom events based on other custom events.

authors: Christoph Pojer (@cpojer)

license: MIT-style license.

requires: [Core/Element.Event]

provides: Element.defineCustomEvent

...
*/

(function(){

[Element, Window, Document].invoke('implement', {hasEvent: function(event){
	var events = this.retrieve('events'),
		list = (events && events[event]) ? events[event].values : null;
	if (list){
		for (var i = list.length; i--;) if (i in list){
			return true;
		}
	}
	return false;
}});

var wrap = function(custom, method, extended, name){
	method = custom[method];
	extended = custom[extended];

	return function(fn, customName){
		if (!customName) customName = name;

		if (extended && !this.hasEvent(customName)) extended.call(this, fn, customName);
		if (method) method.call(this, fn, customName);
	};
};

var inherit = function(custom, base, method, name){
	return function(fn, customName){
		base[method].call(this, fn, customName || name);
		custom[method].call(this, fn, customName || name);
	};
};

var events = Element.Events;

Element.defineCustomEvent = function(name, custom){

	var base = events[custom.base];

	custom.onAdd = wrap(custom, 'onAdd', 'onSetup', name);
	custom.onRemove = wrap(custom, 'onRemove', 'onTeardown', name);

	events[name] = base ? Object.append({}, custom, {

		base: base.base,

		condition: function(event){
			return (!base.condition || base.condition.call(this, event)) &&
				(!custom.condition || custom.condition.call(this, event));
		},

		onAdd: inherit(custom, base, 'onAdd', name),
		onRemove: inherit(custom, base, 'onRemove', name)

	}) : custom;

	return this;

};

var loop = function(name){
	var method = 'on' + name.capitalize();
	Element[name + 'CustomEvents'] = function(){
		Object.each(events, function(event, name){
			if (event[method]) event[method].call(event, name);
		});
	};
	return loop;
};

loop('enable')('disable');

})();

/*
---

name: Touch

description: Provides a custom touch event on mobile devices

authors: Christoph Pojer (@cpojer)

license: MIT-style license.

requires: [Core/Element.Event, Custom-Event/Element.defineCustomEvent, Browser.Features.Touch]

provides: Touch

...
*/

(function(){

var preventDefault = function(event){
	event.preventDefault();
};

var disabled;

Element.defineCustomEvent('touch', {

	base: 'touchend',

	condition: function(event){
		if (disabled || event.targetTouches.length != 0) return false;

		var touch = event.changedTouches[0],
			target = document.elementFromPoint(touch.clientX, touch.clientY);

		do {
			if (target == this) return true;
		} while ((target = target.parentNode) && target);

		return false;
	},

	onSetup: function(){
		this.addEvent('touchstart', preventDefault);
	},

	onTeardown: function(){
		this.removeEvent('touchstart', preventDefault);
	},

	onEnable: function(){
		disabled = false;
	},

	onDisable: function(){
		disabled = true;
	}

});

})();

/*
---

name: Click

description: Provides a replacement for click events on mobile devices

authors: Christoph Pojer (@cpojer)

license: MIT-style license.

requires: [Touch]

provides: Click

...
*/

if (Browser.Features.iOSTouch) (function(){

var name = 'click';
delete Element.NativeEvents[name];

Element.defineCustomEvent(name, {

	base: 'touch'

});

})();

/*
---

name: Mouse

description: Maps mouse events to their touch counterparts

authors: Christoph Pojer (@cpojer)

license: MIT-style license.

requires: [Custom-Event/Element.defineCustomEvent, Browser.Features.Touch]

provides: Mouse

...
*/

if (!Browser.Features.Touch) (function(){

var condition = function(event){
	event.targetTouches = [];
	event.changedTouches = event.touches = [{
		pageX: event.page.x, pageY: event.page.y,
		clientX: event.client.x, clientY: event.client.y
	}];

	return true;
};


var mouseup = function(e) {
  var target = e.target;
  while (target != this && (target = target.parentNode));
  this.fireEvent(target ? 'touchend' : 'touchcancel', arguments);
  document.removeEvent('mouseup', this.retrieve('touch:mouseup'));
};

Element.defineCustomEvent('touchstart', {

	base: 'mousedown',

	condition: function() {
	  var bound = this.retrieve('touch:mouseup');
	  if (!bound) {
	    bound = mouseup.bind(this);
	    this.store('touch:mouseup', bound);
	  }
	  document.addEvent('mouseup', bound);
	  return condition.apply(this, arguments);
	}

}).defineCustomEvent('touchmove', {

	base: 'mousemove',

	condition: condition

})

})();

/*
---
 
script: Touchable.js
 
description: A mousedown event that lasts even when you move your mouse over. 
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Mixin
  - Mobile/Mouse
  - Mobile/Click
  - Mobile/Touch

 
provides:   
  - LSD.Mixin.Touchable
 
...
*/


LSD.Mixin.Touchable = new Class({
  options: {
    events: {
      enabled: {
        element: {
          'touchstart': 'activate',
          'touchend': 'deactivate',
          'touchcancel': 'deactivate'
        }
      }
    },
    states: {
      active: {
        enabler: 'activate',
        disabler: 'deactivate'
      }
    }
  }
});

LSD.Behavior.define(':touchable', LSD.Mixin.Touchable);
/*
---
 
script: Button.js
 
description: A button widget. You click it, it fires the event
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD/LSD.Widget.Paint
  - LSD/LSD.Mixin.Touchable

provides: 
  - LSD.Widget.Button
 
...
*/

LSD.Widget.Button = new Class({

  Extends: LSD.Widget.Paint,

  options: {
    tag: 'button',
    label: ''
  },
  
  initialize: function() {
    this.parent.apply(this, arguments);
    this.addPseudo('touchable');
  },
  
  setContent: function(content) {
    this.setState('text');
    return this.parent.apply(this, arguments);
  }

});

/*
---

name: DomReady

description: Contains the custom event domready.

license: MIT-style license.

requires: Element.Event

provides: DomReady

...
*/

(function(){

var onAdd = function(fn){
	if (Browser.loaded) fn.call(this);
};

var domready = function(){
	if (Browser.loaded) return;
	Browser.loaded = true;
	window.fireEvent('domready');
	document.fireEvent('domready');
};

Element.Events.domready = {
	onAdd: onAdd
};

var repeat;
if (Browser.ie){
	Element.Events.load = {
		base: 'load',
		onAdd: onAdd,
		condition: function(){
			domready();
			return true;
		}
	};

	var temp = document.createElement('div');
	var check = function(){
		temp.doScroll(); // Technique by Diego Perini
		return document.id(temp).inject(document.body).set('html', 'temp').dispose();
	};
	repeat = function(){
		if (Function.attempt(check)) domready();
		else repeat.delay(50);
	};
	repeat();
	return;
}

if (Browser.safari && Browser.version < 4){
	repeat = function(){
		if (['loaded', 'complete'].contains(document.readyState)) domready();
		else repeat.delay(50);
	};
	repeat();
	return;
}

document.addEvent('DOMContentLoaded', domready);

})();

/*
---
 
script: DOM.js
 
description: Provides DOM-compliant interface to play around with other widgets
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

requires:
  - LSD.Module
  - Core/Element.Event

provides:
  - LSD.Module.DOM
  - LSD.Module.DOM.findDocument

...
*/

!function() {

LSD.Module.DOM = new Class({
  options: {
    nodeType: 1,
  },
  
  initializers: {
    dom: function(options) {
      this.childNodes = [];
      return {
        events: {
          element: {
            /*
              When dispose event comes from the element, 
              it is is already removed from dom
            */
            dispose: 'onElementDispose'
          }
        }
      }
    }
  },
  
  contains: function(element) {
    while (element = element.parentNode) if (element == this) return true;
    return false;
  },
  
  getChildren: function() {
    return this.childNodes;
  },

  getRoot: function() {
    var widget = this;
    while (widget.parentNode) widget = widget.parentNode;
    return widget;
  },
  
  setParent: function(widget, index){
    if (!widget.lsd) widget = LSD.Module.DOM.find(widget);
    if (this.parentNode) this.dispose();
    if (!widget) return;
    this.parentNode = widget;
    this.fireEvent('setParent', [widget, widget.document])
    var siblings = widget.childNodes, length = siblings.length;
    if (siblings[0] == this) widget.firstChild = this;
    if (siblings[siblings.length - 1] == this) widget.lastChild = this;
    if (index == null) index = length - 1;
    if (index) {
      var previous = siblings[index - 1];
      if (previous) {
        previous.nextSibling = this;
        this.previousSibling = previous;
      }
    }
    if (index < length) {
      var next = siblings[index + 1];
      if (next) {
        next.previousSibling = this;
        this.nextSibling = next;
      }
    } 
    this.fireEvent('register', ['parent', widget]);
    widget.fireEvent('adopt', [this]);
    LSD.Module.DOM.walk(this, function(node) {
      widget.dispatchEvent('nodeInserted', node);
    });
  },
  
  unsetParent: function(widget, index) {
    if (!widget) widget = this.parentNode;
    this.fireEvent('unregister', ['parent', widget]);
    this.removed = true;
    LSD.Module.DOM.walk(this, function(node) {
      widget.dispatchEvent('nodeRemoved', node);
    });
    var parent = this.parentNode, siblings = widget.childNodes;
    if (index == null) index = siblings.indexOf(this);
    var previous = siblings[index - 1], next = siblings[index + 1];
    if (previous && previous.nextSibling == this) {
      previous.nextSibling = next;
      if (this.previousSibling == previous) delete this.previousSibling;
    }
    if (next && next.previousSibling == this) {
      next.previousSibling = previous;
      if (this.nextSibling == next) delete this.nextSibling;
    }
    if (parent.firstChild == this) parent.firstChild = next;
    if (parent.lastChild == this) parent.lastChild = previous;
    delete this.parentNode, delete this.removed;
  },
  
  appendChild: function(widget, adoption) {
    if (!widget.quiet && (adoption !== false) && this.toElement()) (adoption || function() {
      this.element.appendChild(widget.toElement());
    }).apply(this, arguments);
    widget.setParent(this, this.childNodes.push(widget) - 1);
    delete widget.quiet;
    return true;
  },
  
  removeChild: function(child) {
    var index = this.childNodes.indexOf(child);
    if (index == -1) return false;
    child.unsetParent(this, index);
    this.childNodes.splice(index, 1);
    if (child.element && child.element.parentNode) child.element.dispose();
  },
  
  replaceChild: function(insertion, child) {
    var index = this.childNodes.indexOf(child);
    if (index == -1) return;
    this.removeChild(child);
    this.childNodes.splice(index, 0, insertion);
    insertion.setParent(this, index);
  },
  
  insertBefore: function(insertion, child) {
    var index = this.childNodes.indexOf(child);
    if (index == -1) 
      if (child) return;
      else index = this.childNodes.length;
    this.childNodes.splice(index, 0, insertion);
    insertion.setParent(this, index);
    if (child) child.toElement().parentNode.insertBefore(insertion.toElement(), child.element);
    else this.toElement().insertBefore(insertion.toElement())
  },

  cloneNode: function(children, options) {
    return this.context.create(Object.merge({
      source: this.source,
      tag: this.tagName,
      attributes: this.attributes,
      pseudos: this.pseudos.toObject(),
      classes: this.classes.toObject(),
      clone: true
    }, options));
  },
  
  setDocument: function(document) {
    LSD.Module.DOM.walk(this, function(child) {
      child.ownerDocument = child.document = document;
      child.fireEvent('register', ['document', document]);
      child.fireEvent('setDocument', document);
    });
    return this;
  },
  
  inject: function(widget, where, quiet) {
    if (!widget.lsd) {
      var instance = LSD.Module.DOM.find(widget, true)
      if (instance) widget = instance;
    }
    if (!this.options.root) {
      this.quiet = quiet || (widget.documentElement && this.element && this.element.parentNode);
      if (where === false) widget.appendChild(this, false)
      else if (!inserters[where || 'bottom'](widget.lsd ? this : this.toElement(), widget) && !quiet) return false;
    }
    if (quiet !== true || widget.document) this.setDocument(widget.document || LSD.document);
    if (!this.options.root) this.fireEvent('inject', this.parentNode);
    return this;
  },

  grab: function(el, where){
    inserters[where || 'bottom'](document.id(el, true), this);
    return this;
  },
  
  /*
    Wrapper is where content nodes get appended. 
    Defaults to this.element, but can be redefined
    in other Modules or Traits (as seen in Container
    module)
  */
  
  getWrapper: function() {
    return this.toElement();
  },
  
  write: function(content) {
    if (!content || !(content = content.toString())) return;
    var wrapper = this.getWrapper();
    if (this.written) for (var node; node = this.written.shift();) Element.dispose(node);
    var fragment = document.createFragment(content);
    this.written = Array.prototype.slice.call(fragment.childNodes, 0);
    wrapper.appendChild(fragment);
    this.fireEvent('write', [this.written])
    this.innerText = wrapper.get('text').trim();
    return this.written;
  },

  replaces: function(el){
    this.inject(el, 'after');
    el.dispose();
    return this;
  },
  
  onDOMInject: function(callback) {
    if (this.document) callback.call(this, this.document.element) 
    else this.addEvent('setDocument', callback.bind(this))
  },
  
  onElementDispose: function() {
    if (this.parentNode) this.dispose();
  },

  dispose: function() {
    var parent = this.parentNode;
    if (!parent) return;
    this.fireEvent('beforeDispose', parent);
    parent.removeChild(this);
    this.fireEvent('dispose', parent);
    return this;
  }
});

var inserters = {

  before: function(context, element){
    var parent = element.parentNode;
    if (parent) return parent.insertBefore(context, element);
  },

  after: function(context, element){
    var parent = element.parentNode;
    if (parent) return parent.insertBefore(context, element.nextSibling);
  },

  bottom: function(context, element){
    return element.appendChild(context);
  },

  top: function(context, element){
    return element.insertBefore(context, element.firstChild);
  }

};

LSD.addEvents(LSD.Module.DOM.prototype, {
  destroy: function() {
    if (this.parentNode) this.dispose();
  }
});

Object.append(LSD.Module.DOM, {
  walk: function(element, callback, bind, memo) {
    var widget = element.lsd ? element : LSD.Module.DOM.find(element, true);
    if (widget) {
      var result = callback.call(bind || this, widget, memo);
      if (result) (memo || (memo = [])).push(widget);
    }
    for (var nodes = element.childNodes, node, i = 0; node = nodes[i]; i++) 
      if (node.nodeType == 1) LSD.Module.DOM.walk(node, callback, bind, memo); 
    return memo;
  },
  
  find: function(target, lazy) {
    return target.lsd ? target : ((!lazy || target.uid) && Element[lazy ? 'retrieve' : 'get'](target, 'widget'));
  },
  
  getID: function(target) {
    if (target.lsd) {
      return target.attributes.itemid;
    } else {
      return target.getAttribute('itemid');
    }
  }
});

}();

LSD.Options.document = {
  add: 'setDocument',
  remove: 'unsetDocument'
}
/*
---
 
script: Container.js
 
description: Makes widget use container - wrapper around content setting
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module.DOM

provides:
  - LSD.Module.Container
 
...
*/

LSD.Module.Container = new Class({
  options: {
    container: {
      enabled: true,
      position: null,
      inline: true,
      attributes: {
        'class': 'container'
      }
    },
    
    proxies: {
      container: {
        container: function() {
          return document.id(this.getContainer()) //creates container, once condition is true
        },
        condition: function() {         //turned off by default
          return false 
        },      
        priority: -1,                   //lowest priority
        rewrite: false                  //does not rewrite parent
      }
    }
  },
  
  getContainer: Macro.getter('container', function() {
    var options = this.options.container;
    if (!options.enabled) return;
    var tag = options.tag || (options.inline ? 'span' : 'div');
    return new Element(tag, options.attributes).inject(this.element, options.position);
  }),
  
  getWrapper: function() {
    return this.getContainer() || this.toElement();
  }
});
/*
---

script: Proxies.js

description: Dont adopt children, pass them to some other widget

license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module.DOM

provides: 
  - LSD.Module.Proxies

...
*/
  
LSD.Module.Proxies = new Class({
  initializers: {
    proxies: function() {
      this.proxies = [];
    }
  },
  
  addProxy: function(name, proxy) {
    for (var i = 0, other; (other = this.proxies[i]) && ((proxy.priority || 0) < (other.priority || 0)); i++);
    this.proxies.splice(i, 0, proxy);
  },
  
  removeProxy: function(name, proxy) {
    this.proxies.erase(proxy);
  },
  
  proxyChild: function(child) {
    for (var i = 0, proxy; proxy = this.proxies[i++];) {
      if (!proxy.condition.call(this, child)) continue;
      var self = this;
      var reinject = function(target) {
        if (proxy.rewrite === false) {
          self.appendChild(child, function() {
            target.adopt(child);
          });
        } else {
          child.inject(target, proxy.where);
        }
      };
      var container = proxy.container;
      if (container.call) {
        if ((container = container.call(this, reinject))) reinject(container);
      } else {
        this.use(container, reinject)
      }
      return true;
    }
  },
  
  appendChild: function(widget, adoption) {
    var element = widget.element || widget;
    var parent = element.parentNode;
    if (!adoption && this.canAppendChild && !this.canAppendChild(widget)) {
      if (element == parent) {
        if (widget.parentNode) widget.dispose();
        else if (widget.element.parentNode) widget.element.dispose();
      }
      return false;
    }
    return LSD.Module.DOM.prototype.appendChild.apply(this, arguments);
  },
  
  canAppendChild: function(child) {
    return !this.proxyChild(child);
  }
  
});

LSD.Options.proxies = {
  add: 'addProxy',
  remove: 'removeProxy',
  iterate: true
};
/*
---
 
script: Render.js
 
description: A module that provides rendering workflow
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module.DOM

provides: 
  - LSD.Module.Render

...
*/



LSD.Module.Render = new Class({
  options: {
    render: null
  },
  
  initializers: {
    render: function() {
      this.redraws = 0;
      this.dirty = true;
    }
  },
  
  render: function() {
    if (!this.built) this.build();
    delete this.halted;
    this.redraws++;
    this.fireEvent('render', arguments)
    this.childNodes.each(function(child){
      if (child.render) child.render();
    });
  },
  
  /*
    Update marks widget as willing to render. That
    can be followed by a call to *render* to trigger
    redrawing mechanism. Otherwise, the widget stay 
    marked and can be rendered together with ascendant 
    widget.
  */
  
  update: function(recursive) {
    if (recursive) LSD.Module.DOM.walk(this, function(widget) {
      widget.update();
    });
  },
  
  /*
    Refresh updates and renders widget (or a widget tree 
    if optional argument is true). It is a reliable way
    to have all elements redrawn, but a costly too.
    
    Should be avoided when possible to let internals 
    handle the rendering and avoid some unnecessary 
    calculations.
  */

  refresh: function(recursive) {
    this.update(recursive);
    return this.render();
  },
  

  /*
    Halt marks widget as failed to render.
    
    Possible use cases:
    
    - Dimensions depend on child widgets that are not
      rendered yet
    - Dont let the widget render when it is not in DOM
  */ 
  halt: function() {
    if (this.halted) return false;
    this.halted = true;
    return true;
  }
});

LSD.addEvents(LSD.Module.Render.prototype, {
  stateChange: function() {
    if (this.redraws > 0) this.refresh(true);
  }
});
/*
---

script: Proxies.js

description: All visual rendering aspects under one umbrella

license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module.Layers
  - LSD.Module.Render
  - LSD.Module.Shape

provides: 
  - LSD.Module.Graphics

...
*/


LSD.Module.Graphics = new Class({
  Implements: [
    LSD.Module.Layers, 
    LSD.Module.Render, 
    LSD.Module.Shape
  ]
});
/*
---

name: Request

description: Powerful all purpose Request Class. Uses XMLHTTPRequest.

license: MIT-style license.

requires: [Object, Element, Chain, Events, Options, Browser]

provides: Request

...
*/

var Request = new Class({

	Implements: [Chain, Events, Options],

	options: {/*
		onRequest: nil,
		onComplete: nil,
		onCancel: nil,
		onSuccess: nil,
		onFailure: nil,
		onException: nil,*/
		url: '',
		data: '',
		headers: {
			'X-Requested-With': 'XMLHttpRequest',
			'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
		},
		async: true,
		format: false,
		method: 'post',
		link: 'ignore',
		isSuccess: null,
		emulation: true,
		urlEncoded: true,
		encoding: 'utf-8',
		evalScripts: false,
		evalResponse: false,
		noCache: false
	},

	initialize: function(options){
		this.xhr = new Browser.Request();
		this.setOptions(options);
		this.headers = this.options.headers;
	},

	onStateChange: function(){
		if (this.xhr.readyState != 4 || !this.running) return;
		this.running = false;
		this.status = 0;
		Function.attempt(function(){
			this.status = this.xhr.status;
		}.bind(this));
		this.xhr.onreadystatechange = function(){};
		if (this.options.isSuccess.call(this, this.status)){
			this.response = {text: (this.xhr.responseText || ''), xml: this.xhr.responseXML};
			this.success(this.response.text, this.response.xml);
		} else {
			this.response = {text: null, xml: null};
			this.failure();
		}
	},

	isSuccess: function(){
		return ((this.status >= 200) && (this.status < 300));
	},

	processScripts: function(text){
		if (this.options.evalResponse || (/(ecma|java)script/).test(this.getHeader('Content-type'))) return Browser.exec(text);
		return text.stripScripts(this.options.evalScripts);
	},

	success: function(text, xml){
		this.onSuccess(this.processScripts(text), xml);
	},

	onSuccess: function(){
		this.fireEvent('complete', arguments).fireEvent('success', arguments).callChain();
	},

	failure: function(){
		this.onFailure();
	},

	onFailure: function(){
		this.fireEvent('complete').fireEvent('failure', this.xhr);
	},

	setHeader: function(name, value){
		this.headers[name] = value;
		return this;
	},

	getHeader: function(name){
		return Function.attempt(function(){
			return this.xhr.getResponseHeader(name);
		}.bind(this));
	},

	check: function(){
		if (!this.running) return true;
		switch (this.options.link){
			case 'cancel': this.cancel(); return true;
			case 'chain': this.chain(this.caller.bind(this, arguments)); return false;
		}
		return false;
	},

	send: function(options){
		if (!this.check(options)) return this;
		
		this.options.isSuccess = this.options.isSuccess || this.isSuccess;
		this.running = true;

		var type = typeOf(options);
		if (type == 'string' || type == 'element') options = {data: options};

		var old = this.options;
		options = Object.append({data: old.data, url: old.url, method: old.method}, options);
		var data = options.data, url = String(options.url), method = options.method.toLowerCase();

		switch (typeOf(data)){
			case 'element': data = document.id(data).toQueryString(); break;
			case 'object': case 'hash': data = Object.toQueryString(data);
		}

		if (this.options.format){
			var format = 'format=' + this.options.format;
			data = (data) ? format + '&' + data : format;
		}

		if (this.options.emulation && !['get', 'post'].contains(method)){
			var _method = '_method=' + method;
			data = (data) ? _method + '&' + data : _method;
			method = 'post';
		}

		if (this.options.urlEncoded && method == 'post'){
			var encoding = (this.options.encoding) ? '; charset=' + this.options.encoding : '';
			this.headers['Content-type'] = 'application/x-www-form-urlencoded' + encoding;
		}

		if (this.options.noCache){
			var noCache = 'noCache=' + new Date().getTime();
			data = (data) ? noCache + '&' + data : noCache;
		}

		var trimPosition = url.lastIndexOf('/');
		if (trimPosition > -1 && (trimPosition = url.indexOf('#')) > -1) url = url.substr(0, trimPosition);

		if (data && method == 'get'){
			url = url + (url.contains('?') ? '&' : '?') + data;
			data = null;
		}

		this.xhr.open(method.toUpperCase(), url, this.options.async);

		this.xhr.onreadystatechange = this.onStateChange.bind(this);

		Object.each(this.headers, function(value, key){
			try {
				this.xhr.setRequestHeader(key, value);
			} catch (e){
				this.fireEvent('exception', [key, value]);
			}
		}, this);

		this.fireEvent('request');
		this.xhr.send(data);
		if (!this.options.async) this.onStateChange();
		return this;
	},

	cancel: function(){
		if (!this.running) return this;
		this.running = false;
		this.xhr.abort();
		this.xhr.onreadystatechange = function(){};
		this.xhr = new Browser.Request();
		this.fireEvent('cancel');
		return this;
	}

});

(function(){

var methods = {};
['get', 'post', 'put', 'delete', 'GET', 'POST', 'PUT', 'DELETE'].each(function(method){
	methods[method] = function(data){
		return this.send({
			data: data,
			method: method
		});
	};
});

Request.implement(methods);

})();

Element.Properties.send = {
	
	set: function(options){
		var send = this.get('send').cancel();
		send.setOptions(options);
		return this;
	},

	get: function(){
		var send = this.retrieve('send');
		if (!send){
			send = new Request({
				data: this, link: 'cancel', method: this.get('method') || 'post', url: this.get('action')
			});
			this.store('send', send);
		}
		return send;
	}

};

Element.implement({

	send: function(url){
		var sender = this.get('send');
		sender.send({data: this, url: url || sender.options.url});
		return this;
	}

});

/*
---
 
script: Request.js
 
description: Make various requests to back end
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Mixin
  - Core/Request
  - Ext/Request.Form
  - Ext/Request.Auto
  - Ext/document.createFragment
  
provides: 
  - LSD.Mixin.Request
 
...
*/

LSD.Mixin.Request = new Class({
  options: {
    request: {
      method: 'get'
    },
    states: Array.fast('working'),
    events: {
      self: {
        submit: function() {
          return this.send.apply(this, arguments);
        },
        
        cancel: function() {
          return this.stop()
        },
        
        getCommandAction: function() {
          if (!this.isRequestURLLocal()) return 'submit';
        },

        getTargetAction: function() {
          if (this.getCommandAction() == 'submit') return 'update';
        }
      }
    }
  },
  
  send: function() {
    var data = this.getRequestData && this.getRequestData() || null;
    var options = Object.merge({}, this.options.request, {data: data, url: this.getRequestURL(), method: this.getRequestMethod()});
    for (var i = 0, j = arguments.length, arg, opts; i < j; i++) {
      var arg = arguments[i];
      if (!arg) continue;
      if (typeof arg == 'object' && !arg.event && !arg.indexOf) {
        if (("url" in arg) || ("method" in arg) || ("data" in arg)) Object.merge(options, arg)
        else options.data = Object.merge(options.data || {}, arg);
      } else if (arg.call) var callback = arg;
    }
    var request = this.getRequest(options);
    if (callback) request.addEvent('complete:once', callback);
    return request.send(options);
  },
  
  stop: function() {
    if (this.request) this.request.cancel();
    return this;
  },
  
  getRequest: function(options) {
    var type = this.getRequestType();
    if (!this.request || this.request.type != type) {
      if (!this.request) this.addEvent('request', {
        request: 'onRequest',
        complete: 'onRequestComplete',
        success: 'onRequestSuccess',
        failure: 'onRequestFailure'
      });
      this.request = this[type == 'xhr' ? 'getXHRRequest' : 'getFormRequest'](options);
      if (!this.request.type) {
        this.request.type = type;
        this.fireEvent('register', ['request', this.request, type]);
      }
    }
    return this.request;
  },
  
  onRequestSuccess: function() {
    if (this.getCommandAction) 
      if (this.getCommandAction() == 'submit' && (this.chainPhase == -1 || (this.chainPhase == this.getActionChain().length - 1)))  
        this.eachLink('optional', arguments, true);
  },
  
  onRequest: function() {
    this.busy();
  },
  
  onRequestComplete: function() {
    this.idle();
  },
  
  getXHRRequest: function(options) {
    return new Request.Auto(options);
  },
  
  getFormRequest: function(options) {
    return new Request.Form(options);
  },
  
  getRequestType: function() {
    return this.attributes.transport || this.options.request.type;
  },
  
  getRequestMethod: function() {
    return this.attributes.method || this.options.request.method;
  },
  
  getRequestURL: function() {
    return this.attributes.href || this.attributes.src || this.attributes.action;
  },
  
  isRequestURLLocal: function(base, host) {
    if (!host) host = location.host;
    if (!base) base = location.pathname;
    var url = this.getRequestURL();
    return !url || (url.charAt(0) == "#") || url.match(new RegExp('(?:' + host + ')?' + base + '/?#'));
  }
});

LSD.Behavior.define('[action], [src], [href]', LSD.Mixin.Request);
/*
---
 
script: Sheet.js
 
description: Code to extract style rule definitions from the stylesheet
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - Core/Element
  - Core/Request
  - Sheet/Sheet
  - Sheet/SheetParser.Value
  - Sheet/SheetParser.Property
  - Sheet/SheetParser.Styles
  - LSD.Module.Element
  - LSD.Module.Options
  
provides:
  - LSD.Sheet
 
...
*/

!function() {
  
LSD.Sheet = new Class({
  Implements: [LSD.Module.Element, LSD.Module.Options],
  
  options: {
    compile: false,
    combine: true //combine rules
  },
  
  initialize: function(element, callback) {
    LSD.Module.Options.initialize.call(this, element);
    this.rules = [];
    this.callback = callback;
    if (this.element) this.fetch();
    else if (callback) callback(this);
    if (!LSD.Sheet.stylesheets) LSD.Sheet.stylesheets = [];
    LSD.Sheet.stylesheets.push(this);
  },
  
  define: function(selectors, style) {
    LSD.Sheet.Rule.fromSelectors(selectors, style).each(this.addRule.bind(this))
  },
  
  addRule: function(rule) {
    this.rules.push(rule)
  },
  
  fetch: function(href) {
    if (!href && this.element) href = this.element.get('href');
    if (!href) return;
    new Request({
      url: href,
      onSuccess: this.apply.bind(this)
    }).get();
  },
  
  apply: function(sheet) {
    if (typeof sheet == 'string') sheet = this.parse(sheet);
    if (this.options.compile) this.compile(sheet);
    for (var selector in sheet) this.define(selector, sheet[selector]);
    if (this.callback) this.callback(this)
  },
  
  parse: function(text) {
    var sheet = new Sheet(text);
    var rules = sheet.cssRules;
    var CSS = SheetParser.Styles, Paint = LSD.Styles;
    var parsed = {};
    for (var i = 0, rule; rule = rules[i++];) {      
      var selector = LSD.Sheet.convertSelector(rule.selectorText)
      if (!selector.length || LSD.Sheet.isElementSelector(selector)) continue;
      if (!parsed[selector]) parsed[selector] = {};
      var styles = parsed[selector];
      for (var style = rule.style, j = 0, name; name = style[j++];) {
        var property = name.replace('-lsd-', '').camelCase();
        var value = SheetParser.Value.translate(style[name]);
        var definition = Paint[property] || CSS[property];
        if (!definition) continue;
        if (definition.type != 'simple') {
          var result = definition[value.push ? 'apply' : 'call'](this, value);
          if (result === false) value = false;
          else if (result !== true) {
            for (prop in result) styles[prop] = Value.compile(result[prop]);
            continue
          }
        }
        styles[property] = Value.compile(value);
      }
    };
    return parsed;
  },
  
  attach: function(node) {
    this.rules.each(function(rule) {
      rule.attach(node)
    });
    LSD.start();
  },
  
  detach: function(node) {
    this.rules.each(function(rule) {
      rule.detach(node)
    });
  },
  
  /* Compile LSD stylesheet to CSS when possible 
     to speed up setting of regular properties
     
     Will create stylesheet node and apply the css
     unless *lightly* parameter was given. 
     
     Unused now, because we decompile css instead */
  compile: function(lightly) {
    var bits = [];
    this.rules.each(function(rule) {
      if (!rule.implied) return;
      bits.push(rule.getCSSSelector() + " {")
      for (var property in rule.implied) {  
        var value = rule.implied[property];
        if (typeof value == 'number') {
          if (property != 'zIndex') value += 'px';
        } else if (value.map) {
          value = value.map(function(bit) { return bit + 'px'}).join(' ');
        }
        bits.push(property.hyphenate() + ': ' + value + ';')
      }
      bits.push("}")
    })
    var text = bits.join("\n");
    if (lightly) return text;
    
    if (window.createStyleSheet) {
      var style = window.createStyleSheet("");
      style.cssText = text;
    } else {
      var style = new Element('style', {type: 'text/css', media: 'screen'}).adopt(document.newTextNode(text)).inject(document.body);
    }
  }
});

Object.append(LSD.Sheet, {
  isElementSelector: function(selector) {
    return selector.match(/svg|v\\?:|:(?:before|after)|\.container/);
  },
  convertSelector: function(selector) {
    return selector.replace(/\.id-/g , '#').replace(/\.is-/g, ':').replace(/\.lsd#/g, '#').
                    replace(/\.lsd\./g, '').replace(/html\sbody\s/g, '');
  },
  isElementStyle: function(cc) {
    return SheetParser.Styles[cc] && !LSD.Styles[cc] && (cc != 'height' && cc != 'width')
  },
  isRawValue: function(value) {
    return (value.indexOf('hsb') > -1) || (value.indexOf('ART') > -1) || (value.indexOf('LSD') > -1) || 
           (value.charAt(0) == '"') || (value == 'false') || (value == parseInt(value)) || (value == parseFloat(value))
  }
});

LSD.Sheet.Rule = function(selector, style) {
  this.selector = selector;
  this.index = LSD.Sheet.Rule.index ++;
  this.expressions = selector.expressions[0];
  this.specificity = this.getSpecificity();
  for (property in style) {
    var cc = property.camelCase();
    var type = (LSD.Sheet.Rule.separate && LSD.Sheet.isElementStyle(cc)) ? 'implied' : 'style';
    if (!this[type]) this[type] = {}; 
    this[type][cc] = style[property];
  }
}
LSD.Sheet.Rule.index = 0;

LSD.Sheet.Rule.separate = true;

Object.append(LSD.Sheet.Rule.prototype, {  
  attach: function(node) {
    if (!this.watcher) this.watcher = this.watch.bind(this);
    node.watch(this.selector, this.watcher)
  },
  
  detach: function(node) {
    node.unwatch(this.selector, this.watcher);
  },
  
  watch: function(node, state) {
    node[state ? 'addRule' : 'removeRule'](this)
  },
  
  getCSSSelector: function() {
    return this.expressions.map(function(parsed){
      var classes = ['', 'lsd'];
      if (parsed.tag) classes.push(parsed.tag);
      if (parsed.id) classes.push('id-' + parsed.id);
      if (parsed.pseudos) {
        parsed.pseudos.each(function(pseudo) {
          classes.push(pseudo.key);
        });
      };
      return classes.join('.');
    }).join(' ');
  },
  
  getSpecificity: function(selector) {
    specificity = 0;
    this.expressions.each(function(chunk){
      if (chunk.tag && chunk.tag != '*') specificity++;
      if (chunk.id) specificity += 100;
      for (var i in chunk.attributes) specificity++;
      specificity += (chunk.pseudos || []).length;
      specificity += (chunk.classes || []).length * 10;
    });
    return specificity;
  }
});

var Value = LSD.Sheet.Value = {
  px: function(value) {
    return value;
  },
  deg: function(value) {
    return value;
  },
  em: function(value) {
    return function() {
      return value * (this.baseline || 16)
    }
  },
  "%": function(value) {
    return function(property) {
      var resolved = Value['%'].resolve(property);
      if (resolved.call) resolved = resolved.call(this);
      return resolved / 100 * value;
    }
  },
  url: function(value) {
    return value
  },
  src: function(value) {
    return value
  },
  rgb: function() {
    return window.rgb.apply(window, arguments)
  },
  rgba: function(value) {
    return window.rgb.apply(window, arguments)
  },
  hsb: function() {
    return window.hsb.apply(window, arguments)
  },
  hex: function(value) {
    return new Color(value)
  },
  calc: function(value) {
    var bits = value.map(function(bit, i) {
      if (bit.call) {
        return "value[" + i + "].call(this, property)"
      } else {
        return bit;
      }
    })
    eval("var compiled = function(property) { return " + bits.join(" ") + "}");
    return compiled
  },
  min: function() {
    return Math.min.apply(Math, arguments)
  },
  max: function() {
    return Math.max.apply(Math, arguments)
  }
};


var resolved = {};
var dimensions = {
  height: /[hH]eight|[tT]op|[bB]ottom|[a-z]Y/,
  width: /[wW]idth|[lL]eft|[rR]ight|[a-z]X/
}
Value['%'].resolve = function(property) {
  var result = resolved[property];
  if (result != null) return result;
  for (var side in dimensions) if (property.match(dimensions[side])) {
    result = function() { if (this.parentNode) return this.parentNode.getStyle(side); return 0;}
    break;
  }
  return (resolved[property] = (result || 1));
};

Value.compiled = {};
Value.compile = function(value, context) {
  if (!value || value.call || typeof value == 'number') return value;
  if (!context) context = Value;
  if (value.push) {
    for (var i = 0, j = value.length, result = [], bit; i < j; bit = value[i++]) result[i] = Value.compile(value[i], context);
    return result;
  }
  if (value.unit)  return Object.append(context[value.unit](value.number), value);
  if (value.charAt) {
    if (context.hex && value.charAt(0) == "#" && value.match(/#[a-z0-9]{3,6}/)) return context.hex(value);
  } else for (var name in value) {
    if (context[name]) {
      return context[name](Value.compile(value[name]), context);
    } else {
      value[name] = Value.compile(value[name]);
    }
    break;
  }
  return value;
}

LSD.Sheet.Rule.fromSelectors = function(selectors, style) { //temp solution, split by comma
  return selectors.split(/\s*,\s*/).map(function(selector){
    return new LSD.Sheet.Rule(Slick.parse(selector), style);
  });
};


}();

/*
---
 
script: Data.js
 
description: Get/Set javascript controller into element
 
license: MIT-style license.
 
requires:
- Core/Element
 
provides: [Element.Properties.widget]
 
...
*/

Element.Properties.widget = {
  get: function(){
    var widget, element = this;
    while (element && !(widget = element.retrieve('widget'))) element = element.getParent();
    if (widget && (element != this)) this.store('widget', widget);
    return widget;
  },
	
	set: function(options) {
		if (this.retrieve('widget')) {
			return this.retrieve('widget').setOptions(options)
		} else {
			var given = this.retrieve('widget:options') || {};
			for (var i in options) {
				if (given[i] && i.match('^on[A-Z]')) {
					given[i] = (function(a,b) {        // temp solution (that is 1.5 years in production :( )
						return function() {              // wrap two functions in closure instead of overwrite
							a.apply(this, arguments);      // TODO: some way of passing a raw array of callbacks
							b.apply(this, arguments);
						}
					})(given[i], options[i])
				} else {
					var o = {};
					o[i] = options[i];
					$extend(given, o);
				}
			}
			this.store('widget:options', given);
		}
	}
};




/*
---
 
script: Events.js
 
description: A mixin that adds support for declarative events assignment
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module
  - Core/Events
  - Core/Element.Event
  - More/Element.Delegation
  - More/Events.Pseudos
  - Ext/Element.Properties.widget

provides:
  - LSD.Module.Events

...
*/

!function() {
  
LSD.Module.Events = new Class({
  Implements: [window.Events],
  
  initializers: {
    events: function() {
      this.events = {};
    }
  },
  
  addEvent: function(name, fn) {
    return Events.setEvent.call(this, name, fn)
  },
  
  removeEvent: function(name, fn) {
    return Events.setEvent.call(this, name, fn, true)
  },
  
  /*
    The functions takes events object defined in options
    and binds all functions to the widget.
  */

  bindEvents: function(events, bind, args) {
    var result = {};
    for (var name in events) {
      var value = events[name];
      if (!value || value.call) result[name] = value;
      else if (value.indexOf) result[name] = this.bindEvent(value, bind, args);
      else result[name] = this.bindEvents(value);
    }
    return result;
  },
  
  bindEvent: function(name, bind, args) {
    if (name.map) {
      var args = name.slice(1);
      name = name[0];
    }
    if (!this.$bound) this.$bound = {};
    if (!this.$bound[name]) this.$bound[name] = Events.bind(name, bind || this, args);
    return this.$bound[name];
  },

  dispatchEvent: function(type, args){
    var node = this;
    type = type.replace(/^on([A-Z])/, function(match, letter) {
      return letter.toLowerCase();
    });
    while (node) {
      var events = node.$events;
      if (events && events[type]) events[type].each(function(fn){
        return fn[args.push ? 'apply' : 'call'](node, args);
      }, node);
      node = node.parentNode;
    }
    return this;
  },
  
  captureEvent: function(type, args) {
    var events = this.$events[type];
    if (!events) return;
    for (var i = 0, j = events.length, event; i < j; i++) {
      if (!(event = events[i])) continue;
      var result = event.apply(this, args);
      if (result) return result;
    }
  }
});

LSD.addEvents(LSD.Module.Events.prototype, {
  register: function(name, object) {
    var events = this.events[name];
    if (events) Events.setStoredEvents.call(object, events, true);
  },
  unregister: function(name, object) {
    var events = this.events[name];
    if (events) Events.setStoredEvents.call(object, events, false);
  }
});

var Events = Object.append(LSD.Module.Events, {
  setStoredEvents: function(events, state) {
    var target = Events.Targets[name];
    for (var event in events)
      for (var i = 0, fn, group = events[event]; fn = group[i++];)
        this[state ? 'addEvent' : 'removeEvent'](event, fn.indexOf ? this.bindEvent(fn) : fn);
  },
  
  watchEventTarget: function(name, fn) {
    var target = Events.Targets[name];
    if (target.events) Object.each(target.events, function(state, event) {
      this.addEvent(event, function(object) {
        if (target.getter === false) object = this;
        fn.call(this, widget, state);
      });
    }, this);
    if (target.condition && target.condition.call(this)) return this;
    else if (target.getter && this[target.getter]) target = this[target.getter];
  },
  
  setEvent: function(name, fn, unset) {
    if (fn.indexOf) fn = this.bindEvent(fn);
    var method = unset ? 'removeEvent' : 'addEvent';
    if (fn.call) {
      return window.Events.prototype[method].call(this, name, fn);
    } else {
      if (name.charAt(0) == '_') {
        for (var event in fn) this[method](event, fn[event]);
        return this;
      }
      var events = this.events[name], initial = !!events;
      if (!events) events = this.events[name] = {};
      var bound = this.bindEvents(fn);
      for (event in bound) {
        var group = (events[event] || (events[event] = []));
        if (unset) {
          var i = group.indexOf(bound[event]);
          if (i > -1) group.slice(i, 1);
        } else group.push(bound[event])
      }
      var target = Events.Targets[name];
      if (target)
        if (target.call && (target = target.call(this)))
          for (var event in bound) target[method](event, bound[event]);
        else if (initial) 
          Events.watchEventTarget.call(this, name, function(object, state) {
            Events.setStoredEvents.call(object, events, state);
          })
      return this;
    }
  },
  
  setEventsByRegister: function(name, state, events) {
    var register = this.$register;
    if (!register) register = this.$register = {};
    if (register[name] == null) register[name] = 0;
    switch (register[name] += (state ? 1 : -1)) {
      case 1:
        if (events) this.addEvents(events)
        else Events.setStoredEvents.call(this, this.events[name], true);
        return true;
      case 0:
        if (events) this.removeEvents(events)
        else Events.setStoredEvents.call(this, this.events[name], false);
        return false;
    }
  },
  
  bind: function(method, bind, args) {
    return function() {
      if (bind[method]) bind[method].apply(bind, args || arguments);
    }
  }
});

/*
  Target system re-routes event groups to various objects.  
  
  Combine them for fun and profit.
  
  | Keyword    |  Object that recieves events       |
  |-------------------------------------------------|
  | *self*     | widget itself (no routing)         |
  | *element*  | widget element (when built)        |
  | *parent*   | parent widget                      |
  | *document* | LSD document                       |
  | *window*   | window element                     |
  
  | State      | Condition                          |
  |-------------------------------------------------|
  | *enabled*  | widget is enabled                  |
  | *disabled* | widget is disabled                 |
  | *focused*  | widget is focused                  |
  | *blured*   | widget is blured                   |
  | *target*   | first focusable parent is focused  |
  
  | Extras     | Description                        |
  |-------------------------------------------------|
  | *expected* | Routes events to widgets, selected |
  |            | by selectors (keys of event group).|
  |            | Provided by Expectations module    |
  | _\w        | An event group which name starts   |
  |            | with underscore is auto-applied    |
  
*/
Events.Targets = {
  root: function() {
    
  },
  self: function() { 
    return this
  },
  window: function() {
    return window;
  },
  mobile: function() {
    return this;
  }
};

!function(Known, Positive, Negative) {
  Object.each(Object.append({}, Positive, Negative), function(name, condition) {
    var events = {}, positive = !!Positive[name], state = Known[name];
    events[state[!positive ? 'enabler' : 'disabler']] = true;
    events[state[ positive ? 'enabler' : 'disabler']] = false;
    Events.Targets[condition] = {
      getter: false,
      condition: function() {
        return positive ^ this[state.property || name]
      },
      events: events
    }
  });
}(LSD.States.Known, LSD.States.Positive, LSD.States.Negative)


/*
  Defines special *on* pseudo class for events used for
  event delegation. The difference between usual event 
  delegation (which is :relay in mootools) and this, is
  that with :on you can use LSD selectors and it fires 
  callbacks in context of widgets.
  
  element.addEvent('mouseover:on(button)', callback)
*/

Event.definePseudo('on', function(split, fn, args){
  var event = args[0];
  var widget = Element.get(event.target, 'widget');
  if (widget && widget.match(split.value)) {
    fn.call(widget, event, widget, event.target);
    return;        
  }
});

LSD.Options.events = {
  add: 'addEvent',
  remove: 'removeEvent',
  iterate: true
};

Class.Mutators.$events = function(events) {
  if (!this.prototype.$events) this.prototype.$events = {};
  for (name in events) {
    var type = this.prototype.$events[name] || (this.prototype.$events[name] = []);
    var group = events[name];
    for (var i = 0, j = group.length; i < j; i++) {
      var fn = group[i];
      if (fn) type.push(fn);
    }
  }
};


}();
/*
---
 
script: BorderRadius.js
 
description: Set border radius for all the browsers
 
license: Public domain (http://unlicense.org).
 
requires:
- Core/Element
 
provides: [Element.Properties.borderRadius]
 
...
*/


(function() {
  if (Browser.safari || Browser.chrome) 
    var properties = ['webkitBorderTopLeftRadius', 'webkitBorderTopRightRadius', 'webkitBorderBottomRightRadius', 'webkitBorderBottomLeftRadius'];
  else if (Browser.firefox)
    var properties = ['MozBorderRadiusTopleft', 'MozBorderRadiusTopright', 'MozBorderRadiusBottomright', 'MozBorderRadiusBottomleft']
  else
    var properties = ['borderRadiusTopLeft', 'borderRadiusTopRight', 'borderRadiusBottomRight', 'borderRadiusBottomLeft']
  
  Element.Properties.borderRadius = {

  	set: function(radius){
	    if (radius.each) radius.each(function(value, i) {
	      this.style[properties[i]] = value + 'px';
	    }, this);
  	},

  	get: function(){
	  
    }

  };

})();
/*
---
 
script: BoxShadow.js
 
description: Set box shadow in an accessible way
 
license: Public domain (http://unlicense.org).
 
requires:
- Core/Element
 
provides: [Element.Properties.boxShadow]
 
...
*/
(function() {
  if (Browser.safari)            var property = 'webkitBoxShadow';
  else if (Browser.firefox)      var property = 'MozBoxShadow'
  else                           var property = 'boxShadow';
  if (property) {
    var dummy = document.createElement('div');
    var cc = property.hyphenate();
    if (cc.charAt(0) == 'w') cc = '-' + cc;
    dummy.style.cssText = cc + ': 1px 1px 1px #ccc'
    Browser.Features.boxShadow = !!dummy.style[property];
    delete dummy;
  }  
  Element.Properties.boxShadow = {
    set: function(value) {
      if (!property) return;
      switch ($type(value)) {
        case "number": 
          value = {blur: value};
          break;
        case "array":
          value = {
            color: value[0],
            blur: value[1],
            x: value[2],
            y: value[3]
          }
          break;
        case "boolean":
          if (value) value = {blur: 10};
          else value = false
        case "object":
         if (value.isColor) value = {color: value}
      }
      if (!value) {
        if (!this.retrieve('shadow:value')) return;
        this.eliminate('shadow:value');
        this.style[property] = 'none';
        return;
      }
      this.store('shadow:value', value)
      var color = value.color ? value.color.toString() : 'transparent'
      this.style[property] = (value.x || 0) + 'px ' + (value.y || 0) + 'px ' + (value.blur || 0) + 'px ' + color;
    }
  }
})();
/*
---
 
script: Shadow.js
 
description: Drops outer shadow with offsets. Like a box shadow!
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
- LSD.Layer
- Ext/Element.Properties.boxShadow
- Ext/Element.Properties.borderRadius
 
provides: [LSD.Layer.Shadow, LSD.Layer.Shadow.Layer]
 
...
*/

                              //only gecko & webkit nightlies                                       AppleWebKit/534.1+ (KHTML, ... plus means nightly
Browser.Features.SVGFilters = Browser.firefox || (Browser.webkit && navigator.userAgent.indexOf("+ (KHTML") > -1) 

LSD.Layer.Shadow = {
  
  properties: {
    shadow:    ['blur', ['offsetX', 'offsetY'], 'color'],
    blur:      ['length', 'number'],
    offsetX:   ['length', 'number'],
    offsetY:   ['length', 'number'],
    color:     ['color']
  },
  
  paint: function(color, blur, x, y, stroke, method) {
    //if (!method) {
    //  if (this.method) method = method
    //  if (blur < 4) method = 'onion';
    //  else if (Browser.Features.boxShadow && this.base.name == 'rectangle') method = 'native';
    //  else if (Browser.Features.SVGFilters) method = 'blur';
    //  else method = 'onion'
    //}
    //if (this.method && method != this.method) this.eject();
    //return this.setMethod(method).paint.apply(this, arguments);
  }
}

/*
---
 
script: Shadow.Blur.js
 
description: SVG Filter powered shadow
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
- LSD.Layer.Shadow
 
provides: [LSD.Layer.Shadow.Blur]
 
...
*/

LSD.Layer.Shadow.Blur = new Class({
  //Extends: LSD.Layer.Shadow,

  paint: function(color, blur, x, y, stroke) {
    this.produce(stroke);
    this.shape.fill.apply(this.shape, color ? $splat(color) : null);
    if (blur > 0) this.shape.blur(blur);
    else this.shape.unblur();
    return {
      move: {
        x: x + blur, 
        y: y + blur
      },
      outside: {
        left: Math.max(blur - x, 0),
        top: Math.max(blur - y, 0),
        right: Math.max(blur + x, 0),
        bottom: Math.max(blur + y, 0)
      }
    }
  }
})
/*
---
 
script: InnerShadow.js
 
description: Drops inner shadow 
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Layer.Shadow
 
provides: 
  - LSD.Layer.Shadow.Inset
 
...
*/

LSD.Layer.InnerShadow = new Class({
  //Extends: LSD.Layer.Shadow,
  
  properties: {
    required: ['innerShadowColor'],
    numerical: ['innerShadowBlur', 'innerShadowOffsetX', 'innerShadowOffsetY']
  },

  paint: function(color, blur, x, y) {
    var fill = new Color(color);
    fill.base = fill.alpha;
    var transition = function(p){
      return 1 - Math.sin((1 - p) * Math.PI / 2);
    };
    var offset = Math.max(Math.abs(x), Math.abs(y));
    blur += offset;
    for (var i = 0; i < blur; i++) {
      if (blur == 0) {
        fill.alpha = Math.min(fill.base * 2, 1)
      } else {
        fill.alpha = fill.base * transition((blur - i) / blur)
      }
      var layer = this.layers[i];
      if (!layer) layer = this.layers[i] = LSD.Layer.InnerShadow.Layer.getInstance(this);
      layer.layer = this;
      layer.base = this.base;
      layer.blur = blur
      layer.dy = y - x
      layer.y = Math.max(Math.min(layer.dy, 0) + i, 0);
      layer.dx = x - y;
      layer.x = Math.max(Math.min(layer.dx, 0) + i, 0);
      layer.produce([
        Math.min(((layer.x > 0) ? ((layer.dx - i < 0) ? 1 : 0.5) * - layer.x  - 0.25 : 0), 0),
        Math.min(((layer.y > 0) ? (layer.dy + i < 0 ? 1 : 0.5) * - layer.y  - 0.25: 0), 0)
      ]);
      layer.stroke(fill, 1);
    }
    var length = this.layers.length;
    for (var i = blur; i < length; i++) if (this.layers[i]) LSD.Layer.InnerShadow.Layer.release(this.layers[i]);
    this.layers.splice(blur, length);
  },
  
  translate: function(x, y) {
    this.parent.apply(this, arguments);
    for (var i = 0, j = this.layers.length; i < j; i++) {
      var layer = this.layers[i];
      if (layer) layer.translate(x + layer.x, y + layer.y);
    }
  },
  
  eject: function() {
    for (var i = 0, j = this.layers.length; i < j; i++) {
      var layer = this.layers[i];
      if (!layer) continue;
      LSD.Layer.InnerShadow.Layer.release(layer)
      if (layer.shape.element.parentNode) layer.shape.element.parentNode.removeChild(layer.shape.element);
    }
  },

  inject: function(node) {
    this.parent.apply(this, arguments);
    this.update.apply(this, arguments);
  },
  
  update: function() {
    for (var i = 0, j = this.layers.length; i < j; i++) if (this.layers[i]) this.layers[i].inject.apply(this.layers[i], arguments);
  }
});
LSD.Layer.InnerShadow.Layer = new Class({
  Extends: LSD.Layer
});
LSD.Layer.InnerShadow.Layer.stack = [];
LSD.Layer.InnerShadow.Layer.getInstance = function() {
  return LSD.Layer.InnerShadow.Layer.stack.pop() || (new LSD.Layer.InnerShadow.Layer);
}
LSD.Layer.InnerShadow.Layer.release = function(layer) {
  layer.element.parentNode.removeChild(layer.element);
  LSD.Layer.InnerShadow.Layer.stack.push(layer);
};

/*
---
 
script: Shadow.Native.js
 
description: CSS powered shadow
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
- LSD.Layer.Shadow
 
provides: [LSD.Layer.Shadow.Native]
 
...
*/

LSD.Layer.Shadow.Native = new Class({
  //Extends: LSD.Layer,

  paint: function(color, blur, x, y, stroke) {
    var widget = this.base.widget;
    var element = widget.toElement();
    element.set('borderRadius', widget.getStyle('cornerRadius'));
    element.set('boxShadow', {color: color, blur: blur, x: x, y: y})
  },
  
  eject: function() {
    var widget = this.base.widget;
    var element = widget.element;
    element.set('boxShadow', false)
  }
})
/*
---
 
script: Shadow.Onion.js
 
description: Draws shadow with layers stack upon each others
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
- LSD.Layer.Shadow
 
provides: [LSD.Layer.Shadow.Onion]
 
...
*/

LSD.Layer.Shadow.Onion = new Class({
  //Extends: LSD.Layer.Shadow,
  
  paint: function(color, blur, x, y, stroke) {
    var fill = new Color(color);
    fill.base = fill.alpha;
    //var node = this.element.parentNode;
    var layers = Math.max(blur, 1);
    for (var i = 0; i < layers; i++) {
      if (blur == 0) {
        fill.alpha = Math.min(fill.base * 2, 1)
      } else {
        fill.alpha = fill.base / 2 * (i == blur ? .29 : (.2 - blur * 0.017) + Math.sqrt(i / 100));
      }
      var rectangle = this.layers[i];
      if (!rectangle) rectangle = this.layers[i] = LSD.Layer.Shadow.Layer.getInstance(this);
      rectangle.base = this.base;
      rectangle.shadow = this;
      rectangle.produce(stroke / 2 + blur / 2 - i);
      rectangle.fill(fill);
    }
    var length = this.layers.length;
    for (var i = layers; i < length; i++) if (this.layers[i]) LSD.Layer.Shadow.Layer.release(this.layers[i]);
    this.layers.splice(layers, length);
    return {
      move: {
        x: x * 1.5, //multiplying by 1.5 is unreliable. I need a better algorithm altogether
        y: y * 1.5
      },
      outside: {
        left: Math.max(blur - x, 0),
        top: Math.max(blur - y, 0),
        right: Math.max(blur + x, 0),
        bottom: Math.max(blur + y, 0)
      }
    }
  },

  inject: function(node) {
    this.parent.apply(this, arguments);
    this.update.apply(this, arguments);
  },
  
  update: function() {
    for (var i = 0, j = this.layers.length; i < j; i++) if (this.layers[i]) this.layers[i].inject.apply(this.layers[i], arguments);
  },
  
  eject: function() {
    for (var i = 0, j = this.layers.length; i < j; i++) {
      var layer = this.layers[i];
      if (!layer) continue;
      LSD.Layer.Shadow.Layer.release(layer)
      if (layer.shape.element.parentNode) layer.shape.element.parentNode.removeChild(layer.shape.element);
    }
  },

  translate: function(x, y) {
    this.parent.apply(this, arguments);
    for (var i = 0, j = this.layers.length; i < j; i++) 
      if (this.layers[i]) this.layers[i].translate(x + i + j / 2, y + i + j / 2)
  }
});

LSD.Layer.Shadow.Layer = new Class({
  Extends: LSD.Layer,
  
  
  inject: function(container){
    this.eject();
    if (container instanceof ART.SVG.Group) container.children.push(this);
    this.container = container;
    var first = container.element.firstChild;
    if (first) container.element.insertBefore(this.shape.element, first);
    else container.element.appendChild(this.shape.element);
    return this;
  }
});
LSD.Layer.Shadow.Layer.stack = [];
LSD.Layer.Shadow.Layer.getInstance = function() {
  return LSD.Layer.Shadow.Layer.stack.pop() || (new LSD.Layer.Shadow.Layer);
};
LSD.Layer.Shadow.Layer.release = function(layer) {
  var shape = layer.shape;
  if (shape) shape.element.parentNode.removeChild(shape.element);
  LSD.Layer.Shadow.Layer.stack.push(layer);
};

/*
---
 
script: Item.js
 
description: Methods to get and set microdata closely to html5 spsec
 
license: MIT-style license.
 
requires:
- Core/Element
 
provides: [Element.prototype.getItems, Element.Properties.item, Element.Microdata]
 
...
*/

[Document, Element].invoke('implement', {
  getItems: function(tokens) {
    var selector = '[itemscope]:not([itemprop])';
    if (tokens) selector += tokens.split(' ').map(function(type) {
      return '[itemtype~=' + type + ']'
    }).join('');
    return this.getElements(selector).each(function(element) {
      return element.get('item');
    }).get('item')
  }
});

(function() {
  var push = function(properties, property, value) {
    var old = properties[property];
    if (old) { //multiple values, convert to array
      if (!old.push) properties[property] = [old];
      properties[property].push(value)
    } else {
      properties[property] = value;
    }
  }

Element.Properties.properties = {
  get: function() {
    var properties = {};
    var property = this.getProperty('itemprop');
    if (property) {
      var value = this.get('itemvalue');
      if (value) push(properties, property, value)
    }
    
    this.getChildren().each(function(child) {
      var values = child.get('properties');
      for (var property in values) push(properties, property, values[property]);
    });
    
    var reference = this.getProperty('itemref');
    if (reference) {
      var selector = reference.split(' ').map(function(id) { return '#' + id}).join(', ');
      $$(selector).each(function(reference) {
        var values = reference.get('properties');
        for (var property in values) push(properties, property, values[property]);
      })
    }
    
    return properties;
  },
  
  set: function(value) {
    this.getChildren().each(function(child) {
      var property = child.getProperty('itemprop');
      if (property) child.set('itemvalue', value[property]);
      else child.set('properties', value)
    });
  }
};

})();

Element.Properties.item = {
  get: function() {
    if (!this.getProperty('itemscope')) return;
    return this.get('properties');
  },
  
  set: function(value) {
    if (!this.getProperty('itemscope')) return;
    return this.set('properties', value);
  }
};

(function() {

var resolve = function(url) {
  if (!url) return '';
  var img = document.createElement('img');
  img.setAttribute('src', url);
  return img.src;
}

Element.Properties.itemvalue = {
  get: function() {
    var property = this.getProperty('itemprop');
    if (!property) return;
    var item = this.get('item');
    if (item) return item;
    switch (this.get('tag')) {
      case 'meta':
        return this.get('content') || '';
      case 'input':
      case 'select':
      case 'textarea':
        return this.get('value');
      case 'audio':
      case 'embed':
      case 'iframe':
      case 'img':
      case 'source':
      case 'video':
        return resolve(this.get('src'));
      case 'a':
      case 'area':
      case 'link':
        return resolve(this.get('href'));
      case 'object':
        return resolve(this.get('data'));
      case 'time':
        var datetime = this.get('datetime');
        if (!(datetime === undefined)) return datetime;
      default:
        return this.getProperty('itemvalue') || this.get('text');
    }        
  },

  set: function(value) {
    var property = this.getProperty('itemprop');
    var scope = this.getProperty('itemscope');
    if (property === undefined) return;
    else if (scope && Object.type(value[scope])) return this.set('item', value[scope]);
    
    switch (this.get('tag')) {
      case 'meta':
        return this.set('content', value);
      case 'audio':
      case 'embed':
      case 'iframe':
      case 'img':
      case 'source':
      case 'video':
        return this.set('src', value);
      case 'a':
      case 'area':
      case 'link':
        return this.set('href', value);
      case 'object':
        return this.set('data', value);
      case 'time':
        var datetime = this.get('datetime');
        if (!(datetime === undefined)) this.set('datetime', value)
      default:
        return this.set('html', value);
    }
  }
}

})();
/*
---
 
script: List.js
 
description: Mixin that makes it simple to work with a list of item (and select one of them)
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Mixin
  - Core/Element
  - Ext/Element.Properties.item
 
provides: 
  - LSD.Mixin.List
 
...
*/


LSD.Mixin.List = new Class({  
  options: {
    endless: true,
    force: false,
    proxies: {
      container: {
        condition: function(widget) {
          return !!widget.setList
        }
      }
    },
    shortcuts: {
      previous: 'previous',
      next: 'next'
    },
    has: {
      many: {
        items: {
          selector: ':item',
          scopes: {
            selected: {
              filter: ':selected',
              callbacks: {
                add: function(widget) {
                  if (this.setValue) this.setValue(widget);
                  this.fireEvent('set', widget);
                },
                remove: function(widget) {
                  if (widget.getCommandType() != 'checkbox') return;
                  if (this.setValue) this.setValue(widget, true);
                  this.fireEvent('unset', widget);
                }
              }
            }
          },
          as: 'listWidget',
          pseudos: Array.fast('value', 'command'),
          states: {
            link: {
              checked: 'selected'
            },
            add: Array.fast('selected')
          },
          callbacks: {
            fill: 'fill',
            empty: 'empty'
          },
          options: function() {
            if (this.attributes.multiple) {
              return {pseudos: {checkbox: true}};
            } else {
              return {pseudos: {radio: true}, radiogroup: this.lsd};
            }
          }
        }
      }
    },
    states: {
      empty: true
    }
  },
  
  findItemByValue: function(value) {
    for (var i = 0, widget; widget = this.items[i++];) {
      var val = widget.value == null ? (widget.getValue ? widget.getValue() : null) : widget.value;
      if (val === value) return this.items[i];
    }
    return null;
  },
  
  sort: function(sort) {
    return this.getItems().sort(sort)
  },
  
  filter: function(filter) {
    return this.getItems().filter(filter)
  }
  
});

LSD.Behavior.define(':list', LSD.Mixin.List);
/*
---
 
script: Uploader.js
 
description: Add your widget have a real form value.
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Mixin
  - Widgets/LSD.Widget.Button
  - Uploader/*
  - LSD.Mixin.List
  - Core/JSON
  
provides: 
  - LSD.Mixin.Uploader
 
...
*/

LSD.Mixin.Uploader = new Class({
  options: {
    actions: {
      uploader: {
        enable: function() {
          if (this.attributes.multiple) this.options.uploader.multiple = true;
          this.fireEvent('register', ['uploader', this.getUploader()]);
          var adapter = Uploader.getAdapter();
          this.getUploader().attach(this.getUploaderTarget());
          this.getStoredBlobs().each(this.addFile, this);
        },
        disable: function() {
          this.getUploader().removeEvents(this.events.uploader);
          this.getUploader().detach(this.getUploaderTarget())
          this.fireEvent('unregister', ['uploader', this.getUploader()]);
        }
      }
    },
    events: {
      uploader: {
        fileComplete: 'onFileComplete',
        fileRemove: 'onFileRemove',
        fileProgress: 'onFileProgress'
      }
    },
    layout: Array.fast('::list'),
    has: {
      one: {
        list: {
          selector: 'filelist'
        }
      }
    },
    states: Array.fast('empty')
  },
  
  initializers: {
    uploader: function() {
      this.blobs = {};
    }
  },
  
  getUploader: Macro.getter('uploader', function() {
    var options = Object.append({}, this.options.uploader);
    if (!options.fileClass) options.fileClass = this.getUploaderFileClass(Uploader.getAdapter());
    var uploader = new Uploader(options);
    uploader.widget = this;
    return uploader;
  }),
  
  getUploaderTarget: function() {
    return this.element;
  },

  getUploaderFileClass: function(adapter) {
    if (!adapter) adapter = Uploader.getAdapter();
    if (adapter.indexOf) adapter = Uploader[LSD.toClassName(adapter)];
    if (!adapter.File.Widget) {
      var Klass = new Class({
        Implements: [adapter.File, LSD.Widget.Filelist.File]
      });
      adapter.File.Widget = function() {
        return new LSD.Widget().mixin(Klass);
      }
    }
      
    
    
    return adapter.File.Widget;
  },
  
  onFileComplete: function(file) {
    var blob = this.processStoredBlob(file.response.text);
    if (blob && !blob.errors) {
      this.onFileSuccess(file, blob);
    } else {
      this.onFileFailure(file, blob || response);
    }
  },
  
  processValue: function(file) {
    return file.id || file.uid;
  },
  
  onFileSuccess: function(file, blob) {
    this.addBlob(file, blob);
  },
  
  onFileRemove: function(file) {
    this.removeBlob(file);
  },
  
  getBlob: function(file) {
    return this.blobs[file.id];
  },
  
  addBlob: function(file, blob) {
    this.setValue(blob);
    this.blobs[file.id] = blob;
  },
  
  removeBlob: function(file) {
    this.setValue(this.blobs[file.id], true);
    delete this.blobs[file.id];    
  },
  
  retrieveStoredBlobs: function() {
    var attrs = this.attributes;
    return attrs.file || attrs.files || attrs.blobs || blob;
  },

  processStoredBlob: function(response) {
    if (response.indexOf) response = JSON.decode(response);
    if (response && Object.getLength(response) == 1) response = response[Object.keys(response)[0]];
    return response;
  },
  
  getStoredBlobs: function() {
    var files = this.retrieveStoredBlobs();
    return files ? Array.from(JSON.decode(files)).map(this.processStoredBlob.bind(this)) : [];
  },
  
  addFile: function(blob) {
    var widget = new (this.getUploaderFileClass());
    widget.widget = this;
    widget.setState('complete');
    widget.build();
    widget.setBase(this.getUploader());
    widget.setFile(blob);
    this.addBlob(widget, blob);
  }
});

LSD.Widget.Filelist = new Class({
  Implements: LSD.Mixin.List,
  
  options: {
    tag: 'filelist',
    inline: 'ul',
    has: {
      many: {
        items: {
          selector: 'file',
          source: 'filelist-file'
        }
      }
    }
  }
});

LSD.Widget.Filelist.File = new Class({
  options: {
    tag: 'file',
    inline: 'li',
    layout: {
      '::canceller': 'Cancel',
      '::meter': true
    },
    events: {
      setBase: function() {
        this.build();
      },
      setFile: function() {
        this.write(this.name);
      },
      build: function() {
        this.inject(this.getWidget().list);
      },
      progress: function() {
        this.meter.set(this.progress.percentLoaded)
      },
      start: function() {
        this.setState('started');
      },
      complete: function() {
        this.unsetState('started');
        this.setState('complete');
      },
      stop: function() {
        this.unsetState('started');
      }
    },
    has: {
      one: {
        meter: {
          selector: 'progress'
        },
        canceller: {
          selector: 'button.cancel',
          events: {
            click: 'cancel'
          }
        }
      }
    }
  },
  
  getWidget: function() {
    return (this.widget || this.base.widget);
  },
  
  cancel: function() {
    this.stop();
    this.remove();
    this.dispose();
  }
});

LSD.Widget.Progress = new Class({
  options: {
    tag: 'progress',
    inline: null,
    pseudos: Array.fast('value')
  },
  
  getBar: Macro.getter('bar', function() {
    return new Element('span').inject(this.element);
  }),
  
  set: function(value) {
    this.getBar().setStyle('width', Math.round(value) + '%')
  }
});

LSD.Behavior.define(':uploading', LSD.Mixin.Uploader);
/*
---
 
script: Choice.js
 
description: Mixin that adds List. Allows one item to be chosen and one selected (think navigating to a menu item to select)
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Mixin.List
 
provides: 
  - LSD.Mixin.Choice
 
...
*/


LSD.Mixin.Choice = new Class({
  options: {
    has: {
      many: {
        items: {
          states: {
            add: Array.fast('chosen')
          }
        }
      }
    }
  },
  
  chooseItem: function(item, temp) {
    if (!(item = this.getItem(item)) && this.options.list.force) return false;
    var chosen = this.chosenItem;
    this.setSelectedItem(item, 'chosen');
    this.fireEvent('choose', [item, this.getItemIndex()]);
    if (item.choose() && chosen) chosen.forget();
    return item;
  },
  
  forgetChosenItem: function(item) {
    item = this.getItem(item) || this.chosenItem;
    if (item) item.forget();
    this.unsetSelectedItem(item, 'chosen');
  },
  
  selectChosenItem: function() {
    return this.selectItem(this.chosenItem)
  },

  getChosenItems: function() {
    return this.chosenItem || (this.chosenItems ? this.chosenItems.getLast() : null);
  },
  
  getChosenItems: function(type) {
    return this.chosenItems || (this.chosenItem && [this.chosenItem]);
  }
});


LSD.Behavior.define(':choice', LSD.Mixin.Choice);
/*
---

script: URI.js

name: URI

description: Provides methods useful in managing the window location and uris.

license: MIT-style license

authors:
  - Sebastian Markbåge
  - Aaron Newton

requires:
  - Core/Class
  - Core/Class.Extras
  - Core/Element
  - /String.QueryString

provides: [URI]

...
*/

var URI = new Class({

	Implements: Options,

	options: {
		/*base: false*/
	},

	regex: /^(?:(\w+):)?(?:\/\/(?:(?:([^:@\/]*):?([^:@\/]*))?@)?([^:\/?#]*)(?::(\d*))?)?(\.\.?$|(?:[^?#\/]*\/)*)([^?#]*)(?:\?([^#]*))?(?:#(.*))?/,
	parts: ['scheme', 'user', 'password', 'host', 'port', 'directory', 'file', 'query', 'fragment'],
	schemes: {http: 80, https: 443, ftp: 21, rtsp: 554, mms: 1755, file: 0},

	initialize: function(uri, options){
		this.setOptions(options);
		var base = this.options.base || URI.base;
		if (!uri) uri = base;

		if (uri && uri.parsed) this.parsed = Object.clone(uri.parsed);
		else this.set('value', uri.href || uri.toString(), base ? new URI(base) : false);
	},

	parse: function(value, base){
		var bits = value.match(this.regex);
		if (!bits) return false;
		bits.shift();
		return this.merge(bits.associate(this.parts), base);
	},

	merge: function(bits, base){
		if ((!bits || !bits.scheme) && (!base || !base.scheme)) return false;
		if (base){
			this.parts.every(function(part){
				if (bits[part]) return false;
				bits[part] = base[part] || '';
				return true;
			});
		}
		bits.port = bits.port || this.schemes[bits.scheme.toLowerCase()];
		bits.directory = bits.directory ? this.parseDirectory(bits.directory, base ? base.directory : '') : '/';
		return bits;
	},

	parseDirectory: function(directory, baseDirectory){
		directory = (directory.substr(0, 1) == '/' ? '' : (baseDirectory || '/')) + directory;
		if (!directory.test(URI.regs.directoryDot)) return directory;
		var result = [];
		directory.replace(URI.regs.endSlash, '').split('/').each(function(dir){
			if (dir == '..' && result.length > 0) result.pop();
			else if (dir != '.') result.push(dir);
		});
		return result.join('/') + '/';
	},

	combine: function(bits){
		return bits.value || bits.scheme + '://' +
			(bits.user ? bits.user + (bits.password ? ':' + bits.password : '') + '@' : '') +
			(bits.host || '') + (bits.port && bits.port != this.schemes[bits.scheme] ? ':' + bits.port : '') +
			(bits.directory || '/') + (bits.file || '') +
			(bits.query ? '?' + bits.query : '') +
			(bits.fragment ? '#' + bits.fragment : '');
	},

	set: function(part, value, base){
		if (part == 'value'){
			var scheme = value.match(URI.regs.scheme);
			if (scheme) scheme = scheme[1];
			if (scheme && this.schemes[scheme.toLowerCase()] == null) this.parsed = { scheme: scheme, value: value };
			else this.parsed = this.parse(value, (base || this).parsed) || (scheme ? { scheme: scheme, value: value } : { value: value });
		} else if (part == 'data'){
			this.setData(value);
		} else {
			this.parsed[part] = value;
		}
		return this;
	},

	get: function(part, base){
		switch(part){
			case 'value': return this.combine(this.parsed, base ? base.parsed : false);
			case 'data' : return this.getData();
		}
		return this.parsed[part] || '';
	},

	go: function(){
		document.location.href = this.toString();
	},

	toURI: function(){
		return this;
	},

	getData: function(key, part){
		var qs = this.get(part || 'query');
		if (!(qs || qs === 0)) return key ? null : {};
		var obj = qs.parseQueryString();
		return key ? obj[key] : obj;
	},

	setData: function(values, merge, part){
		if (typeof values == 'string'){
			data = this.getData();
			data[arguments[0]] = arguments[1];
			values = data;
		} else if (merge){
			values = Object.merge(this.getData(), values);
		}
		return this.set(part || 'query', Hash.toQueryString(values));
	},

	clearData: function(part){
		return this.set(part || 'query', '');
	}

});

URI.prototype.toString = URI.prototype.valueOf = function(){
	return this.get('value');
};

URI.regs = {
	endSlash: /\/$/,
	scheme: /^(\w+):/,
	directoryDot: /\.\/|\.$/
};

URI.base = new URI(Array.from(document.getElements('base[href]', true)).getLast(), {base: document.location});

String.implement({

	toURI: function(options){
		return new URI(this, options);
	}

});

/*
---
 
script: Resource.js
 
description: Make various requests to back end
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Mixin
  - Resource/*
  - More/URI
  
provides: 
  - LSD.Mixin.Resource
 
...
*/

LSD.Mixin.Resource = new Class({
  options: {
    resource: {
      prefix: null,
      name: null
    }
  },
  
  getResource: function(options) {
    if (!options) options = this.options.resource
    if (!this.resource) {
      var name = options.name;
      var prefix = options.prefix;
      if (!name || !prefix) {
        var uri = this.attributes.itemtype.split(/\s+/).getLast();
        if (uri) {
          if (uri.toURI) uri = uri.toURI();
          prefix = uri.get('directory');
          name = uri.get('file');
          while (!name || !(name = name.singularize())) {
            var dirs = prefix.split('/');
            name = dirs.pop();
            prefix = dirs.join('/')
          }
        }
      }
      var options = Object.clone(this.options.resource);
      if (prefix) options.prefix = prefix;
      this.resource = new Resource(name, options);
    }
    return this.resource;
  },
  
  getResourceID: function() {
    return this.attributes.itemid;
  },
  
  getModel: function() {
    return this.getResource().init(this.getResourceID() || this.element);
  }
});

LSD.Behavior.define(':resource', LSD.Mixin.Resource);
/*
---
 
script: Selectors.js
 
description: Define a widget associations
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module
  - Core/Slick.Finder

provides: 
  - LSD.Module.Selectors

...
*/

!function() {

LSD.Module.Selectors = new Class({
  getElements: function(selector, origin) {
    return Slick.search(origin || this.getSelectorOrigin(selector), selector)
  },
  
  getElement: function(selector, origin) {
    return Slick.find(origin || this.getSelectorOrigin(selector), selector)
  },
  
  /*
    We have to figure the document before we do a .search
    to let Slick switch into the right mode and be prepared
  */
    
  getSelectorOrigin: function(selector) {
    if (!selector.Slick) selector = Slick.parse(selector);
    var first = selector.expressions[0][0];
    switch (first.combinator) {
      case "$": case "$$":
        return this.element;
      case "&": case "&&": default:
        return this;
    }
  },
  
  getPseudoElementsByName: function(name) {
    var handler = PseudoElements[name];
    if (handler && (handler = handler.apply(this, arguments))) return handler;
    return this[name];
  },
  
  match: function(selector) {
    if (typeof selector == 'string') selector = Slick.parse(selector);
    if (selector.expressions) selector = selector.expressions[0][0];
    if (selector.combinator == '::') {
      if (selector.tag && (selector.tag != '*')) {
        var group = this.expectations['!::'];
        if (!group || !(group = group[selector.tag]) || !group.length) return false;
      }
    } else {
      if (selector.tag && (selector.tag != '*') && (this.tagName != selector.tag)) return false;
    }
    if (selector.id && (this.attributes.id != selector.id)) return false;
    if (selector.attributes) for (var i = 0, j; j = selector.attributes[i]; i++) 
      if (j.operator ? !j.test(this.attributes[j.key] && this.attributes[j.key].toString()) : !(j.key in this.attributes)) return false;
    if (selector.classes) for (var i = 0, j; j = selector.classes[i]; i++) if (!this.classes[j.value]) return false;
    if (selector.pseudos) {
      for (var i = 0, j; j = selector.pseudos[i]; i++) {
        var name = j.key;
        if (this.pseudos[name]) continue;
        var pseudo = pseudos[name];
        if (pseudo == null) pseudos[name] = pseudo = Slick.lookupPseudo(name) || false;
        if (pseudo === false || (pseudo && !pseudo.call(this, this, j.value))) return false;
      }
    }
    return true;
  }
});
var pseudos = {};


var PseudoElements = {
  
};

var Combinators = LSD.Module.Selectors.Combinators = {
  '$': function(node, tag, id, classes, attributes, pseudos, classList) { //this element
    if ((tag == '*') && !id && !classes && !attributes && !pseudos) return this.push(node);
    else return this['combinator: '](node, tag, id, classes, attributes, pseudos, classList)
  },

  '$$': function(node, tag, id, classes, attributes, pseudos, classList) { //this element document
    if ((tag == '*') && !id && !classes && !attributes && !pseudos) return this.push(this.document.body);
    else return this['combinator: '](this.document.body, tag, id, classes, attributes, pseudos, classList);
  },
  
  '::': function(node, tag, id, classes, attributes, pseudos) {
    var value = node[tag];
    if (value) {
      for (var i = 0, element, result = [], ary = (value.length == null) ? [value] : value; element = ary[i]; i++) 
        this.push(element, null, id, classes, attributes, pseudos);
    }
  }
};

Combinators['&'] = Combinators['$'];
Combinators['&&'] = Combinators['$$'];

for (name in Combinators) Slick.defineCombinator(name, Combinators[name]);

LSD.Module.Selectors.Features = {
  brokenStarGEBTN: false,
  starSelectsClosedQSA: false,
  idGetsName: false,
  brokenMixedCaseQSA: false,
  brokenGEBCN: false,
  brokenCheckedQSA: false,
  brokenEmptyAttributeQSA: false,
  isHTMLDocument: false,
  nativeMatchesSelector: false,
  hasAttribute: function(node, attribute) {
    return (attribute in node.attributes) || ((attribute in node.$states) && (attribute in node.pseudos))
  },
  getAttribute: function(node, attribute) {
    return node.attributes[attribute] || ((attribute in node.$states) || node.pseudos[attribute]);
  },
  getPseudoElementsByName: function(node, name, value) {
    var collection = node.getPseudoElementsByName ? node.getPseudoElementsByName(name) : node[name];
    return collection ? (collection.push ? collection : [collection]) : [];
  }
};

}();
/*
---
 
script: Attributes.js
 
description: A mixin that adds support for setting attributes, adding and removing classes and pseudos
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module
  - Core/Slick.Parser
 
provides: 
  - LSD.Module.Attributes
 
...
*/

LSD.Module.Attributes = new Class({
  initializers: {
    attributes: function() {
      this.classes = new FastArray;
      this.pseudos = new FastArray;
      this.dataset = {};
      this.attributes = {};
    }
  },
  
  getAttribute: function(attribute) {
    switch (attribute) {
      case "class":           return this.classes.join(' ');
      case "slick-uniqueid":  return this.lsd;
      default:                return this.attributes[attribute];
    }
  },
  
  removeAttribute: function(name) {
    if (name.substring(0, 5) == 'data') {
      delete this.dataset[name.substring(5, name.length - 5)];
    } else if (this.attributes[name] != null) {
      this.fireEvent('selectorChange', ['attributes', name, false]);
      delete this.attributes[name];
      if (this.element) this.element.removeAttribute(name);
      if (LSD.States.Attributes[name])
        if (this[name]) this.setStateTo(name, false);
    }
    return this;
  },

  setAttribute: function(name, value) {
    if (LSD.Attributes.Numeric[name]) value = value.toInt();
    else {
      var logic = LSD.Attributes.Setter[name];
      if (logic) logic.call(this, value)
    }
    if (name.substring(0, 5) == 'data-') {
      this.dataset[name.substring(5, name.length - 5)] = value;
    } else {
      if (this.options && this.options.interpolate)
        value = LSD.Interpolation.attempt(value, this.options.interpolate) || value;
      if (this.attributes[name] != value) {
        if (LSD.States.Attributes[name]) {
          var mode = (value == true || value == name);
          if (this[name] != mode) this.setStateTo(name, mode);
        }
        this.fireEvent('selectorChange', ['attributes', name, false]);
        this.attributes[name] = value;    
        this.fireEvent('selectorChange', ['attributes', name, true]);
        if (this.element && this.element[name] != value) this.element.setAttribute(name, value);
      }
    }
    return this;
  },

  addPseudo: function(name){
    if (!this.pseudos[name]) {
      if (this.$states[name]) this.setStateTo(name, true);
      this.pseudos[name] = true;
      this.fireEvent('selectorChange', ['pseudos', name, true]);
    }
    return this;
  },

  removePseudo: function(name) {
    if (this.pseudos[name]) {
      if (this.$states[name]) this.setStateTo(name, false);
      this.fireEvent('selectorChange', ['pseudos', name, false]);
      delete this.pseudos[name];
    }  
    return this;
  },
  
  addClass: function(name){
    if (LSD.States.Classes[name] && !this[name]) this.setStateTo(name, true);
    if (!this.classes[name]) {
      this.classes[name] = true;
      this.fireEvent('selectorChange', ['classes', name, true]);
      if (this.element) this.element.addClass(name);
    }
    return this;
  },

  removeClass: function(name){
    if (LSD.States.Classes[name] && this[name]) return this.setStateTo(name, false);
    if (this.classes[name]) {
      this.fireEvent('selectorChange', ['classes', name, false]);
      delete this.classes[name];
      if (this.element) this.element.removeClass(name);
    }  
    return this;
  },
  
  hasClass: function(name) {
    return this.classes[name]
  },
  
  setState: function(name) {
    var attribute = LSD.States.Attributes[name];
    if (attribute) this.setAttribute(attribute, attribute)
    else this.addClass(LSD.States.Classes[name] || 'is-' + name);
    this.addPseudo(name);
    return this;
  },
  
  unsetState: function(name) {
    var attribute = LSD.States.Attributes[name];
    if (attribute) this.removeAttribute(attribute);
    else this.removeClass(LSD.States.Classes[name] || 'is-' + name);
    this.removePseudo(name);
    return this;
  },
  
  getSelector: function(){
    var parent = this.parentNode;
    var selector = (parent && parent.getSelector) ? parent.getSelector() + ' ' : '';
    selector += this.tagName;
    if (this.attributes.id) selector += '#' + this.attributes.id;
    for (var klass in this.classes)  if (this.classes.hasOwnProperty(klass))  selector += '.' + klass;
    for (var pseudo in this.pseudos) if (this.pseudos.hasOwnProperty(pseudo)) selector += ':' + pseudo;
    for (var name in this.attributes) if (name != 'id') selector += '[' + name + '=' + this.attributes[name] + ']';
    return selector;
  },
  
  onStateChange: function(state, value, args) {
    var args = Array.prototype.slice.call(arguments, 0);
    args.slice(1, 2); //state + args
    this[value ? 'setState' : 'unsetState'][args && ("length" in args) ? 'apply' : 'call'](this, args);
    this.fireEvent('stateChange', [state, args]);
    return true;
  }
});


LSD.Attributes.Setter = {
  'id': function(id) {
    this.id = id;
  },
  'class': function(value) {
    value.split(' ').each(this.addClass.bind(this));
  },
  'style': function(value) {
    value.split(/\s*;\s*/).each(function(definition) {
      var bits = definition.split(/\s*:\s*/)
      if (!bits[1]) return;
      bits[0] = bits[0].camelCase();
      var integer = bits[1].toInt();
      if (bits[1].indexOf('px') > -1 || (integer == bits[1])) bits[1] = integer
      //this.setStyle.apply(this, bits);
    }, this);
  }
};

Object.append(LSD.Options, {
  attributes: {
    add: 'setAttribute',
    remove: 'removeAttribute',
    iterate: true
  },
  pseudos: {
    add: 'addPseudo',
    remove: 'removePseudo',
    iterate: true
  },
  classes: {
    add: 'addClass',
    remove: 'removeClass',
    iterate: true
  }
});

/*
---

script: Accessories.js

description: Things that change the widget in one module

license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module.Options
  - LSD.Module.States
  - LSD.Module.Attributes
  - LSD.Module.Events
  - LSD.Module.Dimensions
  - LSD.Module.Styles
  - LSD.Module.Shortcuts
  - LSD.Module.Element
  - LSD.Module.Selectors
  - LSD.Module.Tag
  - LSD.Module.Chain
  - LSD.Module.Actions
  
provides: 
  - LSD.Module.Accessories

...
*/

LSD.Module.Accessories = new Class({
  Implements: [
    LSD.Module.Options,
    LSD.Module.States,
    LSD.Module.Attributes,
    LSD.Module.Events,
    LSD.Module.Dimensions,
    LSD.Module.Styles,
    LSD.Module.Shortcuts,
    LSD.Module.Tag,
    LSD.Module.Element,
    LSD.Module.Selectors,
    LSD.Module.Chain,
    LSD.Module.Actions
  ]
});
/*
---
 
script: Expectations.js
 
description: A trait that allows to wait for related widgets until they are ready
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module
  - LSD.Module.Events
  - LSD.Module.Attributes

provides: 
  - LSD.Module.Expectations
 
...
*/

!function() {
  
var Expectations = LSD.Module.Expectations = new Class({
  
  initializers: {
    expectations: function() {
      if (!this.expectations) this.expectations = {tag: {}}
    }
  },
  
  getElementsByTagName: function(tag) {
    return (this.expectations.tag && this.expectations.tag[tag.toLowerCase()]) || [];
  },
  
  /*
    Expect processes a single step in a complex selector.
    
    Each of those bits (e.g. strong.important) consists 
    pieces that can not be cnahged in runtime (tagname)
    and other dynamic parts (classes, pseudos, attributes).
    
    The idea is to split the selector bit to static and dynamic
    parts. The widget that is *expect*ing the selector, groups
    his expectations by tag name. Every node inserted into
    that element or its children will pick up expectations
    related to it, thus matching static part of a selector
    - tag name and combinator. 
    
    It's only a matter of matching a dynamic part then. 
    - classes, pseudos and attributes.
  */
  expect: function(selector, callback, self) {
    if (selector.indexOf) selector = Slick.parse(selector);
    if (selector.expressions) selector = selector.expressions[0][0];
    if (!this.expectations) this.expectations = {};
    var id = selector.id;
    var index = self ? 'self' : (selector.combinator == ' ' && id) ? 'id' : selector.combinator || 'self'; 
    var expectations = this.expectations[index];
    if (!expectations) expectations = this.expectations[index] = {};
    if (selector.combinator && !self) {
      /*
        Given selector has combinator.
        Finds related elements and passes expectations to them.
      */
      if (!selector.structure) {
        var separated = separate(selector);
        selector.structure = { Slick: true, expressions: [[separated.structure]] }
        if (separated.state) selector.state = separated.state;
      }
      var key = (index == 'id') ? id : selector.tag;
      var group = expectations[key];
      if (!group) group = expectations[key] = [];
      group.push([selector, callback]);
      var state = selector.state;
      if (this.document && this.document.documentElement) this.getElements(selector.structure).each(function(widget) {
        if (state) widget.expect(state, callback);
        else callback(widget, true);
      });
    } else {
      /*
        Selector without combinator,
        depends on state of current widget.
      */
      for (var types = ['pseudos', 'classes', 'attributes'], type, i = 0; type = types[i++];) {
        var values = selector[type];
        if (values) values: for (var j = 0, value; (value = values[j++]) && (value = value.key || value.value);) {
          var kind = expectations[type];
          if (!kind) kind = expectations[type] = {};
          var group = kind[value];
          if (!group) group = kind[value] = [];
          for (var k = group.length, expectation; expectation = group[--k];) if (expectation[0] == selector) continue values;
          group.push([selector, callback]);
        }
      }
      if (this.tagName && this.match(selector)) callback(this, true);
    }
  },
  
  unexpect: function(selector, callback, self, iterator) {
    if (selector.indexOf) selector = Slick.parse(selector);
    if (selector.expressions) selector = selector.expressions[0][0];
    if (iterator === true) iterator = function(widget) {
      if (widget.match(selector)) callback(widget, false);
    };
    if (selector.combinator && !self) {
      var id = selector.id;
      var index = (selector.combinator == ' ' && id) ? 'id' : selector.combinator;
      remove(this.expectations[index][index == 'id' ? id : selector.tag], callback);
      if (this.document) this.getElements(selector.structure).each(function(widget) {
        if (selector.state) widget.unexpect(selector.state, callback);
        if (iterator) iterator(widget)
      });
    } else {
      if (iterator) iterator(this);
      for (var types = ['pseudos', 'classes', 'attributes'], type, i = 0; type = types[i++];) {
        var bits = selector[type], group = this.expectations.self[type];
        if (bits) for (var j = 0, bit; bit = bits[j++];) remove(group[bit.key || bit.value], callback);
      }
    }
  },
  
  watch: function(selector, callback, depth) {
    if (selector.indexOf) selector = Slick.parse(selector);
    if (!depth) depth = 0;
    selector.expressions.each(function(expressions) {
      var watcher = function(widget, state) {
        if (expressions[depth + 1]) widget[state ? 'watch' : 'unwatch'](selector, callback, depth + 1)
        else callback(widget, state)
      };
      watcher.callback = callback;
      this.expect(expressions[depth], watcher);
    }, this);
  },
  
  unwatch: function(selector, callback, depth) {
    if (selector.indexOf) selector = Slick.parse(selector);
    if (!depth) depth = 0;
    selector.expressions.each(function(expressions) {
      this.unexpect(expressions[depth], callback, false, function(widget) {
        if (expressions[depth + 1]) widget.unwatch(selector, callback, depth + 1)
        else callback(widget, false)
      });
    }, this);
  },
  
  use: function() {
    var selectors = Array.flatten(arguments);
    var widgets = []
    var callback = selectors.pop();
    var unresolved = selectors.length;
    selectors.each(function(selector, i) {
      var watcher = function(widget, state) {
        if (state) {
          if (!widgets[i]) {
            widgets[i] = widget;
            unresolved--;
            if (!unresolved) callback.apply(this, widgets.concat(state))
          }
        } else {
          if (widgets[i]) {
            if (!unresolved) callback.apply(this, widgets.concat(state))
            delete widgets[i];
            unresolved++;
          }
        }
      }
      this.watch(selector, watcher)
    }, this)
  }
});

var check = function(type, value, state, target) {
  var expectations = this.expectations
  if (!target) {
    expectations = expectations.self;
    target = this;
  }
  expectations = expectations && expectations[type] && expectations[type][value];
  if (expectations) for (var i = 0, expectation; expectation = expectations[i++];) {
    var selector = expectation[0];
    if (selector.structure && selector.state) {
      if (target.match(selector.structure)) {
        if (!state) {
          if (target.match(selector.state)) {
            target.unexpect(selector.state, expectation[1]);
            expectation[1](target, !!state)
          }
        } else target.expect(selector.state, expectation[1])
      }
    } else if (target.match(selector)) expectation[1](target, !!state)
  }
}

var notify = function(type, tag, state, widget, single) {
  check.call(this, type, tag, state, widget);
  if (!single) check.call(this, type, '*', state, widget);
}

var update = function(widget, tag, state, single) {
  notify.call(this, ' ', tag, state, widget, single);
  var options = widget.options, id = widget.id;
  if (id) check.call(this, 'id', id, state, widget);
  if (this.previousSibling) {
    notify.call(this.previousSibling, '!+', widget.tagName, state, widget, single);
    notify.call(this.previousSibling, '++', widget.tagName, state, widget, single);
    for (var sibling = this; sibling = sibling.previousSibling;) {
      notify.call(sibling, '!~', tag, state, widget, single);
      notify.call(sibling, '~~', tag, state, widget, single);
    }
  }
  if (this.nextSibling) {
    notify.call(this.nextSibling, '+',  tag, state, widget, single);
    notify.call(this.nextSibling, '++', tag, state, widget, single);
    for (var sibling = this; sibling = sibling.nextSibling;) {
      notify.call(sibling, '~',  tag, state, widget, single);
      notify.call(sibling, '~~', tag, state, widget, single);
    }
  }
  if (widget.parentNode == this) notify.call(this, '>', widget.tagName, state, widget, single);
}

var remove = function(array, callback) {
  if (array) for (var i = array.length; i--;) {
    var fn = array[i][1]; 
    if (fn == callback || fn.callback == callback) array.splice(i, 1);
  }
}

var separate = function(selector) {
  if (selector.state || selector.structure) return selector
  var separated = {};
  for (var criteria in selector) {
    switch (criteria) {
      case 'tag': case 'combinator': case 'id':
        var type = 'structure';
        break;
      default:
        var type = 'state';
    }
    var group = separated[type];
    if (!group) group = separated[type] = {};
    group[criteria] = selector[criteria]
  };
  return separated;
};

Expectations.events = {
  nodeInserted: function(widget) {
    var expectations = this.expectations, type = expectations.tag, tag = widget.tagName;
    if (!type) type = expectations.tag = {};
    var group = type[tag];
    if (!group) group = type[tag] = [];
    group.push(widget);
    group = type['*'];
    if (!group) group = type['*'] = [];
    group.push(widget);
    update.call(this, widget, tag, true);
  },
  nodeRemoved: function(widget) {
    var expectations = this.expectations, type = expectations.tag, tag = widget.tagName;
    if (tag) type[tag].erase(widget);
    type['*'].erase(widget);
    update.call(this, widget, tag, false);
  },
  nodeTagChanged: function(widget, tag, old) {
    var expectations = this.expectations, type = expectations.tag;
    type[old].erase(widget);
    update.call(this, widget, old, false);
    if (!tag) return;
    if (!group) group = type[tag] = [];
    group.push(widget);
    update.call(this, widget, tag, true);
  },
  relate: function(widget, tag) {
    var expectations = widget.expectations, type = expectations['!::'];
    if (!type) type = expectations['!::'] = {};
    var group = type[tag];
    if (!group) group = type[tag] = [];
    group.push(this);
    notify.call(this, '::', tag, true, widget);
  },
  unrelate: function(widget, tag) {
    notify.call(this, '::', tag, false, widget);
    widget.expectations['!::'][tag].erase(this);
  },
  setParent: function(parent) {
    notify.call(this, '!>', parent.tagName, true, parent);
    for (; parent; parent = parent.parentNode) notify.call(this, '!', parent.tagName, true, parent);
  },
  unsetParent: function(parent) {
    notify.call(this, '!>', parent.tagName, false, parent);
    for (; parent; parent = parent.parentNode) notify.call(this, '!', parent.tagName, false, parent);
  },
  selectorChange: check,
  tagChanged: function(tag, old) {
    check.call(this, 'tag', old, false);
    if (tag) check.call(this, 'tag', tag, true);
    if (this.parentNode && !this.removed) this.parentNode.dispatchEvent('nodeTagChanged', [this, tag, old]);
  }
};

LSD.addEvents(Expectations.prototype, Expectations.events);

LSD.Module.Events.Targets.expected = function() {
  var self = this, Targets = LSD.Module.Events.Targets;
  return {
    addEvent: function(key, value) {
      if (!self.watchers) self.watchers = {};
      self.watchers[key] = function(widget, state) {
        value = Object.append({}, value)
        for (var name in value) {
          if (typeof value[name] == 'object') continue;
          widget.addEvent(name, value[name]);
          delete value[name];
        }
        for (var name in value) {
          target = (Targets[name] || Targets.expected).call(widget);
          target[state ? 'addEvents' : 'removeEvents'](value);
          break;
        }
      };
      self.watch(key, self.watchers[key]);
    },
    removeEvent: function(key, event) {
      self.unwatch(key, self.watchers[key]);
    }
  }
};

LSD.Options.expects = {
  add: function(selector, callback) {
    this.expect(selector, callback, true);
  },
  remove: function(callback) {
    this.unexpect(selector, callback, true);
  },
  iterate: true,
  process: 'bindEvents'
};

LSD.Options.watches = Object.append({}, LSD.Options.expects, {
  add: function(selector, callback) {
    this.watch(selector, callback);
  },
  remove: function(callback) {
    this.watch(selector, callback);
  }
});

}();
/*
---

script: Ambient.js

description: When it needs to know what's going on around 

license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Module.DOM
  - LSD.Module.Layout
  - LSD.Module.Expectations
  - LSD.Module.Allocations
  - LSD.Module.Relations
  - LSD.Module.Proxies
  - LSD.Module.Container

provides: 
  - LSD.Module.Ambient

...
*/

LSD.Module.Ambient = new Class({
  Implements: [
    LSD.Module.DOM, 
    LSD.Module.Layout,
    LSD.Module.Expectations,
    LSD.Module.Allocations,
    LSD.Module.Relations,
    LSD.Module.Proxies,
    LSD.Module.Container
  ]
});
/*
---
 
script: Widget.js
 
description: Base widget with all modules included
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Type
  - LSD.Module.Accessories
  - LSD.Module.Ambient
  - LSD.Module.Graphics
  - LSD.Mixin.Value

provides: 
  - LSD.Widget
 
...
*/

LSD.Widget = new Class({
  
  Implements: [
    LSD.Module.Accessories,
    LSD.Module.Ambient,
    LSD.Module.Graphics
  ],
  
  options: {
    /*
      The key in element storage that widget will use to store itself.
      When set to false, widget is not written into element storage.
    */
    key: 'widget',
    /*
      When set to true, layers option will enforce the default layer set.
    */
    layers: true
  },
  
  initialize: LSD.Module.Options.initialize
});

LSD.addEvents(LSD.Widget.prototype, {
  initialize: function() {
    this.addPseudo(this.pseudos.submittable ? 'read-write' : 'read-only');
  }
});

LSD.Widget.prototype.addStates('disabled', 'hidden', 'built', 'attached');

LSD.Behavior.attach(LSD.Widget);

new LSD.Type('Widget');
/*
---
 
script: Body.js
 
description: Lightweight document body wrapper
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires: 
  - LSD/LSD.Document.Resizable
  - LSD/LSD.Widget
  - LSD/LSD.Module.Expectations
  
provides:
  - LSD.Widget.Body

...
*/

LSD.Widget.Body = new Class({
  Includes: [LSD.Document.Resizable, LSD.Module.Expectations]
});
/*
---

script: Document.js

description: Provides a virtual root to all the widgets. DOM-Compatible for Slick traversals.

license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

requires:
  - LSD.Widget
  - Core/DomReady
  - Core/Options
  - Core/Events
  - More/String.QueryString
  - LSD
  - LSD.Module.Attributes
  - LSD.Module.Selectors

provides:
  - LSD.Document

...
*/


/*
  Document is a big disguise proxy class that contains the tree
  of widgets and a link to document element.
  
  It is DOM-compatible (to some degree), so tools that crawl DOM
  tree (we use Slick) can work with the widget tree like it usually
  does with the real DOM so we get selector engine for free.
  
  The document itself is not in the tree, it's a container.
  
  The class contains a few hacks that allows Slick to initialize.
*/


LSD.Document = new Class({
  
  Implements: [Events, Options, LSD.Module.Attributes],
  
  initialize: function(document, options) {
    if (document && !document.documentElement) options = [document, document = options][0];
    if (!document) document = window.document;
    if (!LSD.document) LSD.document = this;
    if (options) this.setOptions(options);
    this.document = this;
    this.element = document;
    
    /*
      Trick Slick into thinking that LSD elements tree is an XML node 
      tree (so it won't try speeding up the queries with optimizations)
    */
    this.documentElement = this;
    this.xml = true;
    this.slickFeatures = LSD.Module.Selectors.Features;
    this.nodeType = 9;
    this.attributes = {};
    
    this.params = (location.search.length > 1) ? location.search.substr(1, location.search.length - 1).parseQueryString() : {}
    document.addEvent('domready', function() {
      this.building = true;
      if ("benchmark" in this.params) console.profile();
      this.build();
      if ("benchmark" in this.params) console.profileEnd();
      this.building = false;
    }.bind(this));
    this.element.addEvent('click', this.onClick.bind(this))
  },
  
  /* 
    Single relay click listener is put upon document.
    It spies for all clicks on elements and finds out if 
    any links were clicked. If the link is not widget,
    the listener creates a lightweight link class instance and
    calls click on it to trigger commands and interactions.
    
    This way there's no need to preinitialize all link handlers, 
    and only instantiate class when the link was actually clicked.
  */
  onClick: function(event) {
    if (event.target.ownerDocument == document)
    for (var target = event.target, stopped, link, widget; target && target.tagName; target = target.parentNode) {
      widget = Element.retrieve(target, 'widget');
      if (widget && widget.pseudos.clickable) {
        if (!stopped) stopped = !!event.preventDefault();
        widget.click(event);
      } else if (!stopped && LSD.toLowerCase(target.tagName) == 'a' && !link) {
        link = target;
      }
    };
    if (!stopped && link) {
      var node = Element.retrieve(link, 'node');
      if (!node) Element.store(link, 'node', node = new LSD.Widget.Anchor(link));
      node.document = this;
      node.click(event);
      event.preventDefault();
    }
  },
  
  setHead: function(head) {
    for (var i = 0, el, els = head.getElementsByTagName('meta'); el = els[i++];) {
      var type = el.getAttribute('rel');
      if (type) {
        type += 's';
        if (!this[type]) this[type] = {};
        var content = el.getAttribute('content')
        if (content) this[type][el.getAttribute('name')] = (content.charAt(0) =="{") ? JSON.decode(content) : content;
      }
    }
    
    // Attach stylesheets, if there are stylesheets loaded
    if (LSD.Sheet && LSD.Sheet.stylesheets) for (var i = 0, sheet; sheet = LSD.Sheet.stylesheets[i++];) this.addStylesheet(sheet);
  },
  
  build: function(document) {
    if (!document) document = this.element || window.document;
    this.setHead(document.head);
    var element = this.element = document.body;
    this.setBody(document.body);
  },
  
  setBody: function(element) {
    if (!element) element = this.getBodyElement()
    this.fireEvent('beforeBody', element);
    new LSD.Widget(element, {
      document: this, 
      events: {
        self: {
          boot: function() {
            this.document.body = this;
          }
        }
      },
      tag: 'body'
    });
    this.fireEvent('body', [this.body, element]);
    return element;
  },

  getBodyElement: function() {
    return this.document.body;
  },
  
  redirect: function(url) {
    window.location.href = url;
  },
  
  getElements: function() {
    return this.body.getElements.apply(this.body, arguments);
  },
  
  getElement: function() {
    return this.body.getElement.apply(this.body, arguments);
  },
  
  addStylesheet: function(sheet) {
    if (!this.stylesheets) this.stylesheets = [];
    this.stylesheets.include(sheet);
    sheet.attach(this);
  },
  
  removeStylesheet: function(sheet) {
    if (!this.stylesheets) return;
    this.stylesheets.erase(sheet);
    sheet.detach(this);
  },
  
  $family: Function.from('document')
});
/*
---
 
script: Command.js
 
description: A command getter that watches attributes to redefine command
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires: 
  - LSD.Module.Expectations
  - LSD.Command
  
provides: 
  - LSD.Mixin.Command
 
...
*/

/*
  Usually a widget that does something interactive defines command
  automatically. 
  
  The default type is 'command', but there are possible values of 
  'radio' and 'checkbox'.
  
  Type type can be changed via *options.command.type* 
  (equals to 'command-type' attribute).
  
  You can specify a command id in *command* attribute
  to link a widget to already initialized command.
*/

LSD.Mixin.Command = new Class({
  options: {
    chain: {
      commandaction: function() {
        var action = this.getCommandAction.apply(this, arguments);
        if (action) return {action: action, priority: 10}
      }
    },
    events: {
      _command: {
        'setDocument': 'getCommand'
      }
    }
  },
  
  getCommand: Macro.getter('command', function() {
    var options = Object.append(this.getCommandOptions(), this.options.command || {});
    return new LSD.Command(this.document, options).attach(this);
  }),
  
  click: function() {
    if (this.disabled) return false;
    this.fireEvent('click');
    this.getCommand().click();
    this.callChain();
  },
  
  setCommandType: function(type) {
    this.getCommand().setType(type);
    this.commandType = type;
  },
  
  unsetCommandType: function(type) {
    this.getCommand().unsetType(type);
    delete this.commandType
  },
  
  getCommandType: function() {
    return this.commandType || (this.pseudos.checkbox && 'checkbox') || (this.pseudos.radio && 'radio') || 'command';
  },
  
  getCommandAction: function() {
    return this.attributes.commandaction || this.captureEvent('getCommandAction', arguments);
  },
  
  getCommandOptions: function() {
    return {id: this.lsd, name: this.attributes.name, radiogroup: this.getCommandRadioGroup(), type: this.getCommandType()};
  },
  
  getCommandRadioGroup: function() {
    return this.attributes.radiogroup || this.attributes.name || this.options.radiogroup || this.captureEvent('getCommandRadioGroup');
  }
  
});

LSD.Options.commandType = {
  add: 'setCommandType',
  remove: 'unsetCommandType'
};

LSD.Behavior.define(':command, :radio, :checkbox, [accesskey]', LSD.Mixin.Command);
/*
---
 
script: Menu.js
 
description: Menu widget base class
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD/LSD.Widget.Paint

provides: 
  - LSD.Widget.Menu
 
...
*/

LSD.Widget.Menu = new Class({
  Extends: LSD.Widget.Paint,
  
  options: {
    tag: 'menu',
    element: {
      tag: 'menu'
    }
  }
});

LSD.Widget.Menu.Command = new Class({
  Extends: LSD.Widget.Paint,
  
  options: {
    tag: 'command',
    element: {
      tag: 'command'
    }
  }
});

(function(Command) {
  Command.Command = Command.Checkbox = Command.Radio = Command;
})(LSD.Widget.Menu.Command);
/*
---
 
script: Context.js
 
description: Menu widget to be used as a drop down
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Widget.Menu
  - LSD/LSD.Trait.Item
  - LSD/LSD.Trait.Animation

provides:
  - LSD.Widget.Menu.Context
  - LSD.Widget.Menu.Context.Button
  - LSD.Widget.Menu.Context.Command
  - LSD.Widget.Menu.Context.Command.Command
  - LSD.Widget.Menu.Context.Command.Checkbox
  - LSD.Widget.Menu.Context.Command.Radio
 
...
*/
LSD.Widget.Menu.Context = new Class({
  Includes: [
    LSD.Widget.Menu,
    LSD.Trait.Animation
  ],

  options: { 
    attributes: {
      type: 'context'
    },
    
    animation: {
      duration: 200
    }
  }
});

LSD.Widget.Menu.Context.Command = new Class({
  Includes: [
    LSD.Widget.Menu.Command,
    LSD.Trait.Item.Stateful
  ]
});

(function(Context) {
  Context.Button = Context.Option = Context.Radio = Context.Checkbox = Context.Command.Command = Context.Command;
})(LSD.Widget.Menu.Context);

    


/*
---
 
script: Menu.js
 
description: Dropdowns should be easy to use.
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Trait
  - Widgets/LSD.Widget.Menu.Context

provides:
  - LSD.Trait.Menu
 
...
*/

LSD.Relation.Menu = {
  as: 'initiator',
  tag: 'menu',
  attributes: {
    type: 'context'
  },
  proxy: function(widget) {
    return widget.pseudos.item;
  },
  states: {
    use: Array.fast('collapsed'),
    set: {
      collapsed: 'hidden'
    },
    get: {
      hidden: 'collapsed'
    }
  }
};

LSD.Relation.Dialog = {
  as: 'initiator',
  holder: 'document',
  tag: 'body',
  attributes: {
    type: 'dialog'
  }
};

/*
---
 
script: QFocuser.js
 
description: class for keyboard navigable AJAX widgets for better usability and accessibility
 
license: MIT-style license.
 
provides: [QFocuser]
 
...
*/

var QFocuser = (function() {

        // current safari doesnt support tabindex for elements, but chrome does. 
        // When Safari nightly version become current, this switch will be removed.
        var supportTabIndexOnRegularElements = (function() {
                var webKitFields = RegExp("( AppleWebKit/)([^ ]+)").exec(navigator.userAgent);
                if (!webKitFields || webKitFields.length < 3) return true; // every other browser support it
                var versionString = webKitFields[2],
                    isNightlyBuild = versionString.indexOf("+") != -1;
                if (isNightlyBuild || (/chrome/i).test(navigator.userAgent)) return true;
        })();

        return (supportTabIndexOnRegularElements ? function(widget, options) {

                var isIE = document.attachEvent && !document.addEventListener,
                        focused,
                        previousFocused,
                        lastState,
                        widgetState,
                        widgetFocusBlurTimer;

                options = (function() {
                        var defaultOptions = {
                                onFocus: function(el, e) { },
                                onBlur: function(el, e) { },
                                onWidgetFocus: function() { },
                                onWidgetBlur: function() { },
                                tabIndex: 0, // add tabindex to your widget to be attainable by tab key
                                doNotShowBrowserFocusDottedBorder: true
                        };
                        for (var option in options) defaultOptions[option] = options[option];
                        return defaultOptions;
                })();

                init();

                // something to make IE happy
                if (isIE) {
                        window.attachEvent('onunload', function() {
                                window.detachEvent('onunload', arguments.callee);
                                widget.clearAttributes();
                        });
                }

                function init() {
                        setTabIndex(widget, options.tabIndex);
                        // IE remembers focus after page reload but don't fire focus
                        if (isIE && widget == widget.ownerDocument.activeElement) widget.blur();
                        toggleEvents(true);
                };

                function hasTabIndex(el) {
                        var attr = el.getAttributeNode('tabindex');
                        return attr && attr.specified;
                };

                function setTabIndex(el, number) {
                        var test = document.createElement('div');
                        test.setAttribute('tabindex', 123);
                        var prop = hasTabIndex(test) ? 'tabindex' : 'tabIndex';
                        (setTabIndex = function(el, number) {
                                el.setAttribute(prop, '' + number);
                                if (options.doNotShowBrowserFocusDottedBorder) hideFocusBorder(el);
                        })(el, number);
                };

                function getTabIndex(el) {
                        return hasTabIndex(el) && el.tabIndex;
                };

                function hideFocusBorder(el) {
                        if (isIE) el.hideFocus = true;
                        else el.style.outline = 0;
                };

                function toggleEvents(register) {
                        var method = register ? isIE ? 'attachEvent' : 'addEventListener' : isIE ? 'detachEvent' : 'removeEventListener';
                        if (isIE) {
                                widget[method]('onfocusin', onFocusBlur);
                                widget[method]('onfocusout', onFocusBlur);
                        }
                        else {
                                widget[method]('focus', onFocusBlur, true);
                                widget[method]('blur', onFocusBlur, true);
                        }
                };

                function onFocusBlur(e) {
                        e = e || widget.ownerDocument.parentWindow.event;
                        var target = e.target || e.srcElement;
                        lastState = { focusin: 'Focus', focus: 'Focus', focusout: 'Blur', blur: 'Blur'}[e.type];
                        // filter bubling focus and blur events, only these which come from elements setted by focus method are accepted                
                        if (target == focused || target == previousFocused) {
                                options['on' + lastState](target, e);
                        }
                        clearTimeout(widgetFocusBlurTimer);
                        widgetFocusBlurTimer = setTimeout(onWidgetFocusBlur, 10);
                };

                function onWidgetFocusBlur() {
                        if (widgetState == lastState) return;
                        widgetState = lastState;
                        options['onWidget' + widgetState]();
                };

                // call this method only for mousedown, in case of mouse is involved (keys are ok)
                function focus(el) {
                        if (focused) {
                                setTabIndex(focused, -1); // to disable tab walking in widget
                                previousFocused = focused;
                        }
                        else setTabIndex(widget, -1);
                        focused = el;
                        setTabIndex(focused, 0);
                        focused.focus();
                };

                // call this method after updating widget content, to be sure that tab will be attainable by tag key
                function refresh() {
                        var setIndex = getTabIndex(widget) == -1,
                                deleteFocused = true,
                                els = widget.getElementsByTagName('*');
                        for (var i = els.length; i--; ) {
                                var idx = getTabIndex(els[i]);
                                if (idx !== false && idx >= 0) setIndex = true;
                                if (els[i] === focused) deleteFocused = false;
                        }
                        if (setIndex) setTabIndex(widget, 0);
                        if (deleteFocused) focused = null;
                };

                function getFocused() {
                        return focused;
                };

                // return element on which you should register key listeners
                function getKeyListener() {
                        return widget;
                };

                function destroy() {
                        toggleEvents();
                };

                return {
                        focus: focus,
                        getFocused: getFocused,
                        getKeyListener: getKeyListener,
                        refresh: refresh,
                        destroy: destroy
                }
        } :

        // version for Safari, it mimics focus blur behaviour
        function(widget, options) {

                var focuser,
                        lastState,
                        widgetState = 'Blur',
                        widgetFocusBlurTimer,
                        focused;

                options = (function() {
                        var defaultOptions = {
                                onFocus: function(el, e) { },
                                onBlur: function(el, e) { },
                                onWidgetFocus: function() { },
                                onWidgetBlur: function() { },
                                tabIndex: 0, // add tabindex to your widget to be attainable by tab key
                                doNotShowBrowserFocusDottedBorder: true
                        };
                        for (var option in options) defaultOptions[option] = options[option];
                        return defaultOptions;
                })();

                init();

                function init() {
                        focuser = widget.ownerDocument.createElement('input');
                        var wrapper = widget.ownerDocument.createElement('span');
                        wrapper.style.cssText = 'position: absolute; overflow: hidden; width: 0; height: 0';
                        wrapper.appendChild(focuser);
                        // it's placed in to widget, to mimics tabindex zero behaviour, where element document order matter 
                        widget.insertBefore(wrapper, widget.firstChild);
                        toggleEvent(true);
                };

                function toggleEvent(register) {
                        var method = register ? 'addEventListener' : 'removeEventListener';
                        focuser[method]('focus', onFocusBlur);
                        focuser[method]('blur', onFocusBlur);
                        window[method]('blur', onWindowBlur);
                        //widget[method]('mousedown', onWidgetMousedown);
                };

                // set active simulation
                function onWidgetMousedown(e) {
                        if (widgetState == 'Blur') {
                                setTimeout(function() {
                                        focuser.focus();
                                }, 1);
                        }
                };

                function onFocusBlur(e) {
                        lastState = e.type.charAt(0).toUpperCase() + e.type.substring(1);
                        if (focused) options['on' + lastState](focused, e);
                        clearTimeout(widgetFocusBlurTimer);
                        widgetFocusBlurTimer = setTimeout(onWidgetFocusBlur, 10);
                };

                function onWidgetFocusBlur() {
                        if (widgetState == lastState) return;
                        widgetState = lastState;
                        options['onWidget' + widgetState]();
                };

                // safari is so stupid.. doesn't fire blur event when another browser tab is switched
                function onWindowBlur() {
                        focuser.blur();
                };

                function focus(el) {
                        setTimeout(function() {
                                focuser.blur();
                                setTimeout(function() {
                                        focused = el;
                                        focuser.focus();
                                }, 1);
                        }, 1);
                };

                function refresh() {
                        var deleteFocused = true,
                                els = widget.getElementsByTagName('*');
                        for (var i = els.length; i--; ) {
                                if (els[i] === focused) deleteFocused = false;
                        }
                        if (deleteFocused) focused = null;
                };

                function getFocused() {
                        return focused;
                };

                function getKeyListener() {
                        return focuser;
                };

                function destroy() {
                        toggleEvents();
                };

                return {
                        focus: focus,
                        getFocused: getFocused,
                        getKeyListener: getKeyListener,
                        refresh: refresh,
                        destroy: destroy
                }

        });

})();
/*
---
 
script: Submittable.js
 
description: Makes widget result in either submission or cancellation
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Mixin
  - QFocuser/QFocuser
 
provides:
  - LSD.Mixin.Submittable
 
...
*/


LSD.Mixin.Submittable = new Class({
  options: {
    actions: {
      autosubmission: {
        enable: function() {
          if (this.attributes.autosubmit) this.submit();
        }
      }
    },
    events: {
      _form: {
        attach: function(element) {
          if (LSD.toLowerCase(element.tagName) == 'form') element.addEvent('submit', this.bindEvent('submit'));
        },
        detach: function(element) {
          if (LSD.toLowerCase(element.tagName) == 'form') element.removeEvent('submit', this.bindEvent('submit'));
        }
      }
    },
    chain: {
      submission: function() {
        return {
          action: 'submit',
          target: this.getSubmissionTarget,
          arguments: this.getSubmissionData,
          priority: -5
        }
      }
    }
  },
  
  submit: function(event) {
    if (event && event.type == 'submit' && event.target == this.element)
      event.preventDefault();

    var submission = this.captureEvent('submit', arguments);
    if (submission) return submission;
    else if (submission !== false) this.callChain();
    return this;
  },
  
  cancel: function() {
    var submission = this.captureEvent('cancel', arguments);
    if (submission) return submission;
    else if (submission !== false) {
      var target = this.getSubmissionTarget();
      if (target) target.uncallChain();
      this.uncallChain();
    };
    return this;
  },
  
  getInvoker: function() {
    return this.invoker || this.options.invoker;
  },
  
  getSubmissionTarget: function() {
    return this.getInvoker();
  },
  
  getSubmissionData: function() {
    return this.getData();
  }
});

LSD.Behavior.define(':submittable', LSD.Mixin.Submittable);
/*
---
 
script: Focus.js
 
description: A mixin to make widget take focus like a regular input (even in Safari)
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Mixin
  - QFocuser/QFocuser
 
provides:
  - LSD.Mixin.Focusable
  - LSD.Mixin.Focusable.Propagation
 
...
*/
  
LSD.Mixin.Focusable = new Class({
  options: {
    actions: {
      focus: {
        target: false,
        enable: function(target) {
          if (target.tabindex != null) {
            target.attributes.tabindex = target.tabindex
            if (target.focuser) target.element.set('tabindex', target.tabindex)
            delete target.tabindex;
          }
          if (target.attributes.tabindex == -1) return;
          target.getFocuser();
          target.addEvents(target.events.focus);
          target.element.addEvents(target.bindEvents({mousedown: 'retain'}));
        },
        
        disable: function(target) {
          target.blur();
          if (target.options.tabindex == -1) return;
          target.tabindex = target.options.tabindex || 0;
          target.element.set('tabindex', -1)
          target.attributes.tabindex = -1;
          target.removeEvents(target.events.focus);
          target.element.removeEvents(target.bindEvents({mousedown: 'retain'}));
        }
      }
    }
  },
  
  getFocuser: Macro.getter('focuser', function() {
    return new QFocuser(this.toElement(), {
      onWidgetFocus: this.onFocus.bind(this),
      onWidgetBlur: this.onBlur.bind(this),
      tabIndex: this.getAttribute('tabindex')
    })
  }),
  
  focus: function(element) {
    if (element !== false) {
      this.getFocuser().focus(element || this.element);
      this.document.activeElement = this;
    }
    if (this.focused) return;
    this.focused = true;
    this.fireEvent('focus', arguments);
    this.onStateChange('focused', true);
    LSD.Mixin.Focusable.Propagation.focus(this);
  },
  
  blur: function(propagated) {
    if (!this.focused) return;
    this.focused = false;
    this.fireEvent('blur', arguments);
    this.onStateChange('focused', false);
    if (!propagated) LSD.Mixin.Focusable.Propagation.blur.delay(10, this, this);
  },
  
  retain: function(e) {
    if (e) e.stop();
    this.focus();
  },
  
  onFocus: function() {
    this.focus(false);
    this.document.activeElement = this;
  },
  
  onBlur: function() {
    var active = this.document.activeElement;
    if (active == this) delete this.document.activeElement;
    while (active && (active = active.parentNode)) if (active == this) return;
    this.blur();
  },
  
  getKeyListener: function() {
    return this.getFocuser().getKeyListener()
  }
});

LSD.Mixin.Focusable.Propagation = {
  focus: function(parent) {
    while (parent = parent.parentNode) if (parent.getFocuser) parent.focus(false);
  },
  
  blur: function(parent) {
    var active = parent.document.activeElement;
    var hierarchy = [];
    if (active) {
      for (var widget = active; widget.parentNode && hierarchy.push(widget); widget = widget.parentNode);
    }
    while (parent = parent.parentNode) {
      if (active && hierarchy.contains(parent)) break;
      if (parent.options && (parent.attributes.tabindex != null) && parent.blur) parent.blur(true);
    }
  }
};

LSD.Behavior.define('[tabindex][tabindex!=-1], :focusable', LSD.Mixin.Focusable);
/*
---
 
script: Input.js
 
description: Make it easy to use regular native input for the widget
 
license: Public domain (http://unlicense.org).
 
requires:
  - LSD.Trait
  - LSD.Mixin.Focusable

provides: 
  - LSD.Trait.Input
  
...
*/

LSD.Trait.Input = new Class({
  options: {
    input: {},
  },
  
  initializers: {
    input: function() {
      return {
        events: {
          self: {
            build: function() {
              this.getInput().inject(this.element);
            },
            focus: function() {
              this.document.activeElement = this;
              if (LSD.Mixin.Focusable) LSD.Mixin.Focusable.Propagation.focus(this);
            },
            blur: function() {
                if (this.document.activeElement == this) delete this.document.activeElement;
             //   if (LSD.Mixin.Focusable) LSD.Mixin.Focusable.Propagation.blur.delay(10, this, this);
            }
          },
          input: {
            focus: 'onFocus',
            blur: 'onBlur'
          },
        }
      }
    }
  },
  
  onFocus: function() {
    this.document.activeElement = this;
    this.focus();
  },
  
  getInput: Macro.getter('input', function() {
    var input = new Element('input', Object.append({'type': 'text'}, this.options.input));
    this.fireEvent('register', ['input', input]);
    return input;
  }),
  
  getValueInput: function() {
    return this.input
  }
});
/*
---
 
script: Section.js
 
description: SVG-Based content element (like <section> in html5)
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
- LSD/LSD.Widget.Paint

provides: 
  - LSD.Widget.Section
  - LSD.Widget.Header
  - LSD.Widget.Footer
  - LSD.Widget.Nav
 
...
*/

LSD.Widget.Section = new Class({
  Extends: LSD.Widget.Paint,
  
  options: {
    tag: 'section',
    element: {
      tag: 'section'
    }
  }
});

LSD.Widget.Header = new Class({
  Extends: LSD.Widget.Section,
  
  options: {
    tag: 'header',
    element: {
      tag: 'header'
    }
  }
});

LSD.Widget.Footer = new Class({
  Extends: LSD.Widget.Section,

  options: {
    tag: 'footer',
    element: {
      tag: 'footer'
    }
  }
});

LSD.Widget.Nav = new Class({
  Extends: LSD.Widget.Section,

  options: {
    tag: 'nav',
    element: {
      tag: 'nav'
    }
  }
});
/*
---
 
script: Scrollbar.js
 
description: Scrollbars for everything
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
- LSD/LSD.Widget.Paint
- LSD.Widget.Section
- LSD.Widget.Button
- LSD/LSD.Trait.Slider

provides: [LSD.Widget.Scrollbar]
 
...
*/

LSD.Widget.Scrollbar = new Class({
  Includes: [
    LSD.Widget.Paint,
    LSD.Trait.Slider
  ],
  
  options: {
    tag: 'scrollbar',
    events: {
      expected: {
        '#incrementor': {
          click: 'increment'
        },
        '#decrementor': {
          click: 'decrement'
        }
      }
    },
    layout: {
      children: {
        '^track#track': {
          'scrollbar-thumb#thumb': {},
        },
        '^button#decrementor': {},
        '^button#incrementor': {}
      }
    },
    slider: {
      wheel: true
    }
  },
  
  initialize: function() {
    this.parent.apply(this, arguments);
    this.setState(this.options.mode);
  },
  
  onParentResize: function(size, old){
    if (!size || $chk(size.height)) size = this.parentNode.size;
    var isVertical = (this.options.mode == 'vertical');
    var other = isVertical ? 'horizontal' : 'vertical';
    var prop = isVertical ? 'height' : 'width';
    var Prop = prop.capitalize();
    var setter = 'set' + Prop;
    var getter = 'getClient' + Prop;
    var value = size[prop];
    if (isNaN(value) || !value) return;
    var invert = this.parentNode[other];
    var scrolled = this.getScrolled();
    $(scrolled).setStyle(prop, size[prop])
    var ratio = size[prop] / $(scrolled)['scroll' + Prop]
    var delta = (!invert || !invert.parentNode ? 0 : invert.getStyle(prop));
    this[setter](size[prop] - delta);
    var offset = 0;
    if (this.track.offset.inner) {
      if (isVertical) {
        offset += this.track.offset.inner.top + this.track.offset.inner.bottom
      } else {
        offset += this.track.offset.inner.left + this.track.offset.inner.right
      }
    }
    var track = size[prop] - this.incrementor[getter]() - this.decrementor[getter]() - delta - ((this.style.current.strokeWidth || 0) * 2) - offset * 2
    this.track[setter](track);
    this.track.thumb[setter](Math.ceil(track * ratio))
    this.refresh(true);
    this.parent.apply(this, arguments);
  },
  
  inject: function(widget) {
    var result = this.parent.apply(this, arguments);
    this.options.actions.slider.enable.call(this);
    return result
  },
  
  onSet: function(value) {
    var prop = (this.options.mode == 'vertical') ? 'height' : 'width';
    var direction = (this.options.mode == 'vertical') ? 'top' : 'left';
    var element = $(this.getScrolled());
    var result = (value / 100) * (element['scroll' + prop.capitalize()] - element['offset' + prop.capitalize()]);
    element['scroll' + direction.capitalize()] = result;
    this.now = value;
  },
  
  getScrolled: Macro.getter('scrolled', function() {
    var parent = this;
    while ((parent = parent.parentNode) && !parent.getScrolled);
    return parent.getScrolled ? parent.getScrolled() : this.parentNode.element;
  }),
  
  getTrack: function() {
    return $(this.track)
  },
  
  getTrackThumb: function() {
    return $(this.track.thumb);
  }
})

LSD.Widget.Scrollbar.Track = new Class({
  Extends: LSD.Widget.Section,
  
  options: {
    tag: 'track'
  }
});

LSD.Widget.Scrollbar.Thumb = new Class({
  Extends: LSD.Widget.Button,
  
  options: {
    tag: 'thumb'
  }
});

LSD.Widget.Scrollbar.Button = LSD.Widget.Button;
/*
---
 
script: Scrollable.js
 
description: For all the scrollbars you always wanted
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Mixin
  - LSD.Behavior
  - Widgets/LSD.Widget.Scrollbar

provides: 
  - LSD.Mixin.Scrollable
 
...
*/

LSD.Mixin.Scrollable = new Class({
  options: {
    events: {
      self: {
        resize: 'showScrollbars'
      },
      element: {
        mousewheel: 'onMousewheel'
      }
    }
  },
  
  onMousewheel: function(event) {
    var scrollbar = this.vertical || this.horizontal;
    if (scrollbar) scrollbar.track.element.fireEvent('mousewheel', event  );
  },
  
  showScrollbars: function(size) {
    if (!size) size = this.size;
    var scrolled = document.id(this.getScrolled());
    scrolled.setStyles(size)
    scrolled.setStyle('overflow', 'hidden');
    if (size.width < scrolled.scrollWidth) {
      if (this.getHorizontalScrollbar().parentNode != this) this.horizontal.inject(this);
      this.horizontal.slider.set(this.horizontal.now)
    } else if (this.horizontal) this.horizontal.dispose();
    
    if (size.height < scrolled.scrollHeight) {
      if (this.getVerticalScrollbar().parentNode != this) this.vertical.inject(this);
        this.vertical.slider.set(this.vertical.now)
    } else if (this.vertical) this.vertical.dispose();
  },
  
  getVerticalScrollbar: Macro.getter('vertical', function() {
    return this.buildLayout('scrollbar[mode=vertical]')
  }),
  
  getHorizontalScrollbar: Macro.getter('horizontal', function() {
    return this.buildLayout('scrollbar[mode=horizontal]')
  }),
  
  getScrolled: Macro.defaults(function() {
    return this.getWrapper();
  })
});

LSD.Behavior.define('[scrollable]', LSD.Mixin.Scrollable);
/*
---
 
script: Form.js
 
description: A form widgets. Intended to be submitted.
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
- LSD/LSD.Widget.Paint

provides: [LSD.Widget.Form]
 
...
*/

LSD.Widget.Form = new Class({
  Extends: LSD.Widget.Paint,

  options: {
    tag: 'form',
    element: {
      tag: 'form'
    },
    layers: {},
    events: {
      element: {
        submit: $lambda(false)
      }
    }
  }  
});
/*
---
 
script: Edit.js
 
description: Turn element into editable mode
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Action
  - Widgets/LSD.Widget.Body
  - Widgets/LSD.Widget.Form
  - LSD.Mixin.Fieldset
  - LSD.Mixin.Resource

provides:
  - LSD.Action.Edit

...
*/

LSD.Action.Edit = LSD.Action.build({
  enable: function(target, content) {
    var session = this.retrieve(target);
    if (!session) {
      $ss = session = new LSD.Widget.Form.Edit(target.element || target);
      this.store(target, session);
    }
    session.edit(content);
  },
  
  disable: function(target) {
    var session = this.retrieve(target);
    if (session) session.hide();
  }
});

LSD.Widget.Form.Edit = new Class({
  options: {
    key: null,
    layout: {
      '::canceller': 'Cancel',
      '::submitter': 'Save'
    },
    events: {
      self: {
        'cancel': 'finish'
      }
    },
    states: Array.fast('editing', 'hidden'),
    pseudos: Array.fast('form', 'fieldset', 'resource', 'command'),
    has: {
      one: {
        submitter: {
          selector: '[type=submit]',
          source: 'input[type=submit]'
        },
        canceller: {
          selector: 'button.cancel',
          events: {
            click: 'cancel'
          }
        }
      }
    }
  },
  
  initialize: function() {
    this.objects = [];
    this.parent.apply(this, arguments);
  },
  
  edit: function(values) {
    Element.Item.walk.call(this, this.element, function(node, prop, scope, prefix) {
      var editable = node.getProperty('editable');
      if (editable) {
        if (prefix) prop = prefix.concat(prop).map(function(item, i) {
          return i == 0 ? item : '[' + item + ']'
        }).join('');
        this.convert(node, prop, editable);
      }
      return prefix;
    }, null, true);
    if (this.controls) this.controls.each(function(child) {
      this.element.appendChild(child.element);
    }, this);
  },

  finish: function() {
    //console.log('revert', [].concat(this.objects))
    for (var object; object = this.objects.shift();) this.revert(object);
    this.submitter.dispose();
    this.canceller.dispose();
  },
  
  convert: function(element, name, type) {
    this.objects.push(element)
    return this.getReplacement(element, name, type).replaces(element);
  },
  
  revert: function(element) {
    element.replaces(Element.retrieve(element, 'widget:edit'));
  },
  
  cancel: function() {
    this.fireEvent('cancel', arguments)
  },
  
  submit: function() {
    if (this.getResource) {
      var Resource = this.getResource();
      new Resource(Object.append(this.getParams(), {id: this.attributes.itemid})).save(function(html) {
        this.execute({action: 'replace', target: this.element}, html);
      }.bind(this));
    }
  },
  
  getReplacement: function(element, name, type) {
    var widget = Element.retrieve(element, 'widget:edit');
    if (!widget) {
      var options = {attributes: {name: name}};
      widget = this.buildLayout(type == 'area' ? 'textarea' : ('input-' + (type || 'text')), this, options);
      
      Element.store(element, 'widget:edit', widget);
    }
    //widget.setValue(Element.get(element, 'itemvalue'));
    return widget;
  }
});