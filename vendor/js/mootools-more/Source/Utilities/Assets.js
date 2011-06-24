/*
---

script: Assets.js

name: Assets

description: Provides methods to dynamically load JavaScript, CSS, and Image files into the document.

license: MIT-style license

authors:
  - Valerio Proietti

requires:
  - Core/Element.Event
  - /MooTools.More

provides: [Assets]

...
*/

var Asset = {

	javascript: function(source, properties){
		properties = Object.append({
			onload: function(){},
			document: document,
			check: Function.from(true)
		}, properties);
		
		if (properties.onLoad){
			properties.onload = properties.onLoad;
			delete properties.onLoad;
		}
		var script = new Element('script', {src: source, type: 'text/javascript'});

		var load = properties.onload.bind(script), 
			check = properties.check, 
			doc = properties.document;
		delete properties.onload;
		delete properties.check;
		delete properties.document;

		script.addEvents({
			load: load,
			readystatechange: function(){
				if (['loaded', 'complete'].contains(this.readyState)) load();
			}
		}).set(properties);

		if ((Browser.safari || Browser.chrome) && Browser.version == 2){
			var checker = (function(){
				if (!Function.attempt(check)) return;
				clearInterval(checker);
				load();
			}).periodical(50);
		}

		return script.inject(doc.head);
	},

	css: function(source, properties){
		properties = properties || {};
		var onload = properties.onload || properties.onLoad;
		if (onload){
			properties.events = properties.events || {};
			properties.events.load = onload;
			delete properties.onload;
			delete properties.onLoad;
		}
		return new Element('link', Object.merge({
			rel: 'stylesheet',
			media: 'screen',
			type: 'text/css',
			href: source
		}, properties)).inject(document.head);
	},

	image: function(source, properties){
		properties = Object.merge({
			onload: function(){},
			onabort: function(){},
			onerror: function(){}
		}, properties);
		var image = new Image();
		var element = document.id(image) || new Element('img');
		['load', 'abort', 'error'].each(function(name){
			var type = 'on' + name;
			var cap = name.capitalize();
			if (properties['on' + cap]){
				properties[type] = properties['on' + cap];
				delete properties['on' + cap];
			}
			var event = properties[type];
			delete properties[type];
			image[type] = function(){
				if (!image) return;
				if (!element.parentNode){
					element.width = image.width;
					element.height = image.height;
				}
				image = image.onload = image.onabort = image.onerror = null;
				event.delay(1, element, element);
				element.fireEvent(name, element, 1);
			};
		});
		image.src = element.src = source;
		if (image && image.complete) image.onload.delay(1);
		return element.set(properties);
	},

	images: function(sources, options){
		options = Object.merge({
			onComplete: function(){},
			onProgress: function(){},
			onError: function(){},
			properties: {}
		}, options);
		sources = Array.from(sources);
		var images = [];
		var counter = 0;
		return new Elements(sources.map(function(source){
			return Asset.image(source, Object.append(options.properties, {
				onload: function(){
					options.onProgress.call(this, counter, sources.indexOf(source));
					counter++;
					if (counter == sources.length) options.onComplete();
				},
				onerror: function(){
					options.onError.call(this, counter, sources.indexOf(source));
					counter++;
					if (counter == sources.length) options.onComplete();
				}
			}));
		}));
	}

};
