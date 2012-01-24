enyo.kind({
	name: "CodeEditor",
	kind: "Control",
	tag: "textarea",
	published: {
		url: "",
		value: ""
	},
	events: {
		onLoad: ""
	},
	create: function() {
		this.inherited(arguments);
		this.valueChanged();
		this.urlChanged();
	},
	urlChanged: function() {
		if (this.url) {
			new enyo.Ajax({url: this.url, handleAs: "text"}).response(this, "receive").go();
		}
	},
	receive: function(inSender, inCode) {
		this.setValue(inCode);
		this.doLoad(inCode);
	},
	valueChanged: function() {
		this.setAttribute("value", this.value);
		if (this.hasNode()) {
			this.hasNode().value = this.value;
		}
	},
	getValue: function() {
		return this.hasNode() ? this.node.value : this.getAttribute("value");
	}
});