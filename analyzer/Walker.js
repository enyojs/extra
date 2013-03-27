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
	components: [
		{kind: "Reader", onFinish: "readerFinish"}
	],
	walk: function(inSource) {
		// make a new loader
		this.loader = new enyo.loaderFactory(runtimeMachine);
		// stub out script loader, we only need manifests to walk dependencies
		this.loader.loadScript = function(){};
		// stub out stylesheet loader
		this.loader.loadSheet = function(){};
		// control logging
		this.loader.verbose = this.verbose;
		// callbacks
		this.loader.report = this.bindSafely("walkReport");
		this.loader.finish = this.bindSafely("walkFinish");
		// substitute for default loader
		enyo.loader = this.loader;
		// walk application dependencies
		enyo.loader.load(inSource);
		//enyo.depends(inSource);
	},
	walkReport: function(inAction, inName) {
		this.doProgress({action: inAction, name: inName});
	},
	walkFinish: function() {
		// we've read all the manifests and constructed our list of modules
		// now build a database by reading and analyzing each module
		this.analyzeModules();
		// we've handled this finish message, do not bubble it
		return true;
	},
	analyzeModules: function() {
		this.$.reader.loadModules(this.loader);
	},
	readerFinish: function() {
		this.modules = this.$.reader.modules;
		// this message will bubble
	}
});
