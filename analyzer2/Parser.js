enyo.kind({
	name: "Parser",
	kind: null,
	constructor: function(inTokens) {
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
		var nodes = [], node;
		try {
			while (it.next()) {
				node = it.value;
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
						nodes.push(node);
						return nodes;
					}
				}
				else if (node.token == "[") {
					node.kind = "array";
					node.children = this.walk(it, node.kind);
				}
				else if (inState == "expression" && node.token == "]") {
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
					return nodes;
				} 
				else if (node.kind == "terminal") {
					continue;
				}
				//
				// block
				else if (node.token == "{") {
					node.kind = "block";
					node.children = this.walk(it, node.kind);
					if (inState == "expression" || inState == "function") {
						// a block terminates an expression
						nodes.push(node);
						return nodes;
					}
				}
				// close block during expression processing
				else if (inState == "expression" && (node.token == "}" || node.token == ")")) {
					// put the token back so the calling context can use it
					it.prev();
					return nodes;
				}
				// close block during block processing
				else if (inState == "block" && node.token == "}") {
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
					return nodes;
				}
				// function keyword
				else if (node.token == "function") {
					node.kind = "function";
					node.children = this.walk(it, node.kind);
					// if we are not processing an expression, this is an anonymous function or it is using "C-style" naming syntax
					// "function <name>(){..}"
					if (inState !== "expression" && node.children && node.children.length && node.children[0].kind == "identifier") {
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
						return nodes;
					}
				}
				nodes.push(node);
			}
		} catch(x) {
			console.error(x);
		}
		return nodes;
	}
});