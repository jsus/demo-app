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