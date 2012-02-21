enyo.kind({
	name: "PackageDb",
	kind: "InfoDb",
	events: {
		onReport: "",
		onFinish: ""
	},
	components: [
		{name: "walker", kind: "Walker", onReport: "walkerReport", onFinish: "walkerFinish"}
	],
	walk: function(inPackage) {
		this.$.walker.walk(enyo.path.rewrite(inPackage));
	},
	walkerReport: function(inSender, inAction, inName) {
		this.doReport(inAction, inName);
	},
	walkerFinish: function() {
		this.dbify(this.$.walker.modules);
		// this message will bubble
	}
});
