enyo.kind({
	name: "enyo.YouTube",
	kind: "Control",
	published: {
		videoId: ""
	},
	statics: {
		isApiReady: false,
		apiReady: function() {
			enyo.YouTube.isApiReady = true;
			enyo.Signals.send("ApiReady");
		},
		url: "http://gdata.youtube.com/feeds/api/videos/",
		search: function(inSearchText, inRelated) {
			var url = this.url + (inRelated ? inSearchText + "/related" : "");
			var params = {q: inRelated ? null : inSearchText, alt: "json", format: 5};
			return new enyo.Ajax({url: url})
				.go(params)
				.response(this, "processResponse")
				;
		},
		processResponse: function(inSender, inResponse) {
			var videos = inResponse && inResponse.feed && inResponse.feed.entry || [];
			for (var i=0, l; v=videos[i]; i++) {
				l = v.id.$t;
				v.id = l.substring(l.lastIndexOf("/")+1);
				v.title = v.title.$t;
				v.thumbnail = v.media$group.media$thumbnail[1].url;
			}
			return videos;
		}
	},
	components: [
		{kind: "Signals", onApiReady: "apiReadySignal"},
		{name: "video", classes: "enyo-fit"}
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
				this.reflow();
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
