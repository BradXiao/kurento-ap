import * as utils from "./utils.js";
let loadingAni = null;
let dialogIconAni = null;
let blurFocusAni = null;
export function init() {
    $(".third-button").on("click", function () {
        $(".animated-icon3").toggleClass("open");
    });

    var navBtn = $("#NavBar").find("button");
    $("#navbarSupportedContent")
        .find("a")
        .each(function () {
            $(this).on("click", function (event) {
                event.preventDefault();

                var targetID = $(this).attr("href");
                if (targetID.length) {
                    gsap.to(window, {
                        duration: 1.5,
                        scrollTo: {
                            y: targetID,
                            offsetY: 40,
                            autoKill: false,
                        },

                        ease: "power3.out",
                    });
                }

                if (navBtn.is(":visible") == true && navBtn.hasClass("collapsed") == false) {
                    navBtn.trigger("click");
                }
            });
        });

    $("div[class=mainpage] > div:not(.padding) > div").each(function () {
        $(this)
            .find(">*:not(h4)")
            .each(function () {
                const revealTimeline = gsap.timeline({
                    scrollTrigger: {
                        trigger: this,
                        start: "top 100%",
                        toggleActions: "play none none none",
                    },
                });
                revealTimeline.fromTo(this, { y: 70, opacity: 0.1 }, { y: 0, opacity: 1, duration: 0.9, ease: "power4.out" });
            });
    });
    ////loading ani
    var tl = gsap.timeline({ repeat: -1 }); // Infinite repeat

    // detect people
    addAnimationGlance(tl, ".loading-computer-loadingbar", 0.25, 0, 0.1, undefined);
    addAnimationGlance(tl, ".loading-computer-people", 0.25, 0, 0.25, undefined);
    // moving to shelf
    tl.fromTo(".loading-magnifier", { left: "14%", top: "8%" }, { duration: 0.25, left: "25%", top: "50%", ease: "power1.inOut" });
    addAnimationBlink(tl, ".loading-computer-loadingbar", 0.25, 0, 0.1, "<");
    addAnimationGlance(tl, ".loading-computer-shelf", 0.25, 0, 0.25, undefined);
    // moving to box
    tl.to(".loading-magnifier", { duration: 0.25, left: "1%", top: "50%", ease: "power1.inOut" });

    addAnimationBlink(tl, ".loading-computer-loadingbar", 0.25, 0, 0.1, "<");
    addAnimationGlance(tl, ".loading-computer-deliverybox", 0.25, 0, 0.25, undefined);
    // moving to people
    tl.to(
        ".loading-magnifier",
        {
            duration: 0.25,
            left: "14%",
            top: "8%",
            ease: "power1.inOut",
        },
        "<"
    );
    addAnimationGlance(tl, ".loading-computer-loadingbar", 0.25, 0, 0.1, "<");

    loadingAni = tl;
    loadingAni.pause();

    ////dialog icon ani
    dialogIconAni = gsap.timeline({ repeat: -1 });
    $("#dialog-top")
        .find("img")
        .each(function () {
            dialogIconAni
                .to(this, { scale: 1.2, duration: 0.1 }, "1")
                .to(this, { scale: 1, duration: 0.1, delay: 0.1 }, "<")
                .to(this, { duration: 0, delay: 1 }, "2");
        });

    dialogIconAni.pause();

    ////blur focus ani
    blurFocusAni = gsap.timeline({ repeat: 1 });
    $("div[id=loading], div[id=dialog]").each(function () {
        blurFocusAni.to(this, { scale: 1.1, duration: 0.05 }).to(this, { scale: 1, duration: 0.05 });
    });

    blurFocusAni.pause();

    $("#div-blur").on("click", clickBlur);
}

export async function showLoading(msg = "") {
    if ($("#loading").is(":visible")) {
        $("#loading-text").text(msg);
        return;
    }

    $("body").css("overflow-y", "hidden");

    $("#div-blur").show();
    $("#loading").show();
    gsap.fromTo("#div-blur", { opacity: 0.0 }, { opacity: 0.7, duration: 0.3 });

    gsap.fromTo("#loading", { opacity: 0.0, scale: 0.1 }, { opacity: 1, duration: 0.3, scale: 1 });

    $(".loading-computer-deliverybox").css("opacity", "0");
    $(".loading-computer-loadingbar").css("opacity", "0");
    $(".loading-computer-people").css("opacity", "0");
    $(".loading-computer-shelf").css("opacity", "0");

    $("#loading-text").text(msg);
    loadingAni.play();
    await utils.sleep(1000);
}

export async function hideLoading(hideBlur = true) {
    $("body").css("overflow-y", "");
    if (hideBlur == true) {
        gsap.fromTo("#div-blur", { opacity: 0.7 }, { opacity: 0.0, duration: 0.3, onComplete: () => $("#div-blur").hide() });
    }

    gsap.fromTo(
        "#loading",
        { opacity: 1, scale: 1 },
        { opacity: 0, duration: 0.3, scale: 0.1, onComplete: () => $("#loading").hide() }
    );
    loadingAni.pause();
}

