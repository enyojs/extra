enyo.kind({
	name: "Parser",
	kind: null,
	constructor: function(inTokens) {
		return this.parse(inTokens);
	},
	parse: function(inTokens) {
		var it = new Iterator(inTokens);
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
		while (it.next()) {
			var node = it.value;
			if (node.kind == "ws") {
				continue;
			}
			//
			else if (inState == "array") {
				// we consumed a token to get here, but we want it to be part of 'expression', so we put it back
				it.prev();
				// we collect each element as an object
				node = {
					kind: "element",
					token: "expr",
					children: this.walk(it, "expression")
				}
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
				node.children = this.walk(it, node.kind);
			}
			//
			// terminals (; or ,)
			else if (node.kind == "terminal" && (inState == "expression" || inState == "var")) {
				/*
				if (nodes && nodes[0] && nodes[0].kind !== "block") {
					// concat node tokens for a non-block expression
					node = nodes[0];
					node.token = this.combine(nodes);
					nodes = [node];
				}
				*/
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
			else if (inState == "expression" && node.token == "}") {
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
					if (it.value.kind == "terminal") {
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
		return nodes;
	}
});