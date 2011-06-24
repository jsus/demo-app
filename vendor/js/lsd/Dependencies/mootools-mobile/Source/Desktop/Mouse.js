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
