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
	/**
		return string with ampersand, less-than, and greater-than characters replaced with HTML entities, 
		e.g. '&lt;code&gt;"This &amp; That"&lt;/code&gt;' becomes '&amp;lt;code&amp;gt;"This &amp;amp; That"&amp;lt;/code&amp;gt;' 
	*/
	escapeHtml: function(inText) {
		return inText != null ? String(inText).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
	},
	/**
		return string with ampersand and double quote characters replaced with HTML entities, 
		e.g. 'hello from "Me & She"' becomes 'hello from &amp;quot;Me &amp;amp; She&amp;quot;' 
	*/
	escapeHtmlAttribute: function(inText) {
		return inText != null ? String(inText).replace(/&/g,'&amp;').replace(/"/g,'&quot;') : '';
	},
	/** return a text-only version of a string that may contain html */
	// credit to PrototypeJs for these regular expressions
	// Note, it's possible to use dom to strip tags using innerHtml/innerText tricks
	// but dom executes html so this is unsecure. In addition entities are converted to tags
	_scriptsRe: new RegExp("<script[^>]*>([\\S\\s]*?)<\/script>", "gim"),
	_tagsRe: new RegExp(/<\w+(\s+("[^"]*"|'[^']*'|[^>])+)?>|<\/\w+>/gi),
	removeHtml: function(inHtml) {
		var t = inHtml.replace(enyo.string._scriptsRe, "").replace(enyo.string._tagsRe, "");
		// just to be sure, escape any html we may have missed.
		return enyo.string.escapeHtml(t);
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
