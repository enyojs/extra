enyo.kind({
	name: "analyzer.Iterator",
	kind: null,
	i: -1,
	nodes: null,
	constructor: function(inStream) {
		// Assign a unique ID to each Iterator
		this.ID = analyzer.Iterator._objectCount++;
		this.stream = inStream;
	},
    statics: {
		_objectCount: 0		// For debugging purpose
    },
	next: function() {
		this.i++;
		return this._read();
	},
	prev: function() {
		this.i--;
		return this._read();
	},
	_read: function(inIt) {
		this.past = this.stream[this.i - 1];
		this.value = this.stream[this.i];
		this.future = this.stream[this.i + 1];
		return this.value;
	}
});