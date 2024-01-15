import * as utils from "./utils.js";
import * as ui from "./ui.js";
import * as wsController from "./websocket-controller.js";
let controller = null;
window.onload = function () {
    ui.init();
    controller = new wsController.Controller();
    var os = utils.getPlatform();
    if (os === "MacOS" || os === "iOS") {
        ui.showMessage(
            "The demo is not supported on iOS yet.",
            () => {
                $("body").html("");
            },
            "error",
            "Exit"
        );
    }
};

window.onbeforeunload = function () {
    controller.destroy();
};
