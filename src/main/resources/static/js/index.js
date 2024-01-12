import * as utils from "./utils.js";
import * as ui from "./ui.js";
let ws = null;
let webRtcPeer;
let blinkTimerId = null;
let heartbeatTimerId = null;
let turnInfo = null;
let selectedModel = null;
window.onload = function () {
    startWs();
    ui.init();
};

function startWs() {
    //init websocket
    console.log("init");
    ws = new WebSocket("wss://" + location.host + location.pathname + "/objdet");

    ws.onmessage = function (message) {
        var parsedMessage = JSON.parse(message.data);
        console.info("From AP: " + message.data);
        switch (parsedMessage.id) {
            case "turnInfo":
                handleTurnInfo(parsedMessage);
                break;
            case "modelNames":
                handleModelNames(parsedMessage);
                break;
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
    ws.onclose = function (ev) {
        ws = null;
        if (heartbeatTimerId != null) {
            clearInterval(heartbeatTimerId);
        }
    };
    ws.onopen = function (ev) {
        sendMessage({ id: "initSession" });
    };
}

function handleTurnInfo(parsedMessage) {
    turnInfo = {
        server: parsedMessage.turnserver,
        username: parsedMessage.username,
        credential: parsedMessage.credential,
    };
}

function handleModelNames(parsedMessage) {
    //todo
    selectedModel = parsedMessage["names"][0];
    sendMessage({ id: "changeModel", newModelName: selectedModel });
}

function start() {
    console.log("start");
    if (ws == null) {
        startWs();
    }

    showBlinks();

    var options = {
        localVideo: document.getElementById("videoInput"),
        remoteVideo: document.getElementById("videoOutput"),
        onicecandidate: onIceCandidate,
        mediaConstraints: {
            video: true,
            audio: false,
        },
        configuration: {
            iceServers: [
                {
                    url: "turn:" + turnInfo.server,
                    username: turnInfo.username,
                    credential: turnInfo.credential,
                },
            ],
            iceTransportPolicy: "relay",
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

            sendMessage({ id: "initKMSSession", sdpOffer: offerSdp });
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

    if (heartbeatTimerId != null) {
        clearInterval(heartbeatTimerId);
    }
}

function handleConnected() {
    if (blinkTimerId != null) {
        clearInterval(blinkTimerId);
        blinkTimerId = null;
    }

    heartbeatTimerId = setInterval(() => {
        sendMessage({ id: "heartbeat" });
    }, 30000);
    $("video").css("opacity", 1);

    sendMessage({ id: "getModelNames" });
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
    blinkTimerId = setInterval(() => {
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
    if (blinkTimerId != null) {
        clearInterval(blinkTimerId);
        blinkTimerId = null;
    }
}

window.onbeforeunload = function () {
    ws.close();
};
