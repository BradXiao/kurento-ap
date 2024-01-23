import * as ui from "./ui.js";
import * as wsController from "./websocket-controller.js";
let controller = null;
window.onload = function () {
    ui.init();
    controller = new wsController.Controller();
};

window.onbeforeunload = function () {
    controller.destroy();
};
