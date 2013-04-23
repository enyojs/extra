enyo.kind({
	name: "analyzer.Reader",
	kind: enyo.Async,
	go: function(inData) {
		this.modules = inData.modules;
		this.designs = inData.designs;
		this.files = inData.modules.concat(inData.designs);
		enyo.asyncMethod(this, "nextFile");
		return this;
	},
	nextFile: function() {
		var f = this.files.shift();
		if (f) {
			this.loadFile(f);
		} else {
			this.filesFinished();
		}
	},
	loadFile: function(inFile) {
		enyo.xhr.request({
			url: inFile.path,
			callback: this.bindSafely("fileLoaded", inFile)
		});
	},
	fileLoaded: function(inFile, inCode) {
		this.addFile(inFile, inCode);
		this.nextFile();
	},
	addFile: function(inFile, inCode) {
		if (inCode && inCode.length) {
			inFile.code = inCode;
		}
	},
	filesFinished: function() {
		this.respond({modules: this.modules, designs: this.designs});
	}
});