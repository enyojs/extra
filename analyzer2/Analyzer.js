enyo.kind({
	name: "analyzer.Analyzer",
	kind: "Component",
	debug: false,
	events: {
		onIndexReady: ""
	},
	create: function() {
		this.index = new analyzer.Indexer();
		this.inherited(arguments);
	},
	/**
	 * Analyze all the items of inPaths and add the result to the
	 * index database.
	 * @param inPaths: is either an array of strings or an array of
	 * objects with path and label fields.  If labels are
	 * provided, the objects from the analysis for that path
	 * are tagged with a label property
	 * @param inPathResolver: optional parameter similar to enyo.path
	 * needed only if enyo, onyx, ... to analyze are not the one used
	 * by the current application (e.g: Ares case).
	 * @protected
	 */
	analyze: function(inPaths, inPathResolver) {
		this.walk(inPaths, inPathResolver);
	},
	/**
	 * Walk over the inPaths items and analyze them
	 * @param inPaths: is either an array of strings or an array of
	 * objects with path and label fields.  If labels are
	 * provided, the objects from the analysis for that path
	 * are tagged with a label property
	 * @param inPathResolver: optional parameter similar to enyo.path
	 * needed only if enyo, onyx, ... to analyze are not the one used
	 * by the current application (e.g: Ares case).
	 * @protected
	 */
	walk: function(inPaths, inPathResolver) {
		var modules = [];
		var designs = [];
		var currentLabel;
		var next = function(inSender, inData) {
			if (inData) {
				if (this.debug) {
					enyo.log("analyzer.Analyzer.walk.next() - inData: ", inData);
				}
				for (var i = 0; i < inData.modules.length; ++i) {
					inData.modules[i].label = currentLabel;
				}
				modules = modules.concat(inData.modules);
				designs = designs.concat(inData.designs);
			}
			var path = inPaths.shift();
			if (path) {
				if (this.debug) {
					enyo.log("analyzer.Analyzer.walk.next() - path: " + path);
				}
				if (!enyo.isString(path)) {
					currentLabel = path.label;
					path = path.path;
				}
				new analyzer.Walker().walk(path, inPathResolver).response(this, next);
			} else {
				this.walkFinished(modules, designs);
			}
		};
		next.call(this);
	},
	//* @protected
	walkFinished: function(inModules, inDesigns) {
		this.read(inModules, inDesigns);
	},
	//* @protected
	read: function(inModules, inDesigns) {
		new analyzer.Reader()
			.go({modules: inModules, designs: inDesigns})
			.response(this, function(inSender, inData) {
				this.indexModules(inData.modules);
				this.indexDesigns(inData.designs);
				this.doIndexReady();
			})
		;
	},
	//* @protected
	indexModules: function(inModules) {
		this.index.addModules(inModules);
	},
	//* @protected
	indexDesigns: function(inDesigns) {
		this.index.addDesigns(inDesigns);
	}
});
