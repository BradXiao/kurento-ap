import * as wsService from "./websocket-service.js";
import * as ui from "./ui.js";

export class Controller {
    /**@type {WebSocket} */
    #ws = null;
    /** @type {wsService.Service} */
    #service = null;

    constructor() {
        //init websocket
        console.log("init");
        this.#ws = new WebSocket("wss://" + location.host + location.pathname + "/objdet");
        this.#ws.onmessage = (msg) => {
            this.#onmessage(this, msg);
        };
        this.#ws.onclose = (ev) => {
            this.#onclose(this, ev);
        };
        this.#ws.onopen = (ev) => {
            this.#onopen(this, ev);
        };
        this.#service = new wsService.Service(this.#ws);
    }

    /**
     *
     * @param {Controller} self
     */
    #onmessage(self, message) {
        var parsedMessage = JSON.parse(message.data);
        console.info("From AP: " + message.data);
        switch (parsedMessage.id) {
            case "turnInfo":
                self.#service.handleTurnInfo(parsedMessage);
                break;
            case "modelNames":
                self.#service.handleModelNames(parsedMessage);
                break;
            case "sdpAnswer":
                self.#service.handleSdpAnswer(parsedMessage);
                break;
            case "connected":
                self.#service.handleConnected();
                break;
            case "error":
                self.#service.handleError(parsedMessage.message);
                self.destroy();
                break;
            case "iceCandidate":
                this.#service.handleIceCandidate(parsedMessage.candidate);
                break;
            default:
                this.#service.handleError(parsedMessage);
                self.destroy();
        }
    }

    /**
     *
     * @param {Controller} self
     * @param {*} ev
     */
    #onclose(self, ev) {
        console.log("web socket clsoed");
        if (ev.wasClean == false) {
            console.error("websocket closing was not clean");
            console.error("websocket close code is" + ev.code);
            console.error("websocket reason is " + ev.reason);
            ui.showMessage(
                "Connection is lost, please try again.",
                () => {
                    ui.showLoading("Reloading...");
                    location.reload();
                },
                "error",
                "Reload"
            );
        }

        self.#ws = null;
    }

    /**
     *
     * @param {Controller} self
     * @param {*} ev
     */
    #onopen(self, ev) {
        console.log("websocket is open");
        self.#service.sendMessage({ id: "initSession" });
    }

    destroy() {
        if (this.#service !== null) {
            this.#service.destroy();
        }

        if (this.#ws !== null) {
            this.#ws.close();
        }
    }
}
