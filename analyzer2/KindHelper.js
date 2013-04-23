/**
 * Helper kind to get the interesting informations such as
 * published properties, events, ... from the output
 * of the analyzer for a specific kind.
 *
 * First, call setDefinition() to pass the data object
 * retrieved thru analyzer.Indexer.findByName().
 */
enyo.kind({
	name: "analyzer.Analyzer.KindHelper",
	kind: "enyo.Component",
	published: {
		definition: null
	},
	/**
	 * Validate that the definition was correctly set
	 * @throws an exception if the {definition} is not set
	 * @protected
	 */
	checkDefAvail: function() {
		if ( ! this.definition) {
			throw "No definition provided";
		}
	},
	/**
	 * List the events of the kind
	 * @return a list of the event names
	 */
	getEvents: function() {
		this.checkDefAvail();
		var events = [];

		var obj = this.definition.properties;
		for (var i=0; i<obj.length; i++) {
			if (obj[i].token === "events") {
				var p = obj[i].value[0].properties;
				for (var j=0; j < p.length; j++) {
					var name = p[j].name;
					events.push(name);
				}
			}
		}
		return events;
	},
	/**
	 * List the published properties of the kind
	 * @return a list of the published property names
	 * properties
	 */
	getPublished: function() {
		this.checkDefAvail();
		var published = [];

		var obj = this.definition.properties;
		for (var i=0; i<obj.length; i++) {
			if (obj[i].token === "published") {
				var p = obj[i].value[0].properties;
				for (var j=0; j < p.length; j++) {
					var name = p[j].name;
					published.push(name);
				}
			}
		}
		return published;
	}
});