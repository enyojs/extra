enyo.kind({
	name: "Analyzer",
	kind: "Component",
	events: {
		onIndexReady: ""
	},
	create: function() {
		this.index = new Indexer();
		this.inherited(arguments);
	},
	analyze: function(inPaths) {
		this.walk(inPaths);
	},
	// inPaths is either an array of strings or an array of
	// objects with path and label fields.  If labels are
	// provided, the objects from the analysis for that path
	// are tagged with a label property
	walk: function(inPaths) {
		var modules = [];
		var currentLabel;
		var next = function(inSender, inData) {
			if (inData) {
				for (var i = 0; i < inData.modules.length; ++i) {
					inData.modules[i].label = currentLabel;
				}
				modules = modules.concat(inData.modules);
			}
			var path = inPaths.shift(), label = '';
			if (path) {
				if (!enyo.isString(path)) {
					currentLabel = path.label;
					path = path.path;
				}
				new Walker().walk(path).response(this, next);
			} else {
				this.walkFinished(modules);
			}
		};
		next.call(this);
	},
	walkFinished: function(inModules) {
		this.read(inModules);
	},
	read: function(inModules) {
		new Reader()
			.go({modules: inModules})
			.response(this, function(inSender, inData) {
				this.indexModules(inData.modules);
			})
		;
	},
	indexModules: function(inModules) {
		this.index.addModules(inModules);
		this.doIndexReady();
	}
});
