enyo.kind({
	name: "analyzer.AnalyzerDebug",
	kind: null,
	debug: false,
	_level: 0,
	methodName: function(offset) {
		var line = this.getStackInfo(3 + (offset || 0));
		line = line.replace(/ .http:.*$/g, '');
		line = line.replace(/^.*.enyo.kind/g, this.kindName);
		line += '                                                                    ';
		return line.substr(0, 30);
	},
	getCurrentStackInfo: function(offset) {
		return " current: " + this.getStackInfo(3 + (offset || 0));
	},
	getPreviousStackInfo: function(offset) {
		return " previous: " + this.getStackInfo(4 + (offset || 0));
	},
	getStackInfo: function(level) {
		try {
			throw new Error();
		} catch(error) {
			var stack = error.stack;
			if (stack) {
				var lines = stack.split('\n');
				return lines[level];
			} else {
				return "(stack trace not available)";
			}
		}
	},
	showLevel: function() {
		return "#####################################".substr(0, this._level) + " ";
	},
	incremLevel: function() {
		this._level++;
		return this.showLevel() + " --> ";
	},
	decremLevel: function() {
		var value = this.showLevel() + " <-- ";
		this._level--;
		return value;
	},
	showIterator: function(it) {
		if (it) {
			return "[" + it.ID + "/" + it.i + "] ";
		} else {
			return "";
		}
	},
	logMethodEntry: function(it, msg) {
		msg = msg || "";
		enyo.log(this.methodName(1) + this.incremLevel() + this.showIterator(it) + msg + this.getPreviousStackInfo(1));
	},
	logMethodExit: function(it, msg) {
		msg = msg || "";
		enyo.log(this.methodName(1) + this.decremLevel() + this.showIterator(it) + msg + this.getCurrentStackInfo(1));
	},
	logProcessing: function(it, node) {
		enyo.log(this.methodName(1) + this.showLevel() + this.showIterator(it) + "PROCESSING kind: " + node.kind + " >>" + node.token
			+ "<< line: " + node.line + this.getCurrentStackInfo(1));
	},
	logIterMsg: function(it, msg) {
		enyo.log(this.methodName(1) + this.showLevel() + this.showIterator(it) + msg + this.getPreviousStackInfo(1));
	},
	logMsg: function(msg) {
		enyo.log(this.methodName(1) + this.showLevel() + msg + this.getPreviousStackInfo(1));
	},
    statics: {
		_debugEnabled: false
    }
});
