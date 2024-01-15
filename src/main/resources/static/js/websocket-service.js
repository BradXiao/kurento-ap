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
    #defaultDeviceId = null;
    #usePrevParam = false;
    #platform = null;

    constructor(ws) {
        self = this;
        this.#ws = ws;
        this.#initComponents();
        this.#initWebcams();
        this.#platform = utils.getPlatform();
    }

    #initComponents() {
        //// btns
        $("#btnStartPause").on("click", self.#startPauseStreaming);
        $("#btnStop").on("click", self.#stopStreaming).prop("disabled", true);
        $("#btnSettings").on("click", function () {
            ui.showSettings();
        });
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

    async #initWebcams() {
        // debugger;
        const webcams = await utils.getWebcams();
        if (webcams.length == 0) {
            this.#defaultDeviceId = null;
            ui.showMessage("No video source is available. The demo will not work.", null, "error");
            return;
        }

        $("#selVideoSrc").empty();
        for (var i = 0; i < webcams.length; i += 1) {
            var newOption = $("<option>", {
                value: webcams[i].deviceId,
                text: webcams[i].name,
            });
            $("#selVideoSrc").append(newOption);
        }

        if (webcams.length > 1) {
            // try guess to get the environmental webcam
            webcams.sort(function (a, b) {
                return a.name.localeCompare(b.name);
            });
            var isDetected = false;
            for (var i = 0; i < webcams.length; i += 1) {
                if (webcams[i].name.includes("back")) {
                    isDetected = true;
                    $("#selVideoSrc").val(webcams[i].deviceId);
                    break;
                }
            }

            if (isDetected == false) {
                //not detected, the last is usually the back cambera
                $("#selVideoSrc option:last").prop("selected", true);
            }
        } else {
            $("#selVideoSrc").val(webcams[0].deviceId);
        }

        this.#defaultDeviceId = $("#selVideoSrc").val();
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
        if (self.#platform.os === "MacOS") {
            ui.showMessage("The demo is currently only supported on Windows, Android and iOS. The demo will not work.", null, "error");
            return;
        } else if (self.#platform.os === "iOS" && self.#platform.browser === "chrome") {
            ui.showMessage("The demo currently only supports Safari on iOS. The demo will not work.", null, "error");
            return;
        } else if (self.#defaultDeviceId === null) {
            ui.showMessage("No video source is available. The demo will not work.", null, "error");
            return;
        }

        var btnText = $("#btnStartPause").text().trim();
        if (btnText === "Start") {
            self.#startStreaming();
        } else if (btnText === "Pause") {
            self.#pauseStreaming();
        } else if (btnText === "Resume") {
            self.#resumeStreaming();
        } else {
            console.error("unknown command");
        }
    }

    async #startStreaming() {
        console.log("start");
        await ui.showLoading("Prepare streaming...");
        let config;
        if (this.#platform.os === "iOS") {
            config = {
                iceServers: [
                    {
                        urls: "turn:" + self.#turnInfo.server,
                        username: self.#turnInfo.username,
                        credential: self.#turnInfo.credential,
                    },
                ],
                iceTransportPolicy: "relay",
            };
        } else {
            config = {
                iceServers: [
                    {
                        url: "turn:" + self.#turnInfo.server,
                        username: self.#turnInfo.username,
                        credential: self.#turnInfo.credential,
                    },
                ],
                iceTransportPolicy: "relay",
            };
        }

        var options = {
            localVideo: document.getElementById("videoInput"),
            remoteVideo: document.getElementById("videoOutput"),
            onicecandidate: self.onIceCandidate,
            mediaConstraints: {
                video: { deviceId: this.#defaultDeviceId },
                audio: false,
            },
            configuration: config,
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
    }

    #pauseStreaming() {
        $("#videoInput")[0]
            .srcObject.getTracks()
            .forEach((t) => (t.enabled = !t.enabled));
        $("#btnStartPause")
            .html('<i class="bi bi-play-circle"></i> <span>Resume</span>')
            .addClass("btn-s1")
            .removeClass("btn-warning")
            .addClass("btn-primary");
        ui.setStrmOverlay("pause");
    }

    #resumeStreaming() {
        $("#videoInput")[0]
            .srcObject.getTracks()
            .forEach((t) => (t.enabled = !t.enabled));
        $("#btnStartPause")
            .html('<i class="bi bi-pause"></i> <span>Pause</span>')
            .removeClass("btn-1")
            .removeClass("btn-primary")
            .addClass("btn-warning");
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

        $("#btnStartPause")
            .html('<i class="bi bi-play-circle"></i> <span>Start</span>')
            .addClass("btn-s1")
            .removeClass("btn-warning")
            .addClass("btn-primary");
        $("#btnStop").prop("disabled", true);
        ui.setStrmOverlay("stop");
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

        $("#btnStartPause")
            .html('<i class="bi bi-pause"></i> <span>Pause</span>')
            .removeClass("btn-1")
            .removeClass("btn-primary")
            .addClass("btn-warning");
        $("#btnStop").prop("disabled", false);
        self.sendMessage({ id: "setInferring", sw: "true" });
        if (self.#usePrevParam === true) {
            self.sendMessage({ id: "setConfi", confi: $("#rangeConfi").val() });
            self.sendMessage({ id: "setBoxLimit", maxNum: $("#rangeBoxLmt").val() });
            self.sendMessage({ id: "setInferringDelay", delayMs: $("#rangeInferDly").val() });
            self.sendMessage({ id: "setDrawing", sw: $("#swDspBoxes").is(":checked") });
            self.sendMessage({ id: "changeModel", newModelName: $("#selModel").val() });
            self.sendMessage({ id: "setRelay", name: $("#selRelay").val() });
            self.sendMessage({ id: "setDspMode", mode: $("#selDisplayMode").val() });
            self.#usePrevParam = false;
        } else {
            self.sendMessage({ id: "setInferringDelay", delayMs: 500 });
            self.sendMessage({ id: "setDrawing", sw: "true" });
        }

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
        if (self.#defaultDeviceId !== $("#selVideoSrc").val()) {
            self.#defaultDeviceId = $("#selVideoSrc").val();
            self.#usePrevParam = true;
            self.#stopStreaming();
            self.#startStreaming();
            return;
        }

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
                msg = "Webcams permission is denied by the user or system!";
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
