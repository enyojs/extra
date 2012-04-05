//* @public

enyo.string = {
	/** return string with white space at start and end removed */
	trim: function(inString) {
		return inString.replace(/^\s+|\s+$/g,"");
	},
	/** return string with leading and trailing quote characters removed, e.g. <code>"foo"</code> becomes <code>foo</code> */
	stripQuotes: function(inString) {
		var c0 = inString.charAt(0);
		if (c0 == '"' || c0 == "'") {
			inString = inString.substring(1);
		}
		var l = inString.length - 1, cl = inString.charAt(l);
		if (cl == '"' || cl == "'") {
			inString = inString.substr(0, l);
		}
		return inString;
	},
	//* Encode a string to Base64
	toBase64: function(inText) { return window.btoa(inText); },
	//* Decode string from Base64. Throws exception on bad input.
	fromBase64: function(inText) { return window.atob(inText); }
};

if (!(window.btoa && window.atob)) {
	enyo.string.toBase64 = enyo.string.fromBase64 = function(inText) {
		enyo.error("Your browser does not support native base64 operations");
		return inText;
	};
};
