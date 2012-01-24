enyo.kind({
	name: "Reader",
	kind: enyo.Component,
	events: {
		onFinish: ""
	},
	moduleIndex: 0,
	modules: {},
	loadModules: function(inLoader) {
		this.loader = inLoader;
		this.moduleIndex = 0;
		this.modules = {};
		this.nextModule();
	},
	nextModule: function() {
		var m = this.loader.modules[this.moduleIndex++];
		if (m) {
			this.loadModule(m);
		} else {
			this.modulesFinished();
		}
	},
	loadModule: function(inModule) {
		enyo.xhr.request({
			url: inModule.path,
			callback: enyo.bind(this, "moduleLoaded", inModule)
		});
	},
	moduleLoaded: function(inModule, inCode) {
		this.addModule(inModule, inCode);
		this.nextModule();
	},
	addModule: function(inModule, inCode) {
		if (inCode && inCode.length) {
			var module = new enyo.Documentor(inCode).results;
			this.modules[inModule.path] = module; 
			enyo.mixin(module, inModule);
		}
	},
	modulesFinished: function() {
		this.doFinish();
	}
});