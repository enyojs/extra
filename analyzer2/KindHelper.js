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
	 * @public
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
	 * @public
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
	},
		/**
	 * List the functions of the kind
	 * @return a list of functions names
	 * properties
	 * @public
	 */
	getFunctions: function() {
		this.checkDefAvail();
		var functions = [];
		
		var obj = this.definition.properties;
		for (var i=0; i<obj.length; i++) {
			var p = obj[i];
			if (p.value[0].name === 'function') {
				functions.push(p.name);
			}
		}
		return functions;
	},
	/**
	 * Lists the handler methods mentioned in the "handlers"
	 * attributes and in the sub-components of the kind object
	 * previously defined
	 * NB: doXXXX() methods are not listed.
	 * @param declared: list of handler methods already listed
	 * @returns the list of declared handler methods
	 * @public
	 */
	listHandlers: function(declared) {
		this.checkDefAvail();
		var object = this.definition;
		declared = this.listDeclaredComponentsHandlers(object.components, declared);
		for(var i = 0; i < object.properties.length; i++) {
			var p = object.properties[i];
			if (p.name === 'handlers') {
				for(var j = 0; i < p.value[0].properties.length; j++) {
					var q = p.value[0].properties[j];
					var name = q.value[0].name;
					name = name.replace(/["']{1}/g, '');
					if (name.substr(0, 2) !== 'do') {	// Exclude doXXXX methods
						declared[name] = "";
					}
				}
			}
		}
		return declared;
	},
	/**
	 * Recursively lists the handler methods mentioned in the "onXXXX"
	 * attributes of the components passed as an input parameter
	 * NB: doXXXX() methods are not listed.
	 * @param components: components to walk thru
	 * @param declared: list of handler methods already listed
	 * @returns the list of declared handler methods
	 * @protected
	 */
	listDeclaredComponentsHandlers: function(components, declared) {
		for(var i = 0; i < components.length; i++) {
			var c = components[i];
			for(var k = 0 ; k < c.properties.length ; k++) {
				var p = c.properties[k];
				if (p.name.substr(0, 2) === 'on') {
					var name = p.value[0].name.replace(/["']{1}/g, '');
					if (name.substr(0, 2) !== 'do') {	// Exclude doXXXX methods
						declared[name] = "";
					}
				}
			}
			if (components.components) {
				this.listDeclaredComponentsHandlers(components.components, declared);
			}
		}
		return declared;
	},
});