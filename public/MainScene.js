class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: "MainScene" });

        this.speed = 10;
        this.iceCandidates = [];
        this.isChannelOpen = false;
        this.buffer = [];
        this.counter = 1;
        this.lastnNumber = 0;

        const config = {
            'iceServers': [
                { 'urls': 'stun:stun.l.google.com:19302' },
                // turn here
            ]
        }

        this.peerConnection = new RTCPeerConnection(config);
    }

    preload() {
        this.load.image("player1", 'assets/player1.png');
    }

    create() {
        this.player1 = this.add.image(400, 300, 'player1');
        this.player2 = this.add.image(200, 300, 'player1');

        this.keyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        this.keyUp = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.keyDown = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);


        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("incoming candidate");
                this.iceCandidates.push(event.candidate);
            } else {
                console.log("ice candidates gathering finished", this.iceCandidates);
                console.log(JSON.stringify({
                    sessionDescription: this.peerConnection.localDescription,
                    iceCandidates: this.iceCandidates
                }));
            }
        }

        this.peerConnection.ondatachannel = (remoteChannel) => {
            remoteChannel.channel.onmessage = (message) => {
                var recievedObject = JSON.parse(message.data);
                var currentNumber = recievedObject.number;
                var diff = currentNumber - this.lastnNumber;
                this.lastnNumber = currentNumber;

                this.buffer.push(recievedObject.position);

                if (diff != 1) {
                    console.log(`omitted message. Difference: ${diff}`);
                }
            }
        }

        this.dataChannel = this.peerConnection.createDataChannel("localDataChanel");
        this.dataChannel.onopen = (event) => {
            console.log("channel opened: ", event);
            this.isChannelOpen = true;
        };
        this.dataChannel.onclose = (event) => {
            console.log("channel closed: ", event);
            this.isChannelOpen = false;
        };

        document.getElementById("button_create_game").onclick = () => {
            this.iceCandidates = [];

            this.peerConnection.createOffer()
                .then(rtcSessionDescription => this.peerConnection.setLocalDescription(rtcSessionDescription))
                .then(() => console.log("kokotko"));
        }

        document.getElementById("button_join_game").onclick = () => {
            var token = JSON.parse(document.getElementById("input_token").value);
            this.iceCandidates = [];

            this.peerConnection.setRemoteDescription(token.sessionDescription)
                .then(() => this.peerConnection.createAnswer())
                .then(rtcSessionDescription => this.peerConnection.setLocalDescription(rtcSessionDescription))
                .then(() => token.iceCandidates.forEach(element => this.peerConnection.addIceCandidate(element)
                    .then(() => console.log("ice candidate added"))));
        }

        document.getElementById("button_set_answer").onclick = () => {
            var token = JSON.parse(document.getElementById("input_token").value);

            this.peerConnection.setRemoteDescription(token.sessionDescription)
                .then(() => token.iceCandidates.forEach(element => this.peerConnection.addIceCandidate(element)
                    .then(() => console.log("ice candidate added"))));
        }
    }

    update(delta) {
        if (this.keyLeft.isDown) {
            this.player1.x -= this.speed;
        }

        if (this.keyRight.isDown) {
            this.player1.x += this.speed;
        }

        if (this.keyUp.isDown) {
            this.player1.y -= this.speed;
        }

        if (this.keyDown.isDown) {
            this.player1.y += this.speed;
        }

        var position = {
            x: this.player1.x,
            y: this.player1.y
        }

        this.sendLocalPlayerPosition(position);
        this.setRemotePlayerPosition();
    }

    setRemotePlayerPosition() {
        if (this.buffer.length > 0) {
            var remotePlayerPosition = this.buffer.shift();
            this.player2.x = remotePlayerPosition.x;
            this.player2.y = remotePlayerPosition.y;
        }
    }

    sendLocalPlayerPosition(position) {
        if (this.isChannelOpen) {
            var data = {
                position: position,
                number: this.counter
            };
            this.dataChannel.send(JSON.stringify(data));
            this.counter++;
        }
    }
}