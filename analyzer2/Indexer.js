enyo.kind({
	name: "Indexer",
	kind: null,
	group: "public",
	constructor: function() {
	},
	add: function(inObjects) {
		enyo.forEach(inObjects, this.addObject, this);
	},
	addObject: function(inObject) {
		switch (inObject.type) {
			case "kind":
				this.indexKind(inObject);
				break;
		}
	},
	indexKind: function(o) {
		// append published properties to main property list
		var i = Documentor.indexByName(o.properties, "published");
		if (i >= 0) {
			var pp = o.properties[i];
			o.properties.splice(i, 1);
			pp = pp.value && pp.value[0] && pp.value[0].properties;
			for (var i=0, p; p = pp[i]; i++) {
				p.published = true;
				o.properties.push(p);
			}
		}
	}
});