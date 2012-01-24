enyo.kind({
	name: "CodePlayer",
	kind: "Control",
	evalCode: function(inCode) {
		eval(inCode);
	},
	go: function(inCode) {
		this.destroyClientControls();
		try {
			this.evalCode(inCode);
			this.createComponent({kind: "Sample"});
			if (this.hasNode()) {
				this.render();
			}
		} catch(e) {
			console.error("Error creating code: " + e);
		}
	}
});
