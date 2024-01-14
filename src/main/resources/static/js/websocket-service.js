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
    #streamingMode = 1;
    #isInferring = false;

    constructor(ws) {
        self = this;
        this.#ws = ws;
        this.#initComponents();
    }

    #initComponents() {
        //// btns
        $("#btnStartPause").on("click", self.#startPauseStreaming);
        $("#btnStop").on("click", self.#stopStreaming).prop("disabled", true);
        $("#btnSettings")
            .on("click", function () {
                ui.showSettings();
            })
            .prop("disabled", true);
        $("#btnHelp").on("click", function () {
            ui.showMessage("This function is still developing.");
        });
        if (self.#streamingMode === 1) {
            $("#videoInput").hide();
            $("#videoOutput").show();
        }

        $("#btnStsApply").on("click", async function () {
            ui.showLoading("Apply new settings...");
            ui.hideSettings();
            self.#applySettings();
        });

        $("#btnStsCancel").on("click", function () {
            ui.hideSettings();
            self.sendMessage({ id: "getSettings" });
        });
    }

    handleTurnInfo(parsedMessage) {
        self.#turnInfo = {
            server: parsedMessage.turnserver,
            username: parsedMessage.username,
            credential: parsedMessage.credential,
        };
    }

    handleModelNames(parsedMessage) {
        var models = parsedMessage["names"];
        $("#selModel").empty();
        for (var i = 0; i < models.length; i += 1) {
            var newOption = $("<option>", {
                value: models[i],
                text: models[i],
            });
            $("#selModel").append(newOption);
        }
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

    async #startStreaming() {
        console.log("start");
        await ui.showLoading("Prepare streaming...");

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
        await ui.showLoading("Create streaming...");
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
        $("#btnSettings").prop("disabled", false);
    }

    #pauseStreaming() {
        $("#videoInput")[0]
            .srcObject.getTracks()
            .forEach((t) => (t.enabled = !t.enabled));
        $("#btnStartPause").text("Resume");
        ui.setStrmOverlay("pause");
    }

    #resumeStreaming() {
        $("#videoInput")[0]
            .srcObject.getTracks()
            .forEach((t) => (t.enabled = !t.enabled));
        $("#btnStartPause").text("Pause");
        if (self.#isInferring === true) {
            ui.setStrmOverlay("recog");
        } else {
            ui.setStrmOverlay("strm");
        }
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
        $("#btnStop").prop("disabled", true);
        ui.setStrmOverlay("stop");
        $("#btnSettings").prop("disabled", true);
    }

    async handleConnected() {
        ui.showLoading("Preparing recognition core...");
        self.#heartbeatTimerId = setInterval(() => {
            self.sendMessage({ id: "heartbeat" });
        }, 30000);
        $("video").css("opacity", 1);

        self.sendMessage({ id: "getModelNames" });
        if (self.#streamingMode === 1) {
            $("#videoInput").hide();
            $("#videoOutput").show();
        } else if (self.#streamingMode === 2) {
        }

        $("#btnStartPause").text("Pause");
        $("#btnStop").prop("disabled", false);
        self.sendMessage({ id: "setInferring", sw: "true" });
        self.sendMessage({ id: "setInferringDelay", delayMs: 500 });
        self.sendMessage({ id: "setDrawing", sw: "true" });
        self.#isInferring = true;
        ui.setStrmOverlay("recog");
        self.sendMessage({ id: "getSettings" });
    }

    async handleSettings(parsedMessage) {
        $("#rangeConfi").val(parsedMessage.confi).trigger("input");
        $("#rangeBoxLmt").val(parsedMessage.boxLimit).trigger("input");
        $("#rangeInferDly").val(parsedMessage.inferringDelay).trigger("input");
        $("#swDspBoxes").prop("checked", parsedMessage.isDrawing === "true" ? true : false);
        $("#selModel").val(parsedMessage.model);
        $("#selRelay").val(parsedMessage.relay);
        $("#selDisplayMode").val(parsedMessage.dspMode);
        $("#rangeConfi").val(parsedMessage.confi);

        await utils.sleep(1000);
        if ($("#settings").is(":visible") !== true) {
            ui.hideLoading();
        }
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

    #applySettings() {
        self.sendMessage({ id: "setConfi", confi: $("#rangeConfi").val() });
        self.sendMessage({ id: "setBoxLimit", maxNum: $("#rangeBoxLmt").val() });
        self.sendMessage({ id: "setInferringDelay", delayMs: $("#rangeInferDly").val() });
        self.sendMessage({ id: "setDrawing", sw: $("#swDspBoxes").is(":checked") });
        self.sendMessage({ id: "changeModel", newModelName: $("#selModel").val() });
        self.sendMessage({ id: "setRelay", name: $("#selRelay").val() });
        self.sendMessage({ id: "setDspMode", mode: $("#selDisplayMode").val() });
        self.sendMessage({ id: "getSettings" });
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
