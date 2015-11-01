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
	fileLoaded: function(inFile, inCode, xhr) {
		var code = inCode;
		var comment = "";
			
		if(inFile.path.search("onyx") != 1 || inFile.path.search("layout") != 1){
			inCode = "";
			for (var l = 0; l <= code.length; l++ ){
				if(code.charAt(l) === "/" && code.charAt(l+1) === "*"){
					for (l ; l <= code.length; l++ ){	
						comment = comment + code.charAt(l);								// comment stirng built here
						if(code.charAt(l) === "*" && code.charAt(l+1) === "/"){			// stop strip here if we find */
							comment = comment + code.charAt(l) + code.charAt( l+ 1);    // add the last two char of the comment
							l++;
							
							if (comment.search("@lends") != -1){
								comment = comment + "/n";								// add a new line to end of comment here
							}else{
								inCode = inCode + comment;
								comment = "";
							}
							break;
						}	
					}
				}else{
					inCode = inCode + code.charAt(l);
				}	
			}
		}	

		if (xhr.status >= 200 && xhr.status < 300) {
			this.addFile(inFile, inCode);
		}
		else {
			this.fail("Analyser cannot read " + inFile.path + ": " + xhr.status + ' ' + xhr.statusText);
		}
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
