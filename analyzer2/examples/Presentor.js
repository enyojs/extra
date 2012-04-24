enyo.kind({
	name: "Presentor",
	kind: null,
	getByType: function(inObjects, inType) {
		var result = [];
		for (var i=0, o; o=inObjects[i]; i++) {
			if (o.type == inType) {
				result.push(o);
			}
		}
		return result;
	},
	document: function(inCode) {
		var tokens = new Lexer(inCode);
		var nodes = new Parser(tokens);
		var objects = new Documentor(nodes);
		return this.presentObjects(objects);
	},
	presentObjects: function(inObjects) {
		var html = '';
		var w = function(h) { html += h; };
		//
		w("<h3>Kinds</h3>");
		var objs = this.getByType(inObjects, "kind");
		for (var i=0, o; o=objs[i]; i++) {
			if (o.comment) {
				html += "<comment>" + o.comment + "</comment>";
			}
			w("<i>name:</i> <label>" + o.name + "</label><br/>");
			w("<blockquote>" + this.presentKind(o) + "</blockquote>");
		}
		w("<h3>Functions</h3>");
		var objs = this.getByType(inObjects, "function");
		for (var i=0, o; o=objs[i]; i++) {
			if (o.comment) {
				html += "<comment>" + o.comment + "</comment>";
			}
			if (o.group) {
				html += "<" + o.group + ">" + o.group + "</" + o.group  + ">";
			}
			w("<i>name:</i> <label>" + o.name + "</label><br/>");
		}
		w("<h3>Variables</h3>");
		var objs = this.getByType(inObjects, "global");
		for (var i=0, o; o=objs[i]; i++) {
			if (o.comment) {
				html += "<comment>" + o.comment + "</comment>";
			}
			if (o.group) {
				html += "<" + o.group + ">" + o.group + "</" + o.group  + ">";
			}
			w("<i>name:</i> <label>" + o.name + "</label><br/>");
		}
		//
		return html;
	},
	presentKind: function(inKind) {
		console.log("kind: ", inKind);
		return "<h3>Properties</h3>"
			+ this.presentBlock(inKind)
			;
	},
	presentBlock: function(inObject) {
		var html = '';
		var props = inObject.properties;
		for (var i=0, p; p=props[i]; i++) {
			html += this.presentProperty(p);
		}
		return html;
	},
	presentArray: function(inObject) {
		console.log("array: ", inObject);
		var html = '';
		var props = inObject.properties;
		for (var i=0, p; p=props[i]; i++) {
			html += '<i>' + i + '</i>: ' + this.presentExpression(p);
		}
		return html;
	},
	presentProperty: function(inProperty) {
		var o = inProperty;
		//
		var html = '';
		var w = function(h) { html += h; };
		//
		if (o.comment) {
			html += "<comment>" + o.comment + "</comment>";
		}
		if (o.group) {
			html += "<" + o.group + ">" + o.group + "</" + o.group  + ">";
		}
		if (o.value && o.value[0] && o.value[0].token == "function") {
			w("<label>" + o.name + "</label>: function()<br/>");
		} else {
			w("<label>" + o.name + "</label>: ");
			w(this.presentValue(o));
			//w("<br/>");
		}
		//
		return html;
	},
	presentValue: function(inValue) {
		//console.log("value: ", inValue);
		var o = inValue.value;
		if (!o || !o[0]) {
			return inValue.token + "</br>";
		}
		return this.presentExpression(o[0]);
	},
	presentExpression: function(inObject) {
		//console.log("expr: ", inObject);
		var o = inObject;
		if (o.comment) {
			html += "<comment>" + o.comment + "</comment>";
		}
		if (o.type == "block") {
			return "<blockquote>" + this.presentBlock(o) + "</blockquote>";
		}
		if (o.type == "array") {
			return "<blockquote>" + this.presentArray(o) + "</blockquote>";
		}
		return o.token + "<br/>";
	}
});
