enyo.kind({
	name: "enyo.YouTube",
	kind: "VBox",
	published: {
		videoId: ""
	},
	statics: {
		isApiReady: false,
		apiReady: function() {
			enyo.YouTube.isApiReady = true;
			enyo.Signals.send("ApiReady");
		}
	},
	components: [
		{kind: "Signals", onApiReady: "apiReadySignal"},
		{name: "video", height: "fill", style: "position: relative;"}
	],
	apiReadySignal: function() {
		this.createPlayer();
	},
	createPlayer: function() {
		if (enyo.YouTube.isApiReady) {
			this.setPlayerShowing(true);
			this.player = new YT.Player(this.$.video.id, {
				height: '100%',
				width: '100%',
				videoId: this.videoId,
				events: {
					onReady: enyo.bind(this, "playerReady"),
					onStateChange: enyo.bind(this, "playerStateChange")
				}
			});
			// positioning hack
			var iframe = this.$.video.hasNode().firstChild;
			if (iframe) {
				iframe.style.position = "absolute";
			}
		}
	},
	playerReady: function(inEvent) {
		this.setPlayerShowing(true);
		this.play();
	},
	playerStateChange: function() {
	},
	getPlayer: function() {
		return this.player;
	},
	videoIdChanged: function() {
		if (this.videoId) {
			if (this.player) {
				this.player.loadVideoById(this.videoId);
				this.setPlayerShowing(true);
			} else {
				this.createPlayer();
			}
		} else {
			this.setPlayerShowing(false);
			this.pause();
		}
	},
	setPlayerShowing: function(inShowing) {
		this.$.video.setShowing(inShowing);
	},
	play: function() {
		if (this.player) {
			this.player.playVideo();
		}
	},
	pause: function() {
		if (this.player) {
			this.player.pauseVideo();
		}
	}
});

// global callback called when script is processed
onYouTubePlayerAPIReady = enyo.YouTube.apiReady;
