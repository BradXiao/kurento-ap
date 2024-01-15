export const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * @returns {String}
 * https://stackoverflow.com/questions/38241480/detect-macos-ios-windows-android-and-linux-os-with-js
 */
export function getPlatform() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera,
        platform = window.navigator?.userAgentData?.platform || window.navigator.platform,
        macosPlatforms = ["macOS", "Macintosh", "MacIntel", "MacPPC", "Mac68K"],
        windowsPlatforms = ["Win32", "Win64", "Windows", "WinCE"],
        iosPlatforms = ["iPhone", "iPad", "iPod"];
    let os = null;

    if (macosPlatforms.indexOf(platform) !== -1) {
        os = "MacOS";
    } else if (iosPlatforms.indexOf(platform) !== -1) {
        os = "iOS";
    } else if (windowsPlatforms.indexOf(platform) !== -1) {
        os = "Windows";
    } else if (/Android/.test(userAgent)) {
        os = "Android";
    } else if (/Linux/.test(platform)) {
        os = "Linux";
    }

    return os;
}

export async function getWebcams() {
    try {
        const deviceInfos = await navigator.mediaDevices.enumerateDevices();
        // Handles being called several times to update labels. Preserve values.
        var devices = [];
        for (let i = 0; i !== deviceInfos.length; ++i) {
            const deviceInfo = deviceInfos[i];
            if (deviceInfo.kind === "videoinput") {
                devices.push({
                    name: deviceInfo.label || `camera ${videoSelect.length + 1}`,
                    deviceId: deviceInfo.deviceId,
                });
            }
        }

        return devices;
    } catch (error) {
        console.error("Error in getting devices:", error);
        return [];
    }
}
