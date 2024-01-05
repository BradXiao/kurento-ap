let ws = null;
let webRtcPeer;
let blinkPromiseID = null;

window.onload = function () {
    //init websocket
    console.log("init");
    ws = new WebSocket("wss://" + location.host + "/objdet");

    ws.onmessage = function (message) {
        var parsedMessage = JSON.parse(message.data);
        console.info("From AP: " + message.data);
        switch (parsedMessage.id) {
            case "sdpAnswer":
                handleSdpAnswer(parsedMessage);
                break;
            case "connected":
                handleConnected();
                break;
            case "error":
                handleError(parsedMessage.message);
                break;
            case "iceCandidate":
                handleIceCandidate(parsedMessage.candidate);
                break;
            default:
                handleError(parsedMessage);
        }
    };
};

function start() {
    console.log("start");
    showBlinks();

    var options = {
        localVideo: document.getElementById("videoInput"),
        remoteVideo: document.getElementById("videoOutput"),
        onicecandidate: onIceCandidate,
        mediaConstraints: {
            video: true,
            audio: false,
        },
    };

    webRtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function (error) {
        if (error) {
            return console.error(error);
        }

        webRtcPeer.generateOffer((error, offerSdp) => {
            if (error) {
                console.error(error);
                return;
            }

            var message = {
                id: "start",
                sdpOffer: offerSdp,
            };
            sendMessage(message);
        });
    });
}

function stop() {
    console.log("stop");
    hideBlinks();
    if (webRtcPeer) {
        webRtcPeer.dispose();
        webRtcPeer = null;
        sendMessage({ id: "stop" });
    }
}

function handleConnected() {
    if (blinkPromiseID != null) {
        clearInterval(blinkPromiseID);
        blinkPromiseID = null;
    }

    $("video").css("opacity", 1);
}

function handleError(error) {
    console.error(error);
    ws.close();
    ws = null;
}

function onIceCandidate(candidate) {
    var message = {
        id: "onIceCandidate",
        candidate: candidate,
    };
    sendMessage(message);
}

function handleSdpAnswer(message) {
    webRtcPeer.processAnswer(message.sdpAnswer, function (error) {
        if (error) {
            alert(error);
        }
    });
}

function handleIceCandidate(candidate) {
    webRtcPeer.addIceCandidate(candidate, function (error) {
        if (error) {
            console.error(error);
            return;
        }
    });
}

function sendMessage(message) {
    var jsonMessage = JSON.stringify(message);
    console.log("To AP: " + jsonMessage);
    ws.send(jsonMessage);
}

function showBlinks() {
    $("#btnStart").prop("disabled", true);
    $("#btnStop").prop("disabled", false);
    blinkPromiseID = setInterval(() => {
        if ($("video").eq(0).css("opacity") != 1) {
            $("video").css("opacity", 1);
        } else {
            $("video").css("opacity", 0.5);
        }
    }, 300);
}

function hideBlinks() {
    $("#btnStart").prop("disabled", false);
    $("#btnStop").prop("disabled", true);
    $("video").attr("poster", "img/webrtc.png");
    $("video").css("opacity", 1);
    if (blinkPromiseID != null) {
        clearInterval(blinkPromiseID);
        blinkPromiseID = null;
    }
}

window.onbeforeunload = function () {
    ws.close();
};
