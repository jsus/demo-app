/*
---

script: Drag.Move.js

name: Drag.Move

description: A Drag extension that provides support for the constraining of draggables to containers and droppables.

license: MIT-style license

authors:
  - Valerio Proietti
  - Tom Occhinno
  - Jan Kassens
  - Aaron Newton
  - Scott Kyle

requires:
  - Core/Element.Dimensions
  - /Drag

provides: [Drag.Move]

...
*/

Drag.Move = new Class({

	Extends: Drag,

	options: {/*
		onEnter: function(thisElement, overed){},
		onLeave: function(thisElement, overed){},
		onDrop: function(thisElement, overed, event){},*/
		droppables: [],
		container: false,
		precalculate: false,
		includeMargins: true,
		checkDroppables: true
	},

	initialize: function(element, options){
		this.parent(element, options);
		element = this.element;
		
		this.droppables = $$(this.options.droppables);
		this.container = document.id(this.options.container);
		
		if (this.container && typeOf(this.container) != 'element'){
			this.container = document.id(this.container.getDocument().body);
		}
		
		var styles = element.getStyles('left', 'top', 'position');
		if (styles.left == 'auto' || styles.top == 'auto'){
			element.setPosition(element.getPosition(element.getOffsetParent()));
		}
		
		if (styles.position == 'static') element.setStyle('position', 'absolute');

		this.addEvent('start', this.checkDroppables, true);

		this.overed = null;
	},

	start: function(event){
		if (this.container) this.options.limit = this.calculateLimit();
		
		if (this.options.precalculate){
			this.positions = this.droppables.map(function(el){
				return el.getCoordinates();
			});
		}
		
		this.parent(event);
	},
	
	calculateLimit: function(){
		var element = this.element,
			container = this.container,
			offsetParent = document.id(element.getOffsetParent() || element.parentNode),
			containerCoordinates = container.getCoordinates(offsetParent),
			containerBorder = {},
			elementMargin = {},
			elementBorder = {},
			containerMargin = {},
			offsetParentPadding = {};

		['top', 'right', 'bottom', 'left'].each(function(pad){
			containerBorder[pad] = container.getStyle('border-' + pad).toInt();
			elementBorder[pad] = element.getStyle('border-' + pad).toInt();
			elementMargin[pad] = element.getStyle('margin-' + pad).toInt();
			containerMargin[pad] = container.getStyle('margin-' + pad).toInt();
			offsetParentPadding[pad] = offsetParent.getStyle('padding-' + pad).toInt();
		}, this);

		var width = element.offsetWidth + elementMargin.left + elementMargin.right,
			height = element.offsetHeight + elementMargin.top + elementMargin.bottom,
			left = 0,
			top = 0,
			right = containerCoordinates.right - containerBorder.right - width,
			bottom = containerCoordinates.bottom - containerBorder.bottom - height;

		if (this.options.includeMargins){
			left += elementMargin.left;
			top += elementMargin.top;
		} else {
			right += elementMargin.right;
			bottom += elementMargin.bottom;
		}
		
		if (element.getStyle('position') == 'relative'){
			var coords = element.getCoordinates(offsetParent);
			coords.left -= element.getStyle('left').toInt();
			coords.top -= element.getStyle('top').toInt();
			
			left += containerBorder.left - coords.left;
			top += containerBorder.top - coords.top;
			right += elementMargin.left - coords.left;
			bottom += elementMargin.top - coords.top;
			
			if (container != offsetParent){
				left += containerMargin.left + offsetParentPadding.left;
				top += (Browser.ie6 ? 0 : containerMargin.top) + offsetParentPadding.top;
			}
		} else {
			left -= elementMargin.left;
			top -= elementMargin.top;
			
			if (this.container == offsetParent){
				right -= containerBorder.left;
				bottom -= containerBorder.top;
			} else {
				left += containerCoordinates.left + containerBorder.left;
				top += containerCoordinates.top + containerBorder.top;
			}
		}
		
		return {
			x: [left, right],
			y: [top, bottom]
		};
	},

	checkDroppables: function(){
		var overed = Array.from(this.droppables).filter(function(el, i){
			el = this.positions ? this.positions[i] : el.getCoordinates();
			var now = this.mouse.now;
			return (now.x > el.left && now.x < el.right && now.y < el.bottom && now.y > el.top);
		}, this).getLast();
		
		if (this.overed != overed){
			if (this.overed) this.fireEvent('leave', [this.element, this.overed]);
			if (overed) this.fireEvent('enter', [this.element, overed]);
			this.overed = overed;
		}
	},

	drag: function(event){
		this.parent(event);
		if (this.options.checkDroppables && this.droppables.length) this.checkDroppables();
	},

	stop: function(event){
		this.checkDroppables();
		this.fireEvent('drop', [this.element, this.overed, event]);
		this.overed = null;
		return this.parent(event);
	}

});

Element.implement({

	makeDraggable: function(options){
		var drag = new Drag.Move(this, options);
		this.store('dragger', drag);
		return drag;
	}

});
