/*
var Iterator = enyo.kind({
	kind: null,
	constructor: function(inNodes) {
		this.i = -1,
		this.nodes = inNodes;
	},
	next: function() {
		this.i++;
		return this.read();
	},
	read: function() {
		this.prev = this.nodes[this.i - 1];
		this.next = this.nodes[this.i + 1];
		return this.node = this.nodes[this.i];
	}
});
*/

enyo.kind({
	name: "Processor",
	kind: null,
	i: 0,
	nodes: null,
	constructor: function(inNodes) {
		if (inNodes) {
			return this.process(inNodes);
		}
	},
	process: function(inNodes) {
		return this.iterate(this.iterator(inNodes));
	},
	iterator: function(inNodes) {
		return {
			i: -1,
			nodes: inNodes,
			result: []
		};
	},
	next: function(inIt) {
		inIt.i++;
		return this._read(inIt);
	},
	_read: function(inIt) {
		inIt.prev = inIt.nodes[inIt.i - 1];
		inIt.next = inIt.nodes[inIt.i + 1];
		return inIt.node = inIt.nodes[inIt.i];
	}
});

enyo.kind({
	name: "DocParser",
	kind: "Processor",
	group: "public",
	comment: null,
	result: null,
	process: function(inNodes) {
		this.comment = [];
		return this.inherited(arguments);
	},
	iterate: function(inIt) {
		while (this.next(inIt)) {
			this.cook(inIt);
		}
		return inIt.result;
	},
	cook: function(inIt) {
		if (inIt.node) {
			var fn = "cook_" + inIt.node.kind;
			if (this[fn]) {
				this[fn](inIt);
			}
		} else {
			console.warn("DocParser is confused, cook called with empty node");
		}
	},
	//
	// matches "/** [multi-line comment] */" and "//* single line comment"
	commentRx: /\/\*\*([\s\S]*)\*\/|\/\/\*(.*)/m,
	// comments that match a special format are instructions for this parser
	// * some are pragmas are read and acted on
	// * other comments are collected and attached to the next emitted node
	cook_comment: function(inIt) {
		var m = inIt.node.token.match(this.commentRx);
		if (m) {
			m = m[1] ? m[1] : m[2]; 
			// separate pragmas from doc comments
			var p = this.extractPragmas(m);
			// act on pragmas
			this.honorPragmas(p);
		}
	},
	extractPragmas: function(inString) {
		var pragmaRx = /^[*\s]*@[\S\s]*/g,
			pragmas = [],
			s = inString;
		if (s.length) {
			s = inString.replace(pragmaRx, function(m) {
				var p = m.slice(2);
				//console.log("found pragma: [" + p + "]");
				pragmas.push(p);
				return "";
			});
			// if there is non-pragma content left, add it to comments
			if (s.length) {
				this.comment.push(s);
			}
		}
		return pragmas;
	},
	honorPragmas: function(inPragmas) {
		var groups = {protected: 1, public: 1};
		for (var i=0, p; p=inPragmas[i]; i++) {
			if (groups[p]) {
				//console.log(p);
				this.group = p;
			}
		}
	},
	cook_block: function(inIt) {
		var node = this.make("object", inIt.node);
		var it =  this.iterator(inIt.node.children);
		node.children = this.cook_object(it);
		inIt.result.push(node);
	},
	cook_identifier: function(inIt) {
		// kind definition
		if (inIt.node.token == "enyo.kind") {
			return this.cook_id_kind(inIt);
		}
		// other function evaluation <id><argument-list>
		if (inIt.next && inIt.next.kind == "argument-list") {
			// skip argument-list
			this.next(inIt);
		}
		inIt.result.push(this.make("id", inIt.node));
	},
	cook_id_kind: function(inIt) { // enyo.kind(<{...}>)
		// make kind node
		var node = this.make("kind", inIt.node);
		// next node is the argument-list 
		this.next(inIt);
		// the first argument
		var arg = inIt.node.children[0];
		// if the argument is a block
		if (arg.kind == "block") {
			// iterate over the properties
			var it =  this.iterator(arg.children);
			node.children = this.cook_object(it);
		}
		inIt.result.push(node);
	},
	cook_object: function(inIt) {
		while (this.next(inIt)) {
			this.cook_property(inIt);
		}
		return inIt.result;
	},
	cook_property: function(inIt) {
		// name
		var node = this.make("property", inIt.node);
		// :
		this.next(inIt);
		// value
		this.next(inIt);
		// process value
		var cache = inIt.result;
		inIt.result = [];
		this.cook(inIt);
		node.children = inIt.result;
		inIt.result = cache;
		// emit node
		inIt.result.push(node);
	},
	cook_keyword: function(inIt) {
		switch (inIt.node.token) {
			case "if": // if (expr) stmt
				// skip association "(expr)"
				this.next(inIt);
				// if 'stmt' is a 'block', process it
				this.iterateBlock(inIt);
				break;
			case "else": // else stmt
				// if 'stmt' is a 'block', process it
				this.iterateBlock(inIt);
				break;
			case "function": // function <id>(arg-list) block
				// make function node
				var node = this.make(inIt.node.token, inIt.node);
				// skip optional function identifier 
				if (inIt.next && inIt.next.kind == "identifier") {
					this.next(inIt);
				}
				// process arguments-list
				this.next(inIt);
				var results = this.iterate(this.iterator(inIt.node.children));
				// embed results in function node
				node.children = results;
				// skip body
				this.next(inIt);
				// emit the node
				inIt.result.push(node);
				break;
		}
	},
	iterateBlock: function(inIt) {
		if (inIt.next && inIt.next.kind == "block") {
			this.next(inIt);
			// iterate over the children, add the results to our result stream
			inIt.result = inIt.result.concat(this.iterate(this.iterator(inIt.node.children)));
		}
	},
	//
	make: function(inType, inNode) {
		return {
			group: this.group,
			comment: this.consumeComment(),
			kind: inType,
			node: inNode,
			token: inNode.token
		};
	},
	consumeComment: function() {
		var comment = this.comment.join(" ");
		// clear Comment
		this.comment = [];
		// Remove leading indent so markdown spacing is intact.
		// Assumes first non-empty line in comment is block-left.
		return enyo.string.removeIndent(comment);
	}
});

// Remove leading indent so markdown spacing is intact.
// Assumes first non-empty line in comment is block-left.
enyo.string.removeIndent = function(inString) {
	var indent = 0;
	var lines = inString.split(/\r?\n/);
	for (var i=0, l; (l=lines[i]) != null; i++) {
		if (l.length > 0) {
			indent = l.search(/\S/);
			if (indent < 0) {
				indent = l.length;
			}
			break;
		}
	}
	if (indent) {
		for (var i=0, l; (l=lines[i]) != null; i++) {
			lines[i] = l.slice(indent);
		}
	}
	return lines.join("\n");
};
