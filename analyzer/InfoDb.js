enyo.kind({
	name: "InfoDb",
	kind: "Component",
	create: function() {
		this.modules = [];
		this.packages = [];
		this.objects = [];
		this.inherited(arguments);
	},
	dbify: function(inReaderModules) {
		// mine data from module list
		var data = this.modulesToObjects(inReaderModules);
		// combine with existing db
		this.modules = this.modules.concat(data.modules);
		this.packages = this.packages.concat(data.packages);
		this.objects = this.objects.concat(data.objects);
		// add all property records to the objects array
		this.indexAllProperties(data.objects);
		// sort the object list by name
		this.objects.sort(this.nameCompare);
	},
	modulesToObjects: function(inReaderModules) {
		// extra module information into an (unmapped array)
		var modules = this.buildModuleList(inReaderModules);
		// iterate over modules to infer package information (unmapped array)
		var packages = this.buildPackageList(modules);
		// combine all module objects (ths module itself, and each of it's objects that has a name and type) into 'this.raw' array
		this.indexModuleObjects(modules);
		// process objects in 'this.raw' to make them easier to consume
		var objects = this.cookObjects();
		// to each cooked 'kind' record, add a list of superkinds and inherited properties
		this.indexInheritance(objects);
		return {
			modules: modules,
			packages: packages,
			objects: objects
		};
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
		return enyo.filter(this.objects, inFilterFn);
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
		// for each module
		for (var i=0, m, n, lc, p; m=inModules[i]; i++) {
			// discover package name
			n = (m.packageName || "unknown");
			// bin by package name
			lc = n.toLowerCase();
			// create a package record, if needed
			if (!pkgs[lc]) {
				pkgs[lc] = {
					packageName: n,
					modules: []
				}
			}
			// the package record for this module
			p = pkgs[lc];
			// store a reference to this module
			p.modules.push(m);
		}
		// convert package map into array of named objects
		return this.unmap(pkgs);
	},
	//
	// combine all module objects into master array of raw objects
	indexModuleObjects: function(inModules) {
		this.raw = [];
		for (var i=0, m; m=inModules[i]; i++) {
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
		var objects = [];
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
			objects[i] = cooked;
			// store the cooked object in it's module
			if (cooked.module) {
				cooked.module.objects.push(cooked);
			}
		}
		return objects;
	},
	// process a raw object based on it's type
	cookObject: function(inObject) {
		var fn = "cook_" + inObject.type;
		if (this[fn]) {
			return this[fn](inObject);
		}
		return inObject;
	},
	cook_module: function(inModule) {
		inModule.topic = inModule.rawPath;
		inModule.name = inModule.rawPath;
		return inModule;
	},
	cook_function: function(inFunction) {
		return inFunction;
	},
	cook_object: function(o) {
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
	cook_kind: function(k) {
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
	listKindProperties: function(inKind, inInfo) {
		/*
		// copy methods
		var props = this.unmap(inKind.methods.map, "method");
		// copy non-method properties
		props = props.concat(this.unmap(inKind.properties.map, "property"));
		*/
		var props = inKind.properties;
		// append published properties
		if (inKind.published && inKind.published.value) {
			for (var i=0, p; p=inKind.published.value[i]; i++) {
				p.published = true;
				props.push(p);
			}
			//props = props.concat(this.unmap(inKind.published.value.properties.map, "published"));
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
		// sort by name property
		props.sort(this.nameCompare);
		return props;
	},
	//
	indexInheritance: function(inObjects) {
		for (var i=0, o; o=inObjects[i]; i++) {
			if (o.type == "kind") {
				o.superkinds = this.listSuperkinds(o);
				o.allProperties = this.listInheritedProperties(o);
			}
		}
	},
	listSuperkinds: function(inKind) {
		var supers = [], kind = inKind;
		while (kind && kind.superKind) {
			var sk = kind.superKind;
			kind = this.findByName(sk);
			if (!kind) {
				kind = this.findByName("enyo." + sk);
				if (kind) {
					sk = "enyo." + sk;
				}
			}
			supers.push(sk);
		}
		return supers;
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
	indexAllProperties: function(inObjects) {
		for (var i=0, o; o=inObjects[i]; i++) {
			enyo.forEach(o.properties, function(p) {
				this.objects.push(p);
			}, this);
		}
	}
});
