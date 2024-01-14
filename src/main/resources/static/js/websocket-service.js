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
    #heartbeatTimerId = null;
    #turnInfo = null;
    #selectedModel = null;

    constructor(ws) {
        self = this;
        this.#ws = ws;
        this.#initComponents();
    }

    #initComponents() {
        //// btns
        $("#btnStartPause").on("click", self.#startPauseStreaming);
        $("#btnStop").on("click", self.#stopStreaming).prop("disabled", true);
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

    #startPauseStreaming() {
        if ($("#btnStartPause").text() === "Start") {
            self.#startStreaming();
        } else if ($("#btnStartPause").text() === "Pause") {
            self.#pauseStreaming();
        } else if ($("#btnStartPause").text() === "Resume") {
            self.#resumeStreaming();
        } else {
            console.error("unknown command");
        }
    }

    #startStreaming() {
        console.log("start");
        ui.showLoading("Prepare streaming...");

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
        ui.showLoading("Create streaming...");
        self.#webRtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function (error) {
            if (error) {
                self.#handleWebRtcError(error);
                return;
            }

            self.#webRtcPeer.generateOffer((error, offerSdp) => {
                if (error) {
                    console.error(error);
                    return;
                }

                ui.showLoading("Create recognition session...");
                self.sendMessage({ id: "initKMSSession", sdpOffer: offerSdp });
            });
        });
    }

    #pauseStreaming() {
        $("#videoInput")[0]
            .srcObject.getTracks()
            .forEach((t) => (t.enabled = !t.enabled));
        $("#btnStartPause").text("Resume");
    }

    #resumeStreaming() {
        $("#videoInput")[0]
            .srcObject.getTracks()
            .forEach((t) => (t.enabled = !t.enabled));
        $("#btnStartPause").text("Pause");
    }

    #stopStreaming() {
        console.log("stop");
        if (self.#webRtcPeer) {
            self.#webRtcPeer.dispose();
            self.#webRtcPeer = null;
            self.sendMessage({ id: "stop" });
        }

        if (self.#heartbeatTimerId != null) {
            clearInterval(self.#heartbeatTimerId);
        }

        $("#btnStartPause").text("Start");
    }

    handleConnected() {
        self.#heartbeatTimerId = setInterval(() => {
            self.sendMessage({ id: "heartbeat" });
        }, 30000);
        $("video").css("opacity", 1);

        self.sendMessage({ id: "getModelNames" });

        $("#btnStartPause").text("Pause");
        $("#btnStop").prop("disabled", false);
        ui.hideLoading();
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

    #handleWebRtcError(error) {
        var msg = "";
        switch (error.name) {
            case "NotFoundError":
            case "DevicesNotFoundError":
                msg = "There is no webcam found on your device!";
                break;
            case "AbortError":
            case "NotAllowedError":
                msg = "You or your system denied permission to use webcams!";
                break;
            case "OverconstrainedError":
                msg = "Your webcam cannot be satisfied!";
                break;
            default:
                msg = "Unknown error! Cannot create streaming!";
                break;
        }

        ui.showMessage(
            msg,
            () => {
                location.reload();
            },
            "error",
            "Reload"
        );
    }
}
