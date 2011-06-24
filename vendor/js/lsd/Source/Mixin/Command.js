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