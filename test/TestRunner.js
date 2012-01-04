/*
To add a test case:
	1) Create a subclass of EnyoTestCase
	2) Add file to package.js
*/
enyo.kind({
	name: "enyo.TestRunner",
	kind: enyo.Control,
	index: 0,
	rendered: function() {
		this.inherited(arguments);
		this.next();
	},
	next: function() {
		var testKind = enyo.TestSuite.tests[this.index++];
		if (testKind) {
			testKind = testKind.prototype.kindName;
			this.createComponent({name: testKind, kind:enyo.TestReporter, onFinishAll: "next"}).render();
			this.$[testKind].runTests();
		}
	}
});
