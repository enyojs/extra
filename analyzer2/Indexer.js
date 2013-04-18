enyo.kind({
	name: "Indexer",
	kind: null,
	group: "public",
	constructor: function() {
		this.objects = [];
		this.palette = [];
		this.propertyMetaData = [];
	},
	debug: false,
	findByName: function(inName) {
		return Documentor.findByProperty(this.objects, "name", inName);
	},
	findByTopic: function(inTopic) {
		return Documentor.findByProperty(this.objects, "topic", inTopic);
	},
	/**
		Creates a new array with all elements of _inArray_ that pass the test implemented by _inFunc_.
		If _inContext_ is specified, _inFunc_ is called with _inContext_ as _this_.
	*/
	search: function(inFilterFn, inMapFn, inContext) {
		var values = enyo.filter(this.objects, inFilterFn, inContext);
		return enyo.map(values, inMapFn, inContext);
	},
	// Normalizes _inPath_ by removing any _._ or _.._'s from the path
	normalizePath: function(inPath) {
		var parts = inPath.split("/");
		var newpath = [];
		enyo.forEach(parts, function(part) {
			if (part == ".") {
				// Do nothing
			} else if (part == "..") {
				newpath.pop();
			} else {
				newpath.push(part);
			}
		}, this);
		return newpath.join("/");
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
		this.debug && enyo.log("Indexer.addModule(): + " + inModule.path);
		inModule.path = this.normalizePath(inModule.path);
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
		inModule.module = inModule;
		// name this module by incorporating the path so its unique
		inModule.name = inModule.path? inModule.path.replace("lib/", ""): inModule.label + "/" + inModule.rawPath;
		// parse module objects
		inModule.objects = new Documentor(new Parser(new Lexer(inModule.code)));
		// index module objects
		this.indexObjects(inModule);
	},
	/**
	 * Removes all indexer data associated with the specified javascript module
	 * @param  inModule		An object containing at least a path to the file
	 * @public
	 */
	removeModule: function(inModule) {
		this.removeModuleByPath(inModule.path);
	},
	/**
	 * Removes all indexer data associated with the specified javascript module
	 * @param  inPath	The path to the file
	 * @public
	 */
	removeModuleByPath: function(inPath) {
		inPath = this.normalizePath(inPath);
		// Remove all objects associated with this module
		var len = this.objects.length;
		while (len--) {
			if (this.objects[len].module.path == inPath) {
				this.objects.splice(len, 1);
			}
		}
	},
	/**
	 * Removes all indexer data associated with the specified javascript module, and 
	 * re-indexes it.
	 * @param  inModule		An object containing the path and code of the file
	 * @public
	 */
	reIndexModule: function(inModule) {
		this.removeModule(inModule);
		this.addModule(inModule);
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
			p.module = inObject.module;
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
		if (inProperties) {
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
						n += ++map[n];
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
	/**
	 * Adds data from an array of "design" objects to the indexer, which were previously
	 * loaded by the Reader into each design object's `code` property.  Design objects may
	 * specify palette or property meta-data.
	 * @param  inDesigns	Array of design objects with unparsed code string
	 * @public
	 */
	addDesigns: function(inDesigns) {
		enyo.forEach(inDesigns, this.addDesign, this);
		enyo.forEach(this.palette, this.indexPalette, this);
		enyo.forEach(this.propertyMetaData, this.indexPropertyMetaData, this);
	},
	/**
	 * Adds a given "design" object to the indexer.
	 * @param  inDesigns	A design object with unparsed code string
	 * @public
	 */
	addDesign: function(inDesign) {
		inDesign.path = this.normalizePath(inDesign.path);
		try {
			var design = enyo.json.parse(inDesign.code);
			enyo.forEach(["palette", "propertyMetaData"], function(type) {
				if (design[type]) {
					var src = design[type];
					var dest = this[type] || [];
					enyo.forEach(src, function(item) {
						item.design = inDesign;
					}, this);
					this[type] = dest.concat(src);
				}
			}, this);
		} catch (err) {
			enyo.warn("Error parsing designer meta-data (" + inDesign.path + "): " + err);
		}
	},
	/**
	 * Removes all indexer data associated with the specified design file
	 * @param  inDesign		An object containing at least a path to the design file
	 * @public
	 */
	removeDesign: function(inDesign) {
		this.removeDesignByPath(inDesign.path);
	},
	/**
	 * Removes all indexer data associated with the specified design file
	 * @param  inPath	The path to the design file
	 * @public
	 */
	removeDesignByPath: function(inPath) {
		inPath = this.normalizePath(inPath);
		this.removePalettesByPath(inPath);
		this.removePropertyMetaDataByPath(inPath);
	},
	/**
	 * Removes palette info associated with the specified design file
	 * @param  inPath	The path to the design file
	 * @protected
	 */
	removePalettesByPath: function(inPath) {
		var len = this.palette.length;
		while (len--) {
			var cat = this.palette[len];
			if (cat.design.path == inPath) {
				enyo.forEach(cat.items, function(item) {
					var obj = this.findByName(item.kind);
					if (obj) {
						obj.hasPalette = false;
					}
				}, this);
				this.palette.splice(len, 1);
			}
		}
	},
	/**
	 * Removes property meta-data associated with the specified design file
	 * @param  inPath	The path to the design file
	 * @protected
	 */
	removePropertyMetaDataByPath: function(inPath) {
		var len = this.propertyMetaData.length;
		while (len--) {
			var item = this.propertyMetaData[len];
			if (item.design.path == inPath) {
				var obj = this.findByName(item.kind);
				if (obj) {
					obj.propertyMetaData = false;
				}
				this.propertyMetaData.splice(len, 1);
			}
		}
	},
	/**
	 * Removes all indexer data associated with the specified design file, and 
	 * re-indexes it.
	 * @param  inDesign		An object containing the path and code of the design file
	 * @protected
	 */
	reIndexDesign: function(inDesign) {
		this.removeDesign(inDesign);
		this.addDesign(inDesign);
	},
	/**
	 * Loops over all the palette entries in a given category and marks kinds in the indexer
	 * with a flag indicating it has a palette entry (useful for generating a catch-all palette
	 * later).  Also fills in minimum palette information based on defaults if it is missing.
	 * @param  inCategory	A palette category (containing `items` array of palette entries)
	 * @protected
	 */
	indexPalette: function(inCategory) {
		enyo.forEach(inCategory.items, function(item) {
			var obj = this.findByName(item.kind);
			if (obj) {
				obj.hasPalette = true;
				// Fill in defaults for missing data
				item.name = item.name || obj.name;
				item.config = item.config || { kind:obj.name };
				item.inline = item.inline || { kind:obj.name };
				item.description = item.description || obj.comment;
			} else {
				enyo.warn("Designer meta-data specifed palette entry for '" + (item.kind || item.name) + "' but no kind by that name found.");
			}
		}, this);
	},
	/**
	 * Assigns a property meta-data item for a kind to its propertyMetaData entry
	 * @protected
	 */
	indexPropertyMetaData: function(inItem) {
		if (inItem.type == "kind"){
			var obj = this.findByName(inItem.name);
			if (obj) {
				obj.propertyMetaData = inItem;
			} else {
				enyo.warn("Designer meta-data specifed property info for '" + inItem.name + "' but no kind by that name found.");
			}
		}
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
