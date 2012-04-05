//* Documentor converts parser output into a collection of documentation objects suitable for formatting.
enyo.kind({
	name: "enyo.Documentor",
	kind: null,
	// matches "/** [multi-line comment] */" and "//* single line comment"
	commentRx: /\/\*\*([\s\S]*)\*\/|\/\/\*(.*)/m,
	constructor: function (inSource) {
		this.cook(new enyo.parser.Js(new enyo.lexer.Js(inSource)));
	},
	cook: function(inParser) {
		this.results = this.cookNodes(inParser.nodes);
	},
	cookNodes: function (inNodes, inResult) {
		// primitive iterator
		var list = {
			i: 0,
			nodes: inNodes,
			comment: [],
			// starting a documentation context, default context is 'public'
			group: "public",
			// create a fresh repository, unless one was passed in
			result: inResult || {objects: []}
		};
		// traverse the list
		for (var fn; (list.node = list.nodes[list.i]); list.i++) {
			fn = "cook_" + list.node.kind;
			if (this[fn]) {
				this[fn](list);
			}
		}
		// assemble comments
		if (list.comment.length) {
			list.result.comment = this.consumeComment(list.comment);
			//console.log(result.comment);
		}
		return list.result;
	},
	// closure pattern, i.e.
	// 		(function(){ ... })();
	cook_association: function(inList) {
		var nodes = inList.node.children;
		// describes a closure?
		if (nodes.length==3 && nodes[0].token == "function" && nodes[2].kind == "block") {
			// document the closure body as if it were top level
			this.cookNodes(nodes[2].children, inList.result);
		}
	},
	// assignment patterns or enyo.kind call
	cook_identifier: function(inList) {
		var list = inList, n$ = list.nodes;
		if (n$[list.i+1] && n$[list.i+1].kind == "assignment") {
			this.cook_assignment(inList);
		} else if (list.node.token=="enyo.kind") {
			list.result.objects.push(this.makeKind(n$[++list.i].children, list.comment, list.group));
		}
	},
	// assignment patterns, i.e.
	// 		[identifier][=|:][block|function]
	cook_assignment: function(inList) {
		var list = inList, n$ = list.nodes, obj;
		// skip operator
		list.i++;
		// process block or function values
		if (n$[++list.i].kind=="block") {
			obj = this.makeObject(list.node.token, n$[list.i].children, list.comment, list.group);
		} else if (n$[list.i].token=="function") {
			obj = this.makeFunction(list.node.token, n$[list.i+1], list.comment, list.group);
		}
		if (obj) {
			list.result.objects.push(obj);
		}
	},
	// comment patterns, i.e.
	// 		/* ... */
	// 		// ...\n
	cook_comment: function(inList) {
		var list = inList;
		//console.log(n.token);
		var m = list.node.token.match(this.commentRx);
		if (m) {
			m = m[1] ? m[1] : m[2]; // + "\n";
			var p = this.extractPragmas(m);
			// need to avoid pushing empty strings if they are the result of removing pragmas,
			// so extractPragmas returns null in this case
			if (p.result != null) {
				list.comment.push(p.result);
			}
			list.group = p.group || list.group;
		}
	},
	consumeComment: function(inComment) {
		if (!inComment || !inComment.length) {
			return "";
		}
		var comment = inComment.join(" ");
		// clear inComment
		inComment.splice(0);
		// Remove leading indent from comment
		// so markdown spacing is intact.
		// Assumes first non-empty line in comment is block-left.
		var indent = 0;
		var lines = comment.split(/\r?\n/);
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
	},
	makeFunction: function(inName, inArgs, inComment, inGroup) {
		return {
			type: 'function',
			comment: this.consumeComment(inComment),
			group: inGroup,
			name: inName,
			args: this.composeAssociation(inArgs)
		};
	},
	makeKind: function(inNodes, inComment, inGroup) {
		var o = this.makeThing('kind', inNodes[0].children, inComment, inGroup);
		var p$ = o.properties;
		var promote = function(name, newName) {
			for (var i=0, p; p=p$[i]; i++) {
				if (p.name == name) {
					if (typeof p.value == "string") {
						p.value = stripQuotes(p.value);
					}
					o[newName || name] = p;
					p$.splice(i, 1);
					break;
				}
			}
		}
		//
		promote("name");
		promote("kind");
		//promote(map.isa ? "isa" : "kind", "kind");
		promote("published");
		//promote("events");
		//promote("components");
		//
		//delete map.chrome;
		//delete map.components;
		//
		//console.dir(o);
		return o;
	},
	makeObject: function(inName, inNodes, inComment, inGroup) {
		var o = this.makeThing('object', inNodes, inComment, inGroup);
		o.name = inName;
		return o;
	},
	makeThing: function (inType, inNodes, inComment, inGroup) {
		var obj = {
			type: inType,
			comment: this.consumeComment(inComment),
			group: inGroup,
			properties: this.parseProperties(inNodes)
		};
		/*
		var obj = this.parseProperties(inNodes);
		obj.type = inType;
		obj.comment = this.consumeComment(inComment);
		obj.group = inGroup;
		*/
		return obj;
	},
	extractPragmas: function(inString) {
		var pragmaRx = /^[*\s]*@[\S\s]*/g;
		var groups = {protected: 1, public: 1}, group;
		var pragmas = [];
		var s = inString;
		if (s.length) {
			s = inString.replace(pragmaRx, function(m) {
				var p = m.slice(2);
				//console.log("found pragma: [" + p + "]");
				pragmas.push(p);
				if (groups[p]) {
					//console.log(p);
					group = p;
				}
				return "";
			});
			// if removing pragmas has left this block empty
			// then we should return 'no string' as opposed
			// to 'empty string'
			if (!s.length) {
				s = null;
			}
		}
		return {result: s, pragmas: pragmas, group: group};
	},
	parseProperties: function(inNodes) {
		/*
		var props = { names: [], map: {} };
		var methods = { names: [], map: {} };
		var result = { properties: props, methods: methods };
		*/
		//
		var result = [];
		//
		if (!inNodes) {
			return result;
		}
		//
		var list = {
			props: inNodes,
			i: 0,
			group: 'public',
			comment: []
		};
		//
		// iterate through list
		for (var p, pt; (p=list.props[list.i]); list.i++) {
			// if we have a comment then establish the method group or push the ($) comment
			if (p.kind == 'comment') {
				this.parse_comment(list);
			}
			// otherwise grab the "name: value" pair
			else {
				var item = {
					name: p.token,
					comment: this.consumeComment(list.comment),
					group: list.group
				};
				//list.comment = [];
				// jump ":"
				list.i++;
				// expr
				list.peek = list.props[++list.i];
				//
				var value = enyo.mixin(this.parseValue(list), item);
				if (value["function"]) {
					value.method = true;
				} else {
					value.property = true;
				}
				result.push(value);
			}
		}
		return result;
	},
	parseValue: function(inList) {
		var fn = "parse_" + inList.peek.kind;
		return this[fn] ? this[fn](inList) : this.parse_default(inList);
	},
	parse_block: function(inList) {
		return {
			value: this.parseProperties(inList.peek.children)
			//value: this.textify(inList.peek)
		}
	},
	parse_array: function(inList) {
		var item = {
			value: this.parseValues(inList.props[inList.i].children)
		}
		//console.dir(item.value);
		return item;
	},
	parse_default: function(inList) {
		var peek = inList.props[inList.i];
		// expression
		var item = {
			value: peek && peek.token
		};
		// expression arguments
		peek = inList.props[inList.i+1];
		if (peek && peek.kind == "argument-list") {
			inList.i++;
			item.value += "(" + this.composeAssociation(peek) + ")";
		}
		//
		return item;
	},
	parse_comment: function(inList) {
		var m = inList.props[inList.i].token.match(this.commentRx);
		if (m) {
			m = m[1] || m[2];
			var p = this.extractPragmas(m);
			// need to avoid pushing empty strings if they
			// are the result of removing pragmas, so extract
			// pragma returns null in this case
			if (p.result != null) {
				inList.comment.push(p.result);
			}
			inList.group = p.group || inList.group;
		}
	},
	parse_keyword: function(inList) {
		if (inList.peek.token == "function") {
			return this.parse_function(inList);
		}
		return this.parse_default(inList);
	},
	parse_function: function(inList) {
		return {
			"function": true,
			args: this.composeAssociation(inList.props[++inList.i]),
			body: inList.props[++inList.i]
		};
	},
	parseValues: function (/*inClass,*/ inProps) {
		var result = [];
		//
		if (!inProps) {
			return result;
		}
		//
		var list = {
			props: inProps,
			i: 0,
			group: 'public',
			comment: []
		};
		//
		// iterate through list
		for (var p, pt; (p=list.props[list.i]); list.i++) {
			list.peek = p;
			// if we have a comment then establish the method group or push the ($) comment
			if (p.kind == 'comment') {
				this.parse_comment(list);
			// otherwise grab value
			} else {
				var item = {
					//name: p.token,
					//comment: this.consumeComment(list.comment),
					//group: list.group
				};
				var value = enyo.mixin(this.parseValue(list), item);
				result.push(value);
			}
		}
		//
		return result;
	},
	//
	textify: function(inNode) {
		switch(inNode.kind) {
			case "comment":
				return "";
			case "array": 
				return "[" + this.composeList(inNode) + "]";
				return;
			case "block":
				return "{" + this.composeList(inNode) + "}";
			default:
				return inNode.token + this.textifyChildren(inNode.children);
		}
	},
	textifyChildren: function(inChildren) {
		var h = "";
		if (inChildren) {
			for (var i=0, n; (n = inChildren[i]); i++) {
				h += this.textify(n);
			}
		}
		return h;
	},
	composeList: function(inNode) {
		var e = [];
		for (var i = 0, n; (n = inNode.children[i]); i++) {
			e.push(this.textify(n));
		}
		return e.join(', ');
	},
	composeAssociation: function(inNode) {
		if (inNode.children) {
			var e = [];
			for (var i = 0, n; (n = inNode.children[i]); i++)
				if (n.kind != 'comment') {
					e.push(n.token);
				}
			return e.join(', ');
		}
		return inNode.token;
	}
});

stripQuotes = function(inString) {
	var c0 = inString.charAt(0);
	if (c0 == '"' || c0 == "'") {
		inString = inString.substring(1);
	}
	var l = inString.length - 1, cl = inString.charAt(l);
	if (cl == '"' || cl == "'") {
		inString = inString.substr(0, l);
	}
	return inString;
};