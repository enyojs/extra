enyo.kind({
	name: "Indexer",
	kind: null,
	group: "public",
	constructor: function() {
		this.objects = [];
	},
	findByName: function(inName) {
		return Documentor.findByProperty(this.objects, "name", inName);
	},
	findByTopic: function(inTopic) {
		return Documentor.findByProperty(this.objects, "topic", inTopic);
	},
	addModules: function(inModules) {
		enyo.forEach(inModules, this.addModule, this);
		// sort (?!)
		this.objects.sort(Indexer.nameCompare);
	},
	addModule: function(inModule) {
		//
		// "indexing" refers to normalizing object records and resolving references.
		// "merging" refers to adding the normalized records to the master database.
		//
		// indexing and merging have to be separated so we can index 'in-progress' modules 
		// without adding them to the database
		//
		this.indexModule(inModule);
		this.mergeModule(inModule);
	},
	mergeModule: function(inModule) {
		// add this module to the database
		this.objects.push(inModule);
		// add the module objects to the database
		this.objects = this.objects.concat(inModule.objects);
		// add the module objects' properties to the database
		enyo.forEach(inModule.objects, this.mergeProperties, this);
	},
	mergeProperties: function(inObject) {
		if (inObject.properties) {
			this.objects = this.objects.concat(inObject.properties);
		} 
		// globals
		else if (inObject.value && inObject.value[0] && inObject.value[0].properties /*&& inObject.value[0].properties[0] != undefined*/) {
			this.objects = this.objects.concat(inObject.value[0].properties);
		}
	},
	indexModule: function(inModule) {
		// this object is type: "module"
		inModule.type = "module";
		// name this module
		inModule.name = inModule.name || inModule.rawPath;
		// parse module objects
		inModule.objects = new Documentor(new Parser(new Lexer(inModule.code)));
		// index module objects
		this.indexObjects(inModule);
	},
	indexObjects: function(inModule) {
		enyo.forEach(inModule.objects, function(o) {
			o.module = inModule;
			this.indexObject(o);
		}, this);
	},
	indexObject: function(inObject) {
		switch (inObject.type) {
			case "kind":
				this.indexKind(inObject);
				break;
		}
		this.indexProperties(inObject);
	},
	indexProperties: function(inObject) {
		var p$ = inObject.properties || (inObject.value && inObject.value[0] && inObject.value[0].properties);
		enyo.forEach(p$, function(p) {
			p.object = inObject;
			p.topic = p.object.name ? p.object.name + "::" + p.name : p.name;
			/*
			if (p.value && p.value[0] && p.value[0].properties) {
				this.indexProperties(p.value[0].properties);
			}
			*/
		}, this);
	},
	indexKind: function(o) {
		// build a flat list of component declarations
		this.listComponents(o);
		// discover superkinds and inherited properties
		this.indexInheritance(o);
		/*
		// append published properties to main property list
		var i = Documentor.indexByName(o.properties, "published");
		if (i >= 0) {
			var pp = o.properties[i];
			o.properties.splice(i, 1);
			pp = pp.value && pp.value[0] && pp.value[0].properties;
			for (var j=0, p; p = pp[j]; j++) {
				p.published = true;
				p.group = "published";
				o.properties.splice(i, 0, p);
			}
		}
		*/
	},
	indexInheritance: function(o) {
		o.superkinds = this.listSuperkinds(o);
		o.allProperties = this.listInheritedProperties(o);
	},
	listSuperkinds: function(o) {
		var supers = [], sk;
		while (o && o.superkind) {
			sk = o.superkind;
			o = this.findByName(sk);
			if (!o) {
				o = this.findByName("enyo." + sk);
				if (o) {
					sk = "enyo." + sk;
				}
			}
			supers.push(sk);
		}
		return supers;
	},
	listInheritedProperties: function(o) {
		var all = [], map = {};
		// walk up the inheritance chain from the basest base
		for (var i=o.superkinds.length - 1, n; n=o.superkinds[i]; i--) {
			// find the superkind properties
			var sk = this.findByName(n);
			if (sk) {
				// merge the superkind properties
				this.mergeInheritedProperties(sk.properties, map, all);
			}
		}
		// merge the kind's own properties
		this.mergeInheritedProperties(o.properties, map, all);
		// default sort
		all.sort(Indexer.nameCompare);
		// return the list
		return all;
	},
	mergeInheritedProperties: function(inProperties, inMap, inAll) {
		for (var j=0, p; p=inProperties[j]; j++) {
			// look for overridden property
			var old = inMap.hasOwnProperty(p.name) && inMap[p.name];
			if (old) {
				// note the override, reference the previous instance
				p.overrides = old;
				// update array (only store latest property)
				inAll[enyo.indexOf(old, inAll)] = p;
			} else {
				// new property
				inAll.push(p);
			}
			// update temporary property map
			inMap[p.name] = p;
		}
	},
	listComponents: function(o) {
		// produce a list of components owned by 'o' as specified by 'components' property
		o.components = this._listComponents(o, [], {});
		// add componentsBlockStart and componentsBlockEnd properties for Ares
		var c$ = Documentor.findByName(o.properties, "components");
		if (c$ && c$.value) {
			o.componentsBlockStart = c$.value[0].start;
			o.componentsBlockEnd = c$.value[0].end;
		}
	},
	_listComponents: function(o, list, map) {
		// if 'components' exists, it's a property with a block value
		var c$ = Documentor.findByName(o.properties, "components");
		if (c$ && c$.value && c$.value.length) {
			// the array of properties in the block value
			var p$ = c$.value[0].properties;
			for (var i=0, p; p=p$[i]; i++) {
				// each p is a config block, find the 'name' and 'kind' properties, if they exist
				var n = Documentor.findByName(p.properties, "name");
				if (n) {
					n = Documentor.stripQuotes(n.value[0].token || "");
				}
				var k = Documentor.findByName(p.properties, "kind");
				// FIXME: default kind is 'Control' only if the DOM package is loaded
				k = Documentor.stripQuotes(k && k.value[0].token || "Control");
				// in Component, anonymous sub-components are named by enumerating kinds, recreate that here
				if (!n) {
					// only grab the last bit of the namespace
					var ns = k.split(".").pop();
					// uncap the first letter
					n = enyo.uncap(ns);
					// enumerate multiple instances of one kind (kind, kind2, kind3 ...)
					if (map[n]) {
						n += ++map[n]
					} else {
						map[n] = 1;
					}
				}
				// make a note of the kind and processed name
				p.kind = k;
				p.name = n;
				// add this entry in our list
				list.push(p);
				// sub-component definitions are owned by the top-level object
				this._listComponents(p, list, map);
			}
		}
		return list;
	},
	statics: {
		nameCompare: function(inA, inB) {
			var na = inA.name.toLowerCase(), 
				nb = inB.name.toLowerCase();
			if (na < nb) {
				return -1;
			}
			if (na > nb) {
				return 1;
			} 
			return 0;
		}
	}
});