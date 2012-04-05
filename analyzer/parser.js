//* @protected
enyo.kind({
	name: "enyo.parser.Base", 
	kind: null,
	i: 0,
	constructor: function(inLexer) {
		this.a = [];
		this.html = [];
		this.lastToken = {};
		this.nodes = inLexer && this.parse(inLexer.r);
	},
	// return node-list generated from lexer tokens
	parse: function(inTokens) {
		// setup token stream
		this.setTokens(inTokens);
		// process tokens into AST nodes
		var nodes = this.processTokens();
		// make a sentinel node
		var sentinel = {children: nodes.slice(0)};
		// index the children and refer them back to parent
		this.catalog(sentinel, sentinel.children);
		// return node list
		return nodes;
	},
	// prepare the token stream for iteration
	setTokens: function(inTokens) {
		// current index in the stream
		this.i = 0;
		// source tokens
		this.tokens = inTokens;
	},
	// index entries in inChildren, and refer them back to inParent
	catalog: function(inParent, inChildren) {
		for (var i=0, n; n=inChildren[i]; i++) {
			n.index = i;
			n.parent = inParent;
		}
	},
	// return the next token from the token stream
	next: function() {
		return this.tokens[this.i++];
	},
	// push a token onto the accumulator stack
	pushToken: function(inT) {
		//console.log("[" + inT.token + "]");
		this.a.push(inT);
	}
});

/*
	This ad-hoc processor is barely a parser, it does minimal work taking
	a token stream from an enyo.lexer and converting it into a node stream.

	Mostly, the task is to collect grouped tokens into subnodes, namely:
	associations "()", blocks "{}", and arrays "[]"

	Whitespace is discarded.
*/
enyo.kind({
	name: "enyo.parser.Code",
	kind: enyo.parser.Base,
	// process tokens into nodes
	processTokens: function() {
		// code is the output array
		var mt, t, code = [];
		// mt is the current 'meta-token'
		while (mt = this.next()) {
			// actual text is stored in unfortunately named 'token' property
			t = mt.token;
			// whitespace is ignored
			if (mt.kind == "ws") {
				continue;
			}
			// literal: push a node
			else if (mt.kind == "literal") {
				this.pushNode(code, mt.kind, mt, mt.delimiter);
			} 
			// string: push a node
			else if (mt.kind == "string") {
				this.pushNode(code, mt.kind, mt);
			}
			// comment|keyword
			else if (mt.kind == "comment" || mt.kind=="keyword") {
				// push any accumulated tokens as an 'identifier'
				this.identifier(code);
				// push a node
				this.pushNode(code, mt.kind, mt);
			}
			//
			// assignment
			else if (t == '=' || t == ':') { 
				// push any accumulated tokens as an 'identifier'
				this.identifier(code);
				// push an assignment node
				this.pushNode(code, "assignment", mt);
			}
			// terminal
			else if (t == ';' || t == ',') {
				// push any accumulated tokens as an 'identifier'
				this.identifier(code);
			}
			//
			// array start
			else if (t == '[') {
				this.processChildren("array", code);
			}
			// array end
			else if (t == ']') {
				this.lastToken = mt;
				return this.identifier(code);
			}
			//
			// block start
			else if (t == '{') {
				this.processChildren("block", code);
			}
			// block end
			else if (t == '}') {
				this.lastToken = mt;
				return this.identifier(code);
			}
			//
			// association start
			else if (t == '(') {
				var kind = (this.lastToken.kind == "identifier" || this.lastToken.token == "function") ? "argument-list" : "association";
				this.processChildren(kind, code);
			}
			// association end
			else if (t == ')') {
				this.lastToken = mt;
				return this.identifier(code);
			}
			//
			else this.pushToken(mt);
			this.lastToken = mt;
		}
		return code;
	},
	pushNode: function(inCode, inKind, inToken, inDelim) {
		var token = this.a.map(function(t){ return t.token; }).join('');
		token += (inToken ? inToken.token : '') + (inDelim||'');
		//
		if (arguments.length > 2) {
			this.a.push(inToken);
		}
		//
		var start, end, line, height;
		if (inToken) {
			start = inToken.start;
			end = inToken.end;
			line = inToken.line;
			height = inToken.height;
		} else if (this.a.length) {
			var first = this.a[0], last = this.a[this.a.length - 1];
			start = first.start;
			end = last.end;
			line = first.line;
			height = last.line - first.line;
		} else { // this.identifier was called to end a block/array/arg list/association, is 1 character token
			var curTok = this.tokens[this.i - 1];
			start = curTok.start;
			end = curTok.end;
			line = curTok.line;
			height = curTok.height;
		}
		//
		var node = { kind: inKind, tokens: this.a, token: token, start: start, end: end, line: line, height: height };
		inCode.push(node);
		//
		this.a = [];
		//
		return node
	},
	identifier: function(inCode) {
		if (this.a.length) {
			this.pushNode(inCode, 'identifier');
		}
		return inCode;
	},
	processChildren: function(inKind, inCode) {
		this.identifier(inCode);
		this.findChildren(this.pushNode(inCode, inKind));
	},
	findChildren: function(inNode) {
		var children = this.processTokens();
		// index the children and refer them back to parent
		this.catalog(inNode, children);
		// update node with correct end/height
		inNode.children = children;
		inNode.end = this.lastToken.end;
		inNode.height = this.lastToken.line - inNode.line;
	}
});

enyo.parser.Js = enyo.parser.Code;

enyo.kind({
	name: "enyo.parser.Text",
	kind: enyo.parser.Base,
	pushLine: function(inT) {
		(arguments.length)&&(this.a.push(inT));
		this.html.push('<span>', this.a.join("&middot;"), "</span><br />");
		this.a = [ ];
	},
	processParams: function(inToken) {
		this.pushToken(this.lastToken.kind != "symbol" ? "[arguments|params]" : "[ternary op]");
		this.pushToken(inToken);
		this.processTokens();
	},
	processTokens: function() {
		var mt, t;
		while (mt = this.next()) {
			t = mt.token;
			if (mt.kind == "ws")
				continue;
			else if (t == ";")
				this.pushLine(t);
			else if (t == '{')
				this.pushLine(t + "<blockquote>");
			else if (t == '}')
				this.pushLine("</blockquote>" + t);
			else if (t == '(')
				this.processParams(t);
			else if (t == ')') {
				this.pushToken(t);
				return;
			} else this.pushToken(t);
			this.lastToken = mt;
		}
		return this.html.join("");
	}
});
