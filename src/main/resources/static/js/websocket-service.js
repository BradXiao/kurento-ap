import * as utils from "./utils.js";
import * as ui from "./ui.js";
/**
 * @type {Service}
 */
let self = null;

export class Service {
    /**@type {WebSocket} */
    #ws = null;
    #webRtcPeer = null;
    #blinkTimerId = null;
    #heartbeatTimerId = null;
    #turnInfo = null;
    #selectedModel = null;

    constructor(ws) {
        self = this;
        this.#ws = ws;
        $("#btnStart").on("click", self.start);
        $("#btnStop").on("click", self.stop);
    }

    handleTurnInfo(parsedMessage) {
        self.#turnInfo = {
            server: parsedMessage.turnserver,
            username: parsedMessage.username,
            credential: parsedMessage.credential,
        };
    }

    handleModelNames(parsedMessage) {
        //todo
        self.#selectedModel = parsedMessage["names"][0];
        self.sendMessage({ id: "changeModel", newModelName: self.#selectedModel });
    }

    start() {
        console.log("start");
        self.#blinkTimerId = ui.showBlinks();
        var options = {
            localVideo: document.getElementById("videoInput"),
            remoteVideo: document.getElementById("videoOutput"),
            onicecandidate: self.onIceCandidate,
            mediaConstraints: {
                video: true,
                audio: false,
            },
            configuration: {
                iceServers: [
                    {
                        url: "turn:" + self.#turnInfo.server,
                        username: self.#turnInfo.username,
                        credential: self.#turnInfo.credential,
                    },
                ],
                iceTransportPolicy: "relay",
            },
        };

        self.#webRtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function (error) {
            if (error) {
                return console.error(error);
            }

            self.#webRtcPeer.generateOffer((error, offerSdp) => {
                if (error) {
                    console.error(error);
                    return;
                }

                self.sendMessage({ id: "initKMSSession", sdpOffer: offerSdp });
            });
        });
    }

    stop() {
        console.log("stop");
        ui.hideBlinks(self.#blinkTimerId);
        if (self.#webRtcPeer) {
            self.#webRtcPeer.dispose();
            self.#webRtcPeer = null;
            self.sendMessage({ id: "stop" });
        }

        if (self.#heartbeatTimerId != null) {
            clearInterval(self.#heartbeatTimerId);
        }
    }

    handleConnected() {
        if (self.#blinkTimerId != null) {
            clearInterval(self.#blinkTimerId);
            self.#blinkTimerId = null;
        }

        self.#heartbeatTimerId = setInterval(() => {
            self.sendMessage({ id: "heartbeat" });
        }, 30000);
        $("video").css("opacity", 1);

        self.sendMessage({ id: "getModelNames" });
    }

    handleError(error) {
        console.error(error);
        ui.showMessage(error, () => $("html").html(""), "error", "Exit");
    }

    onIceCandidate(candidate) {
        var message = {
            id: "onIceCandidate",
            candidate: candidate,
        };
        self.sendMessage(message);
    }

    handleSdpAnswer(message) {
        self.#webRtcPeer.processAnswer(message.sdpAnswer, function (error) {
            if (error) {
                alert(error);
            }
        });
    }

    handleIceCandidate(candidate) {
        self.#webRtcPeer.addIceCandidate(candidate, function (error) {
            if (error) {
                console.error(error);
                return;
            }
        });
    }

    sendMessage(message) {
        var jsonMessage = JSON.stringify(message);
        console.log("To AP: " + jsonMessage);
        self.#ws.send(jsonMessage);
    }

    destroy() {
        if (this.#heartbeatTimerId != null) {
            clearInterval(this.#heartbeatTimerId);
        }

        self.sendMessage({ id: "destroy" });

        if (self.#heartbeatTimerId != null) {
            clearInterval(self.#heartbeatTimerId);
        }
    }
}
