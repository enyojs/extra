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
	walk: function(inPaths) {
		var modules = [];
		var next = function(inSender, inData) {
			if (inData) {
				modules = modules.concat(inData.modules);
			}
			var path = inPaths.shift();
			if (path) {
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
