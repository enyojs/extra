/**
Listens for all the Phonegap specific events (as of 1.5.0)

All events are exposted through the [Signals](#enyo.Signals) kind by adding callback handlers.

Example:

enyo.kind({
	name: "App",
	components: [
		{kind: "Signals", ondeviceready: "devicereadyHandler"},
		...
		],
	devicereadyHandler: function() {
	// Phonegap API exists at this point forward
	}
});

List of phonegap events detailed on the [Phonegap Docs](http://docs.phonegap.com/en/1.5.0/phonegap_events_events.md.html#Events)
*/
//* @protected
(function(){
	var pge = [
		"deviceready",
		"pause",
		"resume",
		"online",
		"offline",
		"backbutton",
		"batterycritical",
		"batterylow",
		"batterystatus",
		"menubutton",
		"searchbutton",
		"startcallbutton",
		"endcallbutton",
		"volumedownbutton",
		"volumeupbutton"
	];

	for (var i = 0, e, f; e = pge[i]; i++) {
		// some phonegap events have no type, so enyo.dispatch fails
		f = enyo.bind(enyo.Signals, "send", "on" + e);
		document.addEventListener(e, f, false);
	}
})();
