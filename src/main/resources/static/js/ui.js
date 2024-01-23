import * as utils from "./utils.js";
let dialogIconAni = null;
let blurFocusAni = null;
let scrollLock = false;
export function init() {
    window.scrollTo(0, 0);
    $(document).on("click", function () {
        $(".navbar .collapse").collapse("hide");
    });
    ////navbar
    $(".third-button").on("click", function () {
        $(".animated-icon3").toggleClass("open");
    });
    ////navbar menu
    var navBtn = $("#NavBar").find("button");
    $("#navbarSupportedContent")
        .find("a")
        .each(function () {
            $(this).on("click", function (event) {
                event.preventDefault();
                scrollLock = true;
                $("#NavBar").find("a:not(.header-title)").removeClass("active");
                $(this).addClass("active");
                var targetID = $(this).attr("href");
                if (targetID.length) {
                    gsap.to(window, {
                        duration: 1,
                        scrollTo: {
                            y: targetID,
                            offsetY: 70,
                            autoKill: false,
                        },

                        ease: "power3.out",
                        onComplete: async () => {
                            scrollLock = false;
                            if (navBtn.is(":visible") == true && navBtn.hasClass("collapsed") == false) {
                                navBtn.trigger("click");
                            }
                        },
                    });
                }
            });
        });
    ////content ani
    $(".mainpage > div[id!=div-demo] > div").each(function () {
        $(this)
            .find(">*:not(h2)")
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
    gsap.fromTo(
        "#div-demo",
        {
            opacity: 0.1,
        },
        {
            opacity: 1,
            duration: 1.5,
        }
    );
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
    $("div[id=loading], div[id=dialog], div[id=settings]").each(function () {
        blurFocusAni.to(this, { scale: 1.1, duration: 0.05 }, 0).to(this, { scale: 1, duration: 0.05 });
    });

    blurFocusAni.pause();

    $("#div-blur").on("click", clickBlur);

    ////scroll spy
    $(document).on("scroll", function () {
        if (scrollLock == true) {
            return;
        }

        var currentY = $(document).scrollTop() + 80;

        var activeId = null;
        $(".mainpage > div:not(.padding) > div > h2").each(function () {
            if (currentY >= $(this).offset().top) {
                activeId = $(this).attr("id");
            }
        });
        $("#NavBar").find("a:not(.header-title)").removeClass("active");
        $("#NavBar")
            .find("a[href='#" + activeId + "']")
            .addClass("active");
    });
    ////others
    initStsRange();
    clearObjs();
    $("#divObjShow").hide();
}

export async function showLoading(msg = "") {
    if ($("#loading").is(":visible")) {
        $("#loading-text").text(msg);
        return;
    }

    $("body").css("overflow-y", "hidden");
    $("#loading").show();

    if ($("#div-blur").is(":visible") === false) {
        $("#div-blur").show();
        gsap.fromTo("#div-blur", { opacity: 0.0 }, { opacity: 0.8, duration: 0.3 });
    }

    gsap.fromTo("#loading", { opacity: 0.0, scale: 0.1 }, { opacity: 1, duration: 0.3, scale: 1 });

    $(".loading-computer-deliverybox").css("opacity", "0");
    $(".loading-computer-loadingbar").css("opacity", "0");
    $(".loading-computer-people").css("opacity", "0");
    $(".loading-computer-shelf").css("opacity", "0");

    $("#loading-text").text(msg);
    await utils.sleep(1000);
}

export async function hideLoading(hideBlur = true) {
    if (hideBlur == true) {
        $("body").css("overflow-y", "");
        gsap.fromTo("#div-blur", { opacity: 0.8 }, { opacity: 0.0, duration: 0.3, onComplete: () => $("#div-blur").hide() });
    }

    gsap.fromTo(
        "#loading",
        { opacity: 1, scale: 1 },
        { opacity: 0, duration: 0.3, scale: 0.1, onComplete: () => $("#loading").hide() }
    );
}

export function showMessage(msg, okFn = null, iconType = null, btnText = null) {
    showDialog(msg, "ok", okFn, null, iconType, btnText, null);
}

export function showConfirm(msg, okFn = null, cancelFn = null, iconType = null, btnOkText = null, btnCancelText = null) {
    showDialog(msg, "yesno", okFn, cancelFn, iconType, null, null, btnOkText, btnCancelText);
}

export function showSettings() {
    if ($("#btnStartPause").text().trim() === "Start") {
        showMessage("The settings panel is available only after streaming is started.");
        return;
    }

    $("#div-blur").show();
    gsap.fromTo("#div-blur", { opacity: 0.0 }, { opacity: 0.8, duration: 0.3 });
    $("#settings").show();
    $("body").css("overflow-y", "hidden");
    gsap.fromTo(
        "#settings",
        { opacity: 0.0, scale: 0.1 },
        {
            opacity: 1,
            duration: 0.3,
            scale: 1,
            onComplete: function () {
                gsap.set("#settings", { clearProps: "transform" });
            },
        }
    );
}

export function hideSettings() {
    $("body").css("overflow-y", "");
    if ($("div[id=loading]:visible, div[id=dialog]:visible").length == 0) {
        gsap.fromTo("#div-blur", { opacity: 0.8 }, { opacity: 0.0, duration: 0.3, onComplete: () => $("#div-blur").hide() });
    }

    gsap.fromTo(
        "#settings",
        { opacity: 1, scale: 1 },
        { opacity: 0, duration: 0.3, scale: 0.1, onComplete: () => $("#settings").hide() }
    );
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
            .addClass("btn-primary")
            .off("click")
            .on("click", function () {
                if (okyesFn !== null) {
                    okyesFn();
                }

                hideDialog();
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
                if (okyesFn !== null) {
                    okyesFn();
                }

                hideDialog();
            });
        $(btns[1])
            .show()
            .text(btnCancelText)
            .removeClass("btn-primary")
            .addClass("btn-danger")
            .off("click")
            .on("click", function () {
                if (cancelFn !== null) {
                    cancelFn();
                }

                hideDialog();
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
        gsap.fromTo("#div-blur", { opacity: 0.0 }, { opacity: 0.8, duration: 0.3 });
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

export function clearObjs() {
    $("#divObjShow").empty();
}

export async function insertObj(objName) {
    const totalObjs = $("#divObjShow").children().length;
    if (totalObjs > 100) {
        $("#divObjShow")
            .children(":gt(" + 10 + ")")
            .remove();
    }

    $("#divObjShow").prepend(` <div class="objWrapper">
    <div  class="objIns"><img class="objImg" src="img/${objName.replace(" ", "")}.png" /></div>
    <div class="objText"><small><span class="obj-text-ellipsis text-capitalize font-monospace">${objName}</span></small></div>
    </div>`);
    $("#divObjShow > div:first").eq(0).show("fast");
    gsap.to($("#divObjShow > div:first")[0], {
        duration: 1,
        opacity: 1,
    });
    await utils.sleep(700);
}

export function clearObjCanvas() {
    let canvas = document.getElementById("boxCanvas");
    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function drawObjOnCanvas(objs) {
    let canvas = document.getElementById("boxCanvas");
    let ctx = canvas.getContext("2d");
    let dpr = window.devicePixelRatio || 1;
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 2;
    for (var i = 0; i < objs.length; i++) {
        let box = objs[i];
        let rawWidth = canvas.width / dpr;
        let rawHeight = canvas.height / dpr;
        let x1 = Number((box.x1r * rawWidth).toFixed(0));
        let y1 = Number((box.y1r * rawHeight).toFixed(0));
        let w = Number(((box.x2r - box.x1r) * rawWidth).toFixed(0));
        let h = Number(((box.y2r - box.y1r) * rawHeight).toFixed(0));
        ctx.strokeRect(x1, y1, w, h);

        let text = `${box.name} - ${Number(parseFloat(box.confi).toFixed(2))}`;
        ctx.font = "8px Arial";

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        let textWidth = Number(ctx.measureText(text).width.toFixed(0)) + 2;

        ctx.fillStyle = "#00FF00";
        ctx.fillRect(x1 + 1, y1 + 1, textWidth, 10);
        ctx.fillStyle = "#000000";
        ctx.fillText(text, x1 + Number((textWidth / 2).toFixed(0)), y1 + 5);
    }
}

export function updateObjCanvasScale() {
    let canvas = document.getElementById("boxCanvas");
    let ctx = canvas.getContext("2d");
    let dpr = window.devicePixelRatio || 1;
    let rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
}

function initStsRange() {
    var ranges = $("#settings > form > div:has(input[type=range])");
    var texts = ["Object confidence threshold: ", "Box limit: ", "Inference delay btw. frames (ms): "];
    for (var i = 0; i < ranges.length; i += 1) {
        ranges
            .eq(i)
            .find("input")
            .attr("data-title", texts[i])
            .on("input", function () {
                $(this)
                    .siblings()
                    .text($(this).attr("data-title") + $(this).val());
            });
    }
}

function hideDialog() {
    if ($("div[id=settings]:visible, div[id=loading]:visible, div[id=settings]:visible").length == 0) {
        $("body").css("overflow-y", "");
        gsap.fromTo("#div-blur", { opacity: 0.8 }, { opacity: 0.0, duration: 0.3, onComplete: () => $("#div-blur").hide() });
    }

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
