enyo.kind({
	name: "Parser",
	kind: "AnalyzerDebug",
	constructor: function(inTokens) {
		// Debug mode is off by default. Could be dynamically turn on by calling AnalyzerDebug._debugEnabled = true;
		this.debug = AnalyzerDebug._debugEnabled;
		return this.parse(inTokens);
	},
	parse: function(inTokens) {
		// remove ws for easier debugging
		var tokens = [];
		var it = new Iterator(inTokens);
		while (it.next()) {
			if (it.value.kind !== "ws") {
				tokens.push(it.value);
			}
		}
		// parse the token stream
		var it = new Iterator(tokens);
		return this.walk(it);
	},
	combine: function(inNodes) {
		var r = '';
		for (var i=0, n; n=inNodes[i]; i++) {
			r += n.token;
		}
		return r;
	},
	walk: function(it, inState) {
		if (this.debug) this.logMethodEntry(it, "inState " + inState + " >>" + JSON.stringify(it.value) + "<<");
		var nodes = [], node;
		try {
			while (it.next()) {
				node = it.value;
				if (this.debug) this.logProcessing(it, node);
				//
				if (node.kind == "ws") {
					continue;
				}
				else if (node.kind == "comment") {
					node.kind = "comment";
				}
				//
				else if (inState == "array") {
					if (node.kind == "terminal") {
						continue;
					}
					// we haven't actually used it.value yet, but we are about to initiate another walk, which will advance the stream pointer
					// put it.value back so we don't lose it
					it.prev();
					// we collect each element as an object
					node = {
						kind: "element",
						token: "expr",
						children: this.walk(it, "expression")
					};
					// if the token that terminated the expression was a ']', close the array
					if (it.value && it.value.token == "]") {
						if (node.children.length) { // only push the node if it's got children
							nodes.push(node);
						}
						if (this.debug) this.logMethodExit(it);
						return nodes;
					}
				}
				else if (node.token == "[") {
					node.kind = "array";
					node.children = this.walk(it, node.kind);
					if (it.value) {
						node.end = it.value.end;
					} else {
						console.log("No end token for array?");
					}
				}
				else if (inState == "expression" && node.token == "]") {
					if (this.debug) this.logMethodExit(it);
					return nodes;
				}
				//
				else if (node.token == "var") {
					node.kind = "var";
					node.children = this.walk(it, "expression");
				}
				//
				// terminals (; or ,)
				else if (node.kind == "terminal" && (inState == "expression" || inState == "var")) {
					if (this.debug) this.logMethodExit(it);
					return nodes;
				} 
				else if (node.kind == "terminal") {
					continue;
				}
				//
				// block
				else if (node.token == "{") {
					node.kind = "block";
					if (this.debug) this.logIterMsg(it, "PROCESS BLOCK - START");
					node.children = this.walk(it, node.kind);
					if (this.debug) this.logIterMsg(it, "PROCESS BLOCK - END");					
					if (it.value) {
						node.end = it.value.end;
					} else {
						console.log("No end token for block?");
					}
					if (inState == "expression" || inState == "function") {
						// a block terminates an expression
						nodes.push(node);
						if (this.debug) this.logMethodExit(it);
						return nodes;
					}
				}
				// close block during expression processing
				else if (inState == "expression" && (node.token == "}" || node.token == ")")) {
					// put the token back so the calling context can use it
					it.prev();
					if (this.debug) this.logMethodExit(it);
					return nodes;
				}
				// close block during block processing
				else if (inState == "block" && node.token == "}") {
					if (this.debug) this.logMethodExit(it);
					return nodes;
				}
				//
				// assignment
				else if (node.token == "=" || (node.token == ":" && inState != "expression")) {
					var prev = nodes.pop();
					if (prev.kind == "identifier") {
						prev.op = node.token;
						prev.kind = "assignment";
						prev.children = this.walk(it, "expression");
						// if our expression hit a terminal, don't consume it
						if (it.value && it.value.kind == "terminal") {
							it.prev();
						}
						node = prev;
					} else {
						nodes.push(prev);
					}
				}
				// association
				else if (node.token == "(") {
					node.kind = "association";
					node.children = this.walk(it, node.kind);
				} 
				else if (inState == "association" && node.token == ")") {
					if (this.debug) this.logMethodExit(it);
					return nodes;
				}
				// function keyword
				else if (node.token == "function") {
					node.kind = "function";
					if (this.debug) this.logIterMsg(it, "PROCESS FUNCTION - START");
					node.children = this.walk(it, node.kind);
					// if we are not processing an expression, this is an anonymous function or it is using "C-style" naming syntax
					// "function <name>(){..}"
					if (inState !== "expression" && node.children && node.children.length && node.children[0].kind == "identifier") {
						if (this.debug) this.logIterMsg(it, "C-Style function");
						// tag the function with a name property
						node.name = node.children[0].token;
						node.children.shift();
						// optionally convert this function to be an assignment node in the AST
						var neo = {
							kind: "assignment",
							token: node.name,
							children: [node]
						};
						node = neo;
					}
					if (inState == "expression" || inState == "function") {
						// a function terminates an expression
						nodes.push(node);
						if (this.debug) this.logMethodExit(it);
						return nodes;
					}
				}
				if (this.debug) this.logIterMsg(it, "PUSH NODE");
				nodes.push(node);
			}
		} catch(x) {
			console.error(x);
		}
		if (this.debug) this.logMethodExit(it);
		return nodes;
	}
});