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
    #isInferring = false;
    #deviceId = null;
    #relayServer = null;
    #usePrevParam = false;
    #platform = null;
    #displayMode = "local";
    #isRelayConnected = false;
    #relayTimerId = null;
    #relayCheckCounter = 0;

    constructor(ws) {
        self = this;
        this.#ws = ws;
        this.#initComponents();
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
        $("#btnSettingsApply").on("click", async function () {
            ui.showLoading("Apply new settings...");
            ui.hideSettings();
            self.#applySettings();
        });

        $("#btnSettingsCancel").on("click", function () {
            ui.hideSettings();
            self.sendMessage({ id: "getSettings" });
        });
    }

    async #initWebcams() {
        const webcams = await utils.getWebcams();
        if (webcams.length == 0) {
            self.#deviceId = null;
            ui.showMessage("No video source is available. The demo will not work.", null, "error");
            return;
        }

        $("#selectVideoSrc").empty();
        for (var i = 0; i < webcams.length; i += 1) {
            var newOption = $("<option>", {
                value: webcams[i].deviceId,
                text: webcams[i].name,
            });
            $("#selectVideoSrc").append(newOption);
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
                    $("#selectVideoSrc").val(webcams[i].deviceId);
                    break;
                }
            }

            if (isDetected == false) {
                //not detected, the last is usually the back cambera
                $("#selectVideoSrc option:last").prop("selected", true);
            }
        } else {
            $("#selectVideoSrc").val(webcams[0].deviceId);
        }

        if (self.#deviceId !== null) {
            $("#selectVideoSrc").val(self.#deviceId);
        } else {
            self.#deviceId = $("#selectVideoSrc").val();
        }
    }

    handleTurnInfo(parsedMessage) {
        self.#turnInfo = {
            turnname1: parsedMessage.turnname1,
            turnip1: parsedMessage.turnip1,
            turnname2: parsedMessage.turnname2,
            turnip2: parsedMessage.turnip2,
            username: parsedMessage.username,
            credential: parsedMessage.credential,
        };
        $("#selectRelay").empty();

        $("#selectRelay").append(
            $("<option>", {
                value: self.#turnInfo.turnname1,
                text: self.#turnInfo.turnname1,
            })
        );
        $("#selectRelay").val(self.#turnInfo.turnname1);
        self.#relayServer = self.#turnInfo.turnname1;
        if (self.#turnInfo.turnname2 !== "") {
            $("#selectRelay").append(
                $("<option>", {
                    value: self.#turnInfo.turnname2,
                    text: self.#turnInfo.turnname2,
                })
            );
        }
    }

    handleModelNames(parsedMessage) {
        var models = parsedMessage["names"];
        $("#selectModel").empty();
        for (var i = 0; i < models.length; i += 1) {
            var newOption = $("<option>", {
                value: models[i],
                text: models[i],
            });
            $("#selectModel").append(newOption);
        }
    }

    #startPauseStreaming() {
        if (self.#platform.os === "MacOS") {
            ui.showMessage(
                "Oops! The demo is currently only supported on Windows, Android and iOS. The demo will not work.",
                null,
                "error"
            );
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
        await ui.showLoading("Webcam initializing...");
        await self.#initWebcams();
        await ui.showLoading("Prepare streaming...");
        ui.clearDetectedObjs();
        let turnip = "";
        if (self.#relayServer === self.#turnInfo.turnname1) {
            turnip = self.#turnInfo.turnip1;
        } else {
            turnip = self.#turnInfo.turnip2;
        }

        let config;
        if (this.#platform.os === "iOS" || this.#platform.browser === "firefox") {
            config = {
                iceServers: [
                    {
                        urls: "turn:" + turnip,
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
                        url: "turn:" + turnip,
                        username: self.#turnInfo.username,
                        credential: self.#turnInfo.credential,
                    },
                ],
                iceTransportPolicy: "relay",
            };
        }

        var options = {
            localVideo: document.getElementById("videoInput"),
            onicecandidate: self.onIceCandidate,
            mediaConstraints: {
                video: { deviceId: this.#deviceId, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false,
            },
            configuration: config,
        };
        if (self.#displayMode === "remote") {
            options.remoteVideo = document.getElementById("videoOutput");
        }

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
                self.sendMessage({ id: "initKMSSession", sdpOffer: offerSdp, turnserver: self.#relayServer });
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
        ui.setStreamOverlay("pause");
        ui.clearObjCanvas();
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
            ui.setStreamOverlay("recognition");
        } else {
            ui.setStreamOverlay("stream");
        }

        ui.clearObjCanvas();
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
        ui.setStreamOverlay("stop");
        ui.clearObjCanvas();
    }

    async handleConnected() {
        self.#isRelayConnected = true;
        ui.showLoading("Preparing recognition core...");
        self.#heartbeatTimerId = setInterval(() => {
            self.sendMessage({ id: "heartbeat" });
        }, 30000);
        $("video").css("opacity", 1);

        self.sendMessage({ id: "getModelNames" });

        $("#btnStartPause")
            .html('<i class="bi bi-pause"></i> <span>Pause</span>')
            .removeClass("btn-1")
            .removeClass("btn-primary")
            .addClass("btn-warning");
        $("#btnStop").prop("disabled", false);
        self.sendMessage({ id: "setInferring", sw: "true" });
        if (self.#usePrevParam === true) {
            self.sendMessage({ id: "setConfi", confi: $("#rangeConfi").val() });
            self.sendMessage({ id: "setBoxLimit", maxNum: $("#rangeBoxLimit").val() });
            self.sendMessage({ id: "setInferringDelay", delayMs: $("#rangeInferDelay").val() });
            self.sendMessage({ id: "setDrawing", sw: $("#swDspBoxes").is(":checked") });
            self.sendMessage({ id: "changeModel", newModelName: $("#selectModel").val() });
            self.sendMessage({ id: "setRelay", name: $("#selectRelay").val() });
            self.sendMessage({ id: "setDspMode", mode: $("#selectDisplayMode").val() });
            self.#usePrevParam = false;
        }

        self.#isInferring = true;
        ui.setStreamOverlay("recognition");
        self.sendMessage({ id: "getSettings" });
    }

    async handleSettings(parsedMessage) {
        $("#rangeConfi").val(parsedMessage.confi).trigger("input");
        $("#rangeBoxLimit").val(parsedMessage.boxLimit).trigger("input");
        $("#rangeInferDelay").val(parsedMessage.inferringDelay).trigger("input");
        $("#swDspBoxes").prop("checked", parsedMessage.isDrawing === "true" ? true : false);
        $("#selectModel").val(parsedMessage.model);
        $("#selectRelay").val(parsedMessage.relay);
        $("#selectDisplayMode").val(parsedMessage.dspMode);
        $("#rangeConfi").val(parsedMessage.confi);

        await utils.sleep(1000);
        if (
            self.#deviceId !== $("#selectVideoSrc").val() ||
            self.#relayServer !== $("#selectRelay").val() ||
            self.#displayMode !== $("#selectDisplayMode").val()
        ) {
            self.#deviceId = $("#selectVideoSrc").val();
            self.#relayServer = $("#selectRelay").val();
            self.#displayMode = $("#selectDisplayMode").val();
            self.#usePrevParam = true;
            self.#stopStreaming();
            self.#startStreaming();
            return;
        }

        if (parsedMessage.dspMode === "local") {
            $("#videoInput").show();
            $("#videoOutput").hide();
        } else {
            $("#videoInput").hide();
            $("#videoOutput").show();
        }

        if ($("div[id=settings]:visible,  div[id=dialog]:visible").length == 0) {
            ui.hideLoading();
        }

        if ($("#settings").is(":visible") !== true) {
            if ($("#divObjWrapper").is(":visible") == false) {
                $("#divObjWrapper").css("min-height", "0").show();
                gsap.fromTo(
                    "#divObjWrapper",
                    { "min-height": "0" },
                    {
                        "min-height": "4.8rem",
                        duration: 1,
                    }
                );
            }
        }
    }

    async handleBoxDetected(parsedMessage) {
        const boxes = JSON.parse(parsedMessage.data);
        ui.clearObjCanvas();
        for (let i = 0; i < boxes.length; i += 1) {
            await ui.insertObj(boxes[i].name);
        }
    }

    async handleBoxDetectedForCanvas(parsedMessage) {
        let targetWidth = $("#div-demo").find("div[class='video-on'").width();
        let targetHeight = $("#div-demo").find("div[class='video-on'").height();
        if (
            $("#boxCanvas").attr("targetWidth") === undefined ||
            $("#boxCanvas").attr("targetWidth") != `${targetWidth}` ||
            $("#boxCanvas").attr("targetHeight") != `${targetHeight}`
        ) {
            ui.updateObjCanvasScale();
            $("#boxCanvas").attr("targetWidth", targetWidth);
            $("#boxCanvas").attr("targetHeight", targetHeight);
        }

        const boxes = JSON.parse(parsedMessage.data);
        ui.clearObjCanvas();
        ui.drawObjOnCanvas(boxes);
    }

    handleError(error) {
        console.error(error);
        ui.showMessage(
            error,
            () => {
                ui.showLoading("Reloading...");
                location.reload();
            },
            "error",
            "Retry"
        );
        self.#stopStreaming();
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
        self.#startCheckingRelay();
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
        self.sendMessage({ id: "setBoxLimit", maxNum: $("#rangeBoxLimit").val() });
        self.sendMessage({ id: "setInferringDelay", delayMs: $("#rangeInferDelay").val() });
        self.sendMessage({ id: "setDrawing", sw: $("#swDspBoxes").is(":checked") });
        self.sendMessage({ id: "changeModel", newModelName: $("#selectModel").val() });
        self.sendMessage({ id: "setRelay", name: $("#selectRelay").val() });
        self.sendMessage({ id: "setDspMode", mode: $("#selectDisplayMode").val() });
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
                msg = "Unknown error! Please make sure webcam is available and not not being used.";
                console.error(error.name);
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

    #startCheckingRelay() {
        self.#isRelayConnected = false;
        self.#relayTimerId = null;
        self.#relayCheckCounter = 0;

        self.#relayTimerId = setInterval(() => {
            if (self.#isRelayConnected == true) {
                clearInterval(self.#relayTimerId);
                return;
            }

            self.#relayCheckCounter += 1;
            if (self.#relayCheckCounter > 10) {
                console.warn("Streaming did not respond, switch relay server");
                clearInterval(self.#relayTimerId);
                ui.showLoading("Switching relay server...");
                self.#stopStreaming();
                let newTurnName;
                if (self.#turnInfo.turnname1 === $("#selectRelay").val()) {
                    newTurnName = self.#turnInfo.turnname2;
                } else {
                    newTurnName = self.#turnInfo.turnname1;
                }

                self.#relayServer = newTurnName;
                ui.showLoading("Restart streaming...");
                self.#startStreaming();
            }
        }, 1000);
    }
}
