enyo.kind({
	name: "TestSuiteTest",
	kind: enyo.TestSuite,	
	
	beforeEach: function() {
		this.didBefore=true;
	},
	afterEach: function() {
		if(this.leaveMarkInAfterEach) {
			window.afterWasExecuted = true;
		}
	},
	testTest: function() {
		this.finish();
	},
	testFail: function() {
		this.finish("This test should fail.");
	},
	// Success, then failure is a failure.
	testConfusedFail: function() {
		this.finish();
		this.finish("This test should fail.");
	},
	// Failure, then success is a failure.
	testConfusedFail2: function() {
		this.finish("This test should fail.");
		this.finish();
	},
	testBefore: function() {
		if(!this.didBefore) {
			this.finish("before was not executed.");
		} else {
			this.finish();
		}
	},
	testAfterPt1: function() {
		this.leaveMarkInAfterEach=true;
		this.finish();
	},
	testAfterPt2: function() {
		if(!window.afterWasExecuted) {
			var result = "After was not executed in pt1.";
		}
		this.finish(result);
	},
	// Should be okay to succeed later.
	testDeferred: function() {
		var that=this;
		window.setTimeout(function() {
			that.finish();
		}, 10);
	},
	// If we succeed, and then fail asynchronously, it should count as a failure.
	testBelatedFail: function() {
		var that=this;
		window.setTimeout(function() {
			that.finish("this test should fail.");
		}, 10);
		this.finish();
	},
	testAsyncFinishPt1: function() {
		window.startedPt1 = true;
		this.finish();
		delete window.startedPt1;
	},
	testAsyncFinishPt2: function() {
		if(window.startedPt1) {
			var result = "Pt1 did not complete yet.";
		}
		this.finish(result);
	}
	
});
