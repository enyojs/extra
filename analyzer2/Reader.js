enyo.kind({
	name: "Reader",
	kind: enyo.Async,
	go: function(inData) {
		this.modules = inData.modules;
		this.moduleIndex = 0;
		enyo.asyncMethod(this, "nextModule");
		return this;
	},
	nextModule: function() {
		var m = this.modules[this.moduleIndex++];
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
			inModule.code = inCode;
		}
	},
	modulesFinished: function() {
		this.respond({modules: this.modules});
	}
});