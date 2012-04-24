enyo.kind({
	name: "Walker",
	kind: enyo.Component,
	published: {
		verbose: false
	},
	events: {
		onProgress: "",
		onFinish: ""
	},
	walk: function(inPath) {
		// make a new loader
		this.loader = new enyo.loaderFactory(runtimeMachine);
		// stub out script loader, we only need manifests to walk dependencies
		this.loader.loadScript = function(){};
		// stub out stylesheet loader
		this.loader.loadSheet = function(){};
		// control logging
		this.loader.verbose = this.verbose;
		// callbacks
		this.loader.report = enyo.bind(this, "walkReport");
		this.loader.finish = enyo.bind(this, "walkFinish");
		// substitute for default loader
		enyo.loader = this.loader;
		// walk application dependencies
		var path = enyo.path.rewrite(inPath);
		enyo.asyncMethod(enyo.loader, "load", path);
		//enyo.loader.load(enyo.path.rewrite(inSource));
		//enyo.depends(inSource);
		return this.async = new enyo.Async();
	},
	walkReport: function(inAction, inName) {
		this.doProgress({action: inAction, name: inName});
	},
	walkFinish: function() {
		// we've read all the manifests and constructed our list of modules
		this.modules = this.loader.modules;
		this.async.respond({modules: this.modules});
		this.doFinish({modules: this.modules});
	}
});
