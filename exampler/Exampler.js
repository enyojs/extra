enyo.kind({
	name: "Exampler",
	kind: "Control",
	style: "background: #ABABAB",
	published: {
		url: ""
	},
	components: [
		{classes: "enyo-fit", classes: "tabbar", style: "overflow: hidden; height: 40px;", components: [
			{name: "outputTab", classes: "active tab", content: "Output", ontap: "outputTap"},
			{name: "codeTab", classes: "tab", content: "Code", ontap: "editorTap"},
		]},
		{kind: "CodePlayer", classes: "enyo-fit", style: "top: 40px;"},
		{kind: "CodeEditor", classes: "enyo-fit", style: "top: 40px;", onLoad: "go", showing: false}
	],
	create: function() {
		this.inherited(arguments);
		this.addClass("theme-fu");
		this.urlChanged();
	},
	urlChanged: function() {
		this.$.codeEditor.setUrl(this.url);
	},
	go: function() {
		this.$.codePlayer.go(this.$.codeEditor.getValue());
	},
	editorTap: function() {
		this.showHideEditor(true);
	},
	outputTap: function() {
		this.go();
		this.showHideEditor(false);
	},
	showHideEditor: function(inShow) {
		this.$.codeEditor.setShowing(inShow);
		this.$.codePlayer.setShowing(!inShow);
		this.$.codeTab.addRemoveClass("active", inShow);
		this.$.outputTab.addRemoveClass("active", !inShow);
	}
});