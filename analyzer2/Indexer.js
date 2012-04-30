enyo.kind({
	name: "Indexer",
	kind: null,
	group: "public",
	constructor: function() {
		this.objects = [];
	},
	findByName: function(inName) {
		return Documentor.findByName(this.objects, inName);
	},
	addModules: function(inModules) {
		// add the modules to the master object database
		this.objects = this.objects.concat(inModules);
		// index the modules
		enyo.forEach(this.objects, this.indexModule, this);
	},
	indexModule: function(inModule) {
		// this object is type: "module"
		inModule.type = "module";
		// name this module
		inModule.name = inModule.rawPath;
		// parse module objects
		inModule.objects = new Documentor(new Parser(new Lexer(inModule.code)));
		// add the module objects to the database
		this.objects = this.objects.concat(inModule.objects);
		// index module objects
		enyo.forEach(inModule.objects, function(o) {
			o.module = inModule;
			this.indexObject(o);
		}, this);
		// sort!
		this.objects.sort(Indexer.nameCompare);
	},
	indexObject: function(inObject) {
		switch (inObject.type) {
			case "kind":
				this.indexKind(inObject);
				break;
		}
		this.indexProperties(inObject);
	},
	indexKind: function(o) {
		this.indexInheritance(o);
		// append published properties to main property list
		/*
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
		var i = Documentor.indexByName(o.properties, "components");
		if (i >= 0) {
			var pp = o.properties[i];
			o.properties.splice(i, 1);
			o.components = pp;
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
	listInheritedProperties: function(inKind) {
		var all = [], map = {};
		// walk up the inheritance chain from the basest base
		for (var i=inKind.superkinds.length - 1, n; n=inKind.superkinds[i]; i--) {
			// find the superkind properties
			var sk = this.findByName(n);
			if (sk) {
				// merge the superkind properties
				this.mergeProperties(sk.properties, map, all);
			}
		}
		// merge the kind's own properties
		this.mergeProperties(inKind.properties, map, all);
		// default sort
		all.sort(Indexer.nameCompare);
		// return the list
		return all;
	},
	mergeProperties: function(inProperties, inMap, inAll) {
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
	indexProperties: function(inObject) {
		enyo.forEach(inObject.properties, function(p) {
			p.object = inObject;
			this.objects.push(p);
		}, this);
	},
	statics: {
		nameCompare: function(inA, inB) {
			if (inA.name < inB.name) {
				return -1;
			}
			if (inA.name > inB.name) {
				return 1;
			} 
			return 0;
		}
	}
});