enyo.kind({
	name: "Analyzer.KindHelper",
	kind: "enyo.Component",
	published: {
		definition: null
	},
	getEvents: function() {
		var events = [];
		if (this.definition !== undefined) {

			obj = this.definition.properties;
			for (i=0; i<obj.length; i++) {
				if (obj[i].token === "events") {
					p = obj[i].value[0].properties;
					for (var j=0; j < p.length; j++) {
						var name = p[j].name;
						events[name] = "";
					}
				}
			}
		}
		return events;
	},
	getPublished: function() {
		var published = {};
		if (this.definition !== undefined) {

			obj = this.definition.properties;
			for (i=0; i<obj.length; i++) {
				if (obj[i].token === "published") {
					p = obj[i].value[0].properties;
					for (var j=0; j < p.length; j++) {
						var name = p[j].name;
						published[name] = "";
					}
				}
			}
		}
		return published;
	}
});