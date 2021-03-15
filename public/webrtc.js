var localDescriptionDiv = document.getElementById('localDescription');
var remoteDescriptionEditor = document.getElementById('remoteDescription');
var joinInput = document.getElementById('join');
var messageEditor = document.getElementById('messageInput');
var connection;
var sendChannel;
var iceCandidates = [];
var dataForRemotePeer = {};

fetch('./config.json')
	.then((data) => data.json())
	.then((config) => {
		connection = new RTCPeerConnection(config);
		console.log(config);
		sendChannel = connection.createDataChannel('sendChannel');
		connection.ondatachannel = ondatachannel;

		sendChannel.onopen = (channel, event) => {
			console.log('Channel is open.');
		};

		sendChannel.onclose = (channel, event) => {
			console.log('channel is close.');
		};

		connection.onicecandidate = (e) => {
			if (e.candidate) iceCandidates.push(e.candidate);
			else {
				dataForRemotePeer.candidates = iceCandidates;
				serializeDataForRemotePeer(dataForRemotePeer);
			}
		};
	});

function ondatachannel(event) {
	var channel = event.channel;
	channel.onmessage = onMessageRecieved;
	channel.onopen = onChannelOpen;
}

function onChannelOpen(event) {
	console.log(event);
}

function onMessageRecieved(event) {
	console.log(event.data);
	if (!event.data.includes('left')) {
		var div = document.createElement('div');
		div.innerText = event.data;
		localDescriptionDiv.appendChild(div);
	} else {
		// updateRemotePlayerPosition(event.data);
	}
}

function generateDescription() {
	if (connection)
		connection.createOffer().then((offer) => {
			connection.setLocalDescription(offer);
			dataForRemotePeer.description = offer;
		});
}

function serializeDataForRemotePeer(data) {
	var serializedData = JSON.stringify(data);
	localDescriptionDiv.innerText = serializedData;
}

function setConnection() {
	if (!connection) return;

	var serializedRemoteData = remoteDescriptionEditor.value;
	var dataObject = {};

	try {
		dataObject = JSON.parse(serializedRemoteData);
	} catch (e) {
		console.log(e);
	}
	connection.setRemoteDescription(dataObject.description);
	for (candidate of dataObject.candidates) {
		connection.addIceCandidate(candidate);
	}

	if (joinInput.checked) {
		connection.createAnswer().then((answer) => {
			dataForRemotePeer.description = answer;
			connection.setLocalDescription(answer);
		});
	}
}

function sendMessage() {
	if (!sendChannel) return;
	var messagetext = messageEditor.value;
	sendChannel.send(messagetext);
}

// Game control section

// var remoteplayer = document.getElementById('remotePlayer');
var localplayer = document.getElementById('remotePlayer');

var map = document.getElementById('map');

var upIntervalId;
var downIntervalId;
var leftIntervalId;
var rightIntervalId;

onkeydown = (event) => {
	switch (event.key) {
		case 'ArrowUp':
			onArrowUp(true);
			break;
		case 'ArrowDown':
			onArrowDown(true);
			break;
		case 'ArrowLeft':
			onArrowLeft(true);
			break;
		case 'ArrowRight':
			onArrowRight(true);
			break;
	}
};

onkeyup = (event) => {
	switch (event.key) {
		case 'ArrowUp':
			onArrowUp(false);
			break;
		case 'ArrowDown':
			onArrowDown(false);
			break;
		case 'ArrowLeft':
			onArrowLeft(false);
			break;
		case 'ArrowRight':
			onArrowRight(false);
			break;
	}
};

function onArrowUp(set) {
	if (set) {
		if (!upIntervalId) {
			upIntervalId = setInterval(() => {
				if (localplayer.offsetTop - map.offsetTop > 0) {
					var offset = localplayer.offsetTop - map.offsetTop;
					console.log(offset);
					localplayer.style.top = localplayer.offsetTop - map.offsetTop - 3;
					// console.log(localplayer.offsetTop - map.offsetTop);
					sendLocalPlayerPosition();
				}
			}, 15);
		}
	} else {
		clearInterval(upIntervalId);
		upIntervalId = null;
	}
}

function onArrowDown(set) {
	if (set) {
		if (!downIntervalId) {
			downIntervalId = setInterval(() => {
				if (localplayer.offsetTop - map.offsetTop < 450) {
					localplayer.style.top = localplayer.offsetTop - map.offsetTop + 3;
					sendLocalPlayerPosition();
				}
			}, 15);
		}
	} else {
		clearInterval(downIntervalId);
		downIntervalId = null;
	}
}

function onArrowRight(set) {
	if (set) {
		if (!rightIntervalId) {
			rightIntervalId = setInterval(() => {
				if (localplayer.offsetLeft - map.offsetLeft < 450) {
					localplayer.style.left = localplayer.offsetLeft - map.offsetLeft + 3;
					sendLocalPlayerPosition();
				}
			}, 15);
		}
	} else {
		clearInterval(rightIntervalId);
		rightIntervalId = null;
	}
}

function onArrowLeft(set) {
	if (set) {
		if (!leftIntervalId) {
			leftIntervalId = setInterval(() => {
				if (localplayer.offsetLeft - map.offsetLeft > 0) {
					localplayer.style.left = localplayer.offsetLeft - map.offsetLeft - 3;
					sendLocalPlayerPosition();
				}
			}, 15);
		}
	} else {
		clearInterval(leftIntervalId);
		leftIntervalId = null;
	}
}

function updateRemotePlayerPosition(position) {
	var positionObject = JSON.parse(position);
	remoteplayer.style.top = positionObject.top;
	remoteplayer.style.left = positionObject.left;
}

function sendLocalPlayerPosition() {
	var position = {};
	position.top = localplayer.offsetTop - map.offsetTop;
	position.left = localplayer.offsetLeft - map.offsetLeft;
	sendChannel.send(JSON.stringify(position));
}
