enyo.kind({
	name: "InfoDb",
	kind: "Component",
	dbify: function(inReaderModules) {
		this.objects = [];
		this.modules = this.buildModuleList(inReaderModules);
		this.packages = this.buildPackageList(this.modules);
		this.indexModuleObjects();
		this.cookObjects();
		this.indexInheritance();
		this.indexAllProperties();
		this.objects.sort(this.nameCompare);
	},
	// return the subset of objects that are inType
	listByType: function(inType) {
		var result = [];
		for (var i=0, o; o=this.objects[i]; i++) {
			if (o.type == inType) {
				result.push(o);
			}
		}
		return result;
	},
	filter: function(inFilterFn) {
		return enyo.forEach(this.objects, inFilterFn);
	},
	findByProperty: function(inList, inProperty, inValue) {
		for (var i=0, k; k=inList[i]; i++) {
			if (k[inProperty] == inValue) {
				return k;
			}
		}
	},
	findByName: function(inName) {
		return this.findByProperty(this.objects, "name", inName);
	},
	findByTopic: function(inName) {
		return this.findByProperty(this.objects, "topic", inName);
	},
	//
	unmap: function(inMap, inFlag) {
		var results = [];
		for (var key in inMap) {
			var elt = inMap[key];
			elt.key = key;
			if (inFlag) {
				elt[inFlag] = true;
			}
			results.push(elt);
		}
		return results;
	},
	buildModuleList: function(inModuleHash) {
		// FIXME: should lower level code produce an array directly?
		return this.unmap(inModuleHash);
	},
	buildPackageList: function(inModules) {
		var pkgs = {};
		for (var i=0, m, n, lc, p; m=inModules[i]; i++) {
			// discover package name
			n = (m.packageName || "unknown");
			// bin by package name
			lc = n.toLowerCase();
			if (!pkgs[lc]) {
				pkgs[lc] = {
					packageName: n,
					modules: []
				}
			}
			p = pkgs[lc];
			p.modules.push(m);
		}
		return this.unmap(pkgs);
	},
	//
	// combine all module objects into master array of raw objects
	indexModuleObjects: function() {
		this.raw = [];
		for (var i=0, m; m=this.modules[i]; i++) {
			this.indexModule(m);
		}
	},
	// add this module and each of it's objects (that has a name and type) to the master array
	// refer each indexed object back to it's source module
	indexModule: function(inModule) {
		// the module itself is an object
		inModule.type = 'module';
		this.raw.push(inModule);
		// all named and typed objects go into raw array
		for (var i=0, o$=inModule.objects, o; o=o$[i]; i++) {
			if (o.name && o.type) {
				o.module = inModule;
				this.raw.push(o);
			}
		}
		// make an array to hold 'cooked' objects (overwrite old objects array)
		inModule.objects = [];
	},
	// process raw data in each object into a form that's easier to consume
	cookObjects: function() {
		for (var i=0, raw, cooked; raw=this.raw[i]; i++) {
			// cook the raw data
			cooked = this.cookObject(raw);
			// convert group id to flag
			if (raw.group) {
				cooked[raw.group] = true;
			}
			// track the source module
			cooked.module = raw.module;
			// make sure there is an index topic
			if (!cooked.topic) {
				cooked.topic = cooked.name;
			}
			// store the cooked object in the master array
			this.objects[i] = cooked;
			// store the cooked object in it's module
			if (cooked.module) {
				cooked.module.objects.push(cooked);
			}
		}
	},
	// process a raw object based on it's type
	cookObject: function(inObject) {
		var fn = "cook_" + inObject.type;
		if (this[fn]) {
			return this[fn](inObject);
		}
		return inObject;
	},
	cook_kind: function(inObject) {
		return this.processKind(inObject);
	},
	cook_object: function(inObject) {
		return this.processObject(inObject);
	},
	cook_function: function(inObject) {
		return this.processFunction(inObject);
	},
	cook_module: function(inObject) {
		return this.processModule(inObject);
	},
	//
	processModule: function(inModule) {
		inModule.topic = inModule.rawPath;
		inModule.name = inModule.rawPath;
		return inModule;
	},
	processFunction: function(inFunction) {
		return inFunction;
	},
	processObject: function(o) {
		// cook raw data
		var info = {
			name: o.name,
			comment: o.comment,
			type: o.type,
			object: true
		};
		// list properties with references
		info.properties = this.listKindProperties(o, info);
		return info;
	},
	processKind: function(k) {
		// FIXME: the default kind is only enyo.Control if 'dom' package is loaded, otherwise it's enyo.Component
		var defaultKind = "enyo.Control";
		// cook raw data
		var info = {
			name: k.name.value,
			comment: k.comment,
			type: k.type,
			kind: true,
			// FIXME: the default constructor is only enyo.Control if 'dom' package is loaded, otherwise it's enyo.Component
			superKind: k.kind ? (k.kind.value != "null" && k.kind.value) : defaultKind
		};
		// list properties with references
		info.properties = this.listKindProperties(k, info);
		return info;
	},
	listSuperkinds: function(inKind) {
		var supers = [], kind = inKind;
		while (kind && kind.superKind) {
			supers.push(kind.superKind);
			kind = this.findByName(kind.superKind);
		}
		return supers;
	},
	listKindProperties: function(inKind, inInfo) {
		// copy methods
		var props = this.unmap(inKind.methods.map, "method");
		// copy non-method properties
		props = props.concat(this.unmap(inKind.properties.map, "property"));
		// copy published properties
		if (inKind.published && inKind.published.value.properties) {
			props = props.concat(this.unmap(inKind.published.value.properties.map, "published"));
		}
		for (var i=0, p; p=props[i]; i++) {
			// convert group id to flag
			p[p.group] = true;
			// refer each property record back to the kind info it came from (for tracking overrides)
			p.kind = inInfo;
			// topic includes the source kind
			p.topic = p.kind.name + "::" + p.name;
			// object type
			p.type = p.method ? "method" : "property";
		}
		props.sort(this.nameCompare);
		return props;
	},
	nameCompare: function(inA, inB) {
		if (inA.name < inB.name) {
			return -1;
		}
		if (inA.name > inB.name) {
			return 1;
		} 
		return 0;
	},
	indexInheritance: function() {
		for (var i=0, o; o=this.objects[i]; i++) {
			if (o.type == "kind") {
				o.superkinds = this.listSuperkinds(o);
				o.allProperties = this.listInheritedProperties(o);
			}
		}
	},
	listInheritedProperties: function(inKind) {
		var all = [], map = {};
		// utility function
		mergeProperties = function(inProperties) {
			for (var j=0, p; p=inProperties[j]; j++) {
				// look for overridden property
				var old = map.hasOwnProperty(p.name) && map[p.name];
				if (old) {
					// note the override, reference the previous instance
					p.overrides = old;
					// update array (only store latest property)
					all[enyo.indexOf(old, all)] = p;
				} else {
					// new property
					all.push(p);
				}
				// update temporary property map
				map[p.name] = p;
			}
		}
		// walk up the inheritance chain from the basest base
		for (var i=inKind.superkinds.length - 1, n; n=inKind.superkinds[i]; i--) {
			// find the superkind properties
			var sk = this.findByName(n);
			if (sk) {
				// merge the superkind properties
				mergeProperties(sk.properties);
			}
		}
		// merge the kind's own properties
		mergeProperties(inKind.properties);
		// default sort
		all.sort(this.nameCompare);
		// return the list
		return all;
	},
	indexAllProperties: function() {
		for (var i=0, o; o=this.objects[i]; i++) {
			if (o.properties) {
				enyo.forEach(o.properties, function(p) {
					this.objects.push(p);
				}, this);
			}
		}
	}
});