export function showMessage(msg, okFn = null, iconType = null, btnText = null) {
    showDialog(msg, "ok", okFn, null, iconType, btnText, null);
}

export function showConfirm(msg, okFn = null, cancelFn = null, iconType = null, btnOkText = null, btnCancelText = null) {
    showDialog(msg, "yesno", okFn, cancelFn, iconType, null, null, btnOkText, btnCancelText);
}

async function showDialog(msg, ttype, okyesFn = null, cancelFn = null, iconType = null, btnOkyesText = null, btnCancelText = null) {
    if ($("#div-blur").is(":visible") == true) {
        await hideLoading(false);
    }

    $("#dialog-top").find("img").hide();
    var btns = $("#dialog-bottom").find("button");
    if (ttype === "ok") {
        btnOkyesText = btnOkyesText === null ? "OK" : btnOkyesText;
        $(btns[0]).hide();
        $(btns[1])
            .show()
            .text(btnOkyesText)
            .removeClass("btn-danger")
            .addClass("btn-success")
            .off("click")
            .on("click", function () {
                hideDialog();
                if (okyesFn !== null) {
                    okyesFn();
                }
            });
        if (iconType === null) {
            iconType = "info";
        }
    } else if (ttype === "yesno") {
        btnOkyesText = btnOkyesText === null ? "OK" : btnOkyesText;
        btnCancelText = btnCancelText === null ? "Cancel" : btnCancelText;
        $(btns[0])
            .show()
            .text(btnOkyesText)
            .off("click")
            .on("click", function () {
                hideDialog();
                if (okyesFn !== null) {
                    okyesFn();
                }
            });
        $(btns[1])
            .show()
            .text(btnCancelText)
            .removeClass("btn-success")
            .addClass("btn-danger")
            .off("click")
            .on("click", function () {
                hideDialog();
                if (cancelFn !== null) {
                    cancelFn();
                }
            });
        if (iconType === null) {
            iconType = "warn";
        }
    } else {
        console.error("error dialog type");
        return;
    }

    dialogIconAni.play();
    $("#dialog-top")
        .find("img[name=" + iconType + "]")
        .show();
    $("body").css("overflow-y", "hidden");
    $("#dialog-text").text(msg);
    if ($("#div-blur").is(":visible") == false) {
        $("#div-blur").show();
        gsap.fromTo("#div-blur", { opacity: 0.0 }, { opacity: 0.7, duration: 0.3 });
    }

    $("#dialog").show();
    gsap.fromTo(
        "#dialog",
        { opacity: 0.0, scale: 0.1 },
        {
            opacity: 1,
            duration: 0.3,
            scale: 1,
            onComplete: function () {
                gsap.set("#dialog", { clearProps: "transform" });
            },
        }
    );
}

export function setStrmOverlay(ttype) {
    $(".video-overlay-div > img").hide();
    if (ttype === "strm") {
        $(".video-overlay-div").show();
        $(".video-overlay-div > img[name=strm]").show();
        $(".video-overlay-div > span").text("Streaming").css("color", "#FFFA00");
    } else if (ttype === "recog") {
        $(".video-overlay-div").show();
        $(".video-overlay-div > img[name=recog]").show();
        $(".video-overlay-div > span").text("Recognizing").css("color", "#58D100");
    } else if (ttype === "pause") {
        $(".video-overlay-div").show();
        $(".video-overlay-div > img[name=pause]").show();
        $(".video-overlay-div > span").text("Paused").css("color", "#C40000");
    } else if (ttype === "stop") {
        $(".video-overlay-div").hide();
    } else {
        console.error("unknown strm overlay");
    }
}

function hideDialog() {
    $("body").css("overflow-y", "");
    gsap.fromTo("#div-blur", { opacity: 0.7 }, { opacity: 0.0, duration: 0.3, onComplete: () => $("#div-blur").hide() });
    gsap.fromTo("#dialog", { opacity: 1, scale: 1 }, { opacity: 0, duration: 0.3, scale: 0.1, onComplete: () => $("#dialog").hide() });
    dialogIconAni.pause();
}

function addAnimationBlink(timeline, element, durationSec, baseDelaySec, blinkDelaySec, startpoint) {
    timeline
        .fromTo(
            element,
            { opacity: 0 },
            {
                delay: baseDelaySec,
                opacity: 1,
                duration: durationSec,
            },
            startpoint
        )
        .to(element, {
            delay: blinkDelaySec,
            opacity: 0,
            duration: durationSec,
        })
        .to(element, {
            delay: 0,
            opacity: 1,
            duration: durationSec,
        })
        .to(element, {
            delay: blinkDelaySec,
            opacity: 0,
            duration: durationSec,
        });
}

function addAnimationGlance(timeline, element, durationSec, baseDelaySec, shownSec, startpoint) {
    return timeline
        .fromTo(
            element,
            { opacity: 0 },
            {
                delay: baseDelaySec,
                opacity: 1,
                duration: durationSec,
            },
            startpoint
        )
        .to(element, {
            delay: shownSec,
            opacity: 0,
            duration: durationSec,
        });
}

function clickBlur() {
    blurFocusAni.restart();
    blurFocusAni.play();
}
