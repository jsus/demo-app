// -*- Mode: JavaScript QUnit; tab-width: 4; -*-

if (typeof exports == 'undefined') exports = {};

// Test Requirements

if (typeof require != 'undefined') {
	// If run from the project root
	require.paths.unshift('Source');
	require.paths.unshift('Test');
	
	if (typeof API == 'undefined')
		var API = require("DOM-styleSheet.api");
	
	if (typeof Sheet == 'undefined')
		var Sheet = require("Sheet").Sheet;
}

// Test

exports ["test Property parsing"] = {
  
  "test stuff": function() {
    for (var property in Examples) {
      var examples = Examples[property];
      for (var input in examples) {
        var value = SheetParser.Value.translate(input);
        if (!value.push) value = [value];
        deepEqual(
          SheetParser.Properties[property].apply(1, value),
          examples[input], 
          property + ': ' + input
        )
      }
    }
  }
  
} 


var Examples = { 
  zIndex: {
    '0': true,
    '1': true,
    '999999': true,
    '-1': true,
    '+1': false,
    'f': false,
    'none': false,
    'inherit': false,
    'f99999': false
  },
  display: {
    'block': true,
    'inline-block': true,
    'bkoz': false,
    '-moz-inline-block': false
  },
  color: {
    'rgb(1, 1, 1)': true,
    'rgba(1, 2, 1)': true,
    'rgba(1, 2, 1, 1)': true,
    'rgba(1, 2, 1, 1%)': true,
    'rgba(1, 2, 1, 0.5)': true,
    'hsb(0, 30, 100, 0.5)': true,
    '#ccc': true,
    '#cccccc': true,
    '#ccccc': false,
    'rgbo(1, 2, 1, 0.5)': false,
    'rdb(1, 2, 1, 0.5)': false
    //'black'
    //'cyan' - Color map takes 4kb. Does it worth it?    
  },
  lineHeight: {
    'normal': true,
    'normol': false,
    '1': true,
    '1.5': true,
    '50%': true,
    '55.4%': true,
    '5f.5%': false,
    'none': false
  },
  cursor: {
    'sw-resize': true,
    'ws-resize': false
  },
  fontWeight: {
    '100': true,
    'bold': true,
    'normal': true,
    '100%': false,
    'big': false
  },
  borderTop: {
    '3px solid #ccc': {borderTopWidth: {number: 3, unit: 'px'}, borderTopStyle: 'solid', borderTopColor: '#ccc'},
    '1em dotted rgba(1,1,1, 0.5)': {borderTopWidth: {number: 1, unit: 'em'}, borderTopStyle: 'dotted', borderTopColor: {rgba: [1, 1, 1, 0.5]}},
    '1.3pt solid hsb(0, 0, 30, 30)': {borderTopWidth: {number: 1.3, unit: 'pt'}, borderTopStyle: 'solid', borderTopColor: {hsb: [0, 0, 30, 30]}},
    
    '1.3% solid hsb(0, 0, 30, 30)': false,    
    '1em soled rgba(1,1,1, 0.5)': false,    
    '1em solid #cccccz': false,   
    //'1 solid #ccc': false,    //unitless length is valid now
//    '3px solid black': {borderTopWidth: {number: 3, unit: 'px'}, borderTopStyle: 'solid', borderTopColor: 'black'},
  },
  font: {
    '7px Georgia': {fontSize: {number: 7, unit: 'px'}, fontFamily: 'Georgia'},
    'normal 3pt Georgia': {fontStyle: 'normal', fontSize: {number: 3, unit: 'pt'}, fontFamily: 'Georgia'},
    'normal bold medium "Tahoma"': {fontStyle: 'normal', fontWeight: 'bold', fontSize: 'medium', fontFamily: 'Tahoma'},
    'normal italic medium "Tahoma"': {fontVariant: 'normal', fontStyle: 'italic', fontSize: 'medium', fontFamily: 'Tahoma'},
    'bold italic medium "Tahoma"': {fontWeight: 'bold', fontStyle: 'italic', fontSize: 'medium', fontFamily: 'Tahoma'},
    //'bold italic medium 3px "Tahoma"': {fontWeight: 'bold', fontStyle: 'italic', fontSize: 'medium', fontFamily: 'Tahoma'},
    'bold italic small-caps medium "Tahoma"': {fontWeight: 'bold', fontStyle: 'italic', fontVariant: 'small-caps', fontSize: 'medium', fontFamily: 'Tahoma'},
    
    'Georgia 7px': false,
    'Georgia': false,
    '7px': false,
    '3pt normal 3px Tahoma': false,
    '3pz Georgia': false,
    //'3pt normal normal Tahoma': false,
    'normal normal normal Tahoma': false
    //'normal bold medium normal "Tahoma"': {fontStyle: 'normal', fontWeight: 'bold', fontSize: 'medium', lineHeight: 'normal', fontFamily: 'Tahoma'}
  },
  
  margin: {
    '4px': {marginTop: {number: 4, unit: 'px'}, marginRight: {number: 4, unit: 'px'}, marginBottom: {number: 4, unit: 'px'}, marginLeft: {number: 4, unit: 'px'}},
    '50% 4px': {marginTop: {number: 50, unit: '%'}, marginRight: {number: 4, unit: 'px'}, marginBottom: {number: 50, unit: '%'}, marginLeft: {number: 4, unit: 'px'}},
    '4px 4px 4px': {marginTop: {number: 4, unit: 'px'}, marginRight: {number: 4, unit: 'px'}, marginBottom: {number: 4, unit: 'px'}, marginLeft: {number: 4, unit: 'px'}},
    '4px -4fr 4px 4px': {marginTop: {number: 4, unit: 'px'}, marginRight: {number: -4, unit: 'fr'}, marginBottom: {number: 4, unit: 'px'}, marginLeft: {number: 4, unit: 'px'}},

  },
  
  border: {
    '1px solid #ccc': {
      borderTopWidth: {number: 1, unit: 'px'}, 
      borderTopStyle: 'solid', 
      borderTopColor: "#ccc",
      borderRightWidth: {number: 1, unit: 'px'}, 
      borderRightStyle: 'solid', 
      borderRightColor: "#ccc",
      borderBottomWidth: {number: 1, unit: 'px'}, 
      borderBottomStyle: 'solid', 
      borderBottomColor: "#ccc",
      borderLeftWidth: {number: 1, unit: 'px'}, 
      borderLeftStyle: 'solid', 
      borderLeftColor: "#ccc"
    },
    '2pt dotted rgba(0, 10, 37, 50%), 5px dashed #c31': {
      borderTopWidth: {number: 2, unit: 'pt'}, 
      borderTopStyle: 'dotted', 
      borderTopColor: {rgba: [0, 10, 37, {number: 50, unit: "%"}]},
      borderRightWidth: {number: 5, unit: 'px'}, 
      borderRightStyle: 'dashed', 
      borderRightColor: "#c31",
      borderBottomWidth: {number: 2, unit: 'pt'}, 
      borderBottomStyle: 'dotted', 
      borderBottomColor: {rgba: [0, 10, 37, {number: 50, unit: "%"}]},
      borderLeftWidth: {number: 5, unit: 'px'}, 
      borderLeftStyle: 'dashed', 
      borderLeftColor: "#c31"
    },
    '1px solid #ccc, 2px solid #ccc, 3px solid #ccc': {
      borderTopWidth: {number: 1, unit: 'px'}, 
      borderTopStyle: 'solid', 
      borderTopColor: "#ccc",
      borderRightWidth: {number: 2, unit: 'px'}, 
      borderRightStyle: 'solid', 
      borderRightColor: "#ccc",
      borderBottomWidth: {number: 3, unit: 'px'}, 
      borderBottomStyle: 'solid', 
      borderBottomColor: "#ccc",
      borderLeftWidth: {number: 2, unit: 'px'}, 
      borderLeftStyle: 'solid', 
      borderLeftColor: "#ccc"
    },
  },
  
  background: {
    '#cc0': { backgroundColor: '#cc0'},
    'no-repeat #cd1': { backgroundRepeat: 'no-repeat', backgroundColor: '#cd1'},
    '#cd2 repeat-x fixed': { backgroundColor: '#cd2', backgroundRepeat: 'repeat-x', backgroundAttachment: 'fixed'},
    '#e33 url("http://google.png") center': { backgroundColor: '#e33', backgroundImage: {url: "http://google.png"}, backgroundPositionX: 'center'},
    'url("//cc.cc") rgba(0, 3, 2, 1.5%) 3px': { backgroundImage: {url: "//cc.cc"}, backgroundColor: {rgba: [0, 3, 2, {number: 1.5, unit: '%'}]}, backgroundPositionX: {number: 3, unit: 'px'}},
    '-55.5% right repeat url("//cc.cc#ach.gif") hsb(20, 10, -10, 5%)': { 
      backgroundPositionY: {number: -55.5, unit: '%'},
      backgroundPositionX: 'right',
      backgroundRepeat: 'repeat',
      backgroundImage: {url: "//cc.cc#ach.gif"}, 
      backgroundColor: {hsb: [20, 10, -10, {number: 5, unit: '%'}]}
    },
    
    '-55.5% bottom repeat-y url("#pic") #ccc fixed': {
      backgroundPositionX: {number: -55.5, unit: '%'},
      backgroundPositionY: 'bottom',
      backgroundRepeat: 'repeat-y',
      backgroundImage: {url: "#pic"},
      backgroundColor: '#ccc',
      backgroundAttachment: 'fixed'
    },
    '-55.5f bottom repeat-y url("#pic") #ccc fixed': false,
    '-55.5% bodtom repeat-y url("#pic") #ccc fixed': false,
    '-55.5% bottom repead-y url("#pic") #ccc fixed': false,
    '-55.5% bottom repeat-y uzl("#pic") #ccc fixed': false,
    '-55.5% bottom repeat-y url #ccc fixed': false,
    '-55.5% bottom repeat-y url("#pic") #zzz fixed': false,
    '-55.5% bottom repeat-y url("#pic") #ccc fixes': false,
    '-55.5% bottom repeat-y url("#pic") #ccc fixed fixed': false
  },
  
  padding: {
    '4pt': {paddingTop: {number: 4, unit: 'pt'}, paddingRight: {number: 4, unit: 'pt'}, paddingBottom: {number: 4, unit: 'pt'}, paddingLeft: {number: 4, unit: 'pt'}},
    '4px 4px': {paddingTop: {number: 4, unit: 'px'}, paddingRight: {number: 4, unit: 'px'}, paddingBottom: {number: 4, unit: 'px'}, paddingLeft: {number: 4, unit: 'px'}},
    '4px 1pt 4px': {paddingTop: {number: 4, unit: 'px'}, paddingRight: {number: 1, unit: 'pt'}, paddingBottom: {number: 4, unit: 'px'}, paddingLeft: {number: 1, unit: 'pt'}},
    '4px 4px 4px 4px': {paddingTop: {number: 4, unit: 'px'}, paddingRight: {number: 4, unit: 'px'}, paddingBottom: {number: 4, unit: 'px'}, paddingLeft: {number: 4, unit: 'px'}},    
    
    '4pz 4px 4px 4px': false,
    '4px 4pz 4px 4px': false,
    '4px 4px 4pz 4px': false,
    '4px 4px 4px 4pz': false,
    
    '4pz 4px 4px': false,
    '4px 4pz 4px': false,
    '4px 4px 4pz': false,
    
    '4pz 4px': false,
    '4px 4pz': false,
    
    '4pz': false
  }
}