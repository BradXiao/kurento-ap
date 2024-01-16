import * as utils from "./utils.js";
import * as ui from "./ui.js";
import * as wsController from "./websocket-controller.js";
let controller = null;
window.onload = function () {
    ui.init();
    controller = new wsController.Controller();
    var plat = utils.getPlatform();
    if (plat.os === "MacOS") {
        ui.showMessage("The demo is currently only supported on Windows, Android and iOS.", null, "error");
    } else if (plat.os === "iOS" && plat.browser === "chrome") {
        ui.showMessage("The demo currently only supports Safari on iOS.", null, "error");
    } else if (plat.browser === "firefox") {
        ui.showMessage("The demo currently only supports Chrome and Safari.", null, "error");
    }
};

window.onbeforeunload = function () {
    controller.destroy();
};
