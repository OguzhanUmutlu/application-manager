let userApps = {};
/*** @type {Application[]} */
let apps = [];
const query = new URLSearchParams(location.href.split("?").slice(1).join("?"));
const refreshApps = () => {
    document.querySelector(".applications").innerHTML = Object.keys(userApps).map(a => {
            const d = new Date(userApps[a].lastEditedTimestamp);
            return `<div class="application" onclick="location.href = './app/${a}/${Object.keys(userApps[a].sections).sort((a, b) => a * 1 - b * 1)[0]}'">
    <div class="name">${apps.find(i => i.id === a * 1).name}</div>
    <div class="edited">Last edited: ${d.getDate() + "/" + d.getMonth() + "/" + d.getFullYear()}</div>
</div>`;
        }).join("") +
        (Object.keys(userApps).length < apps.length ? `<div class="application create" onclick="appPopup()">
        <svg width="48" height="48">
            <rect x="20" y="0" width="8" height="48" fill="#57585b"></rect>
            <rect x="0" y="20" width="48" height="8" fill="#57585b" stroke-linecap="round"></rect>
        </svg>
    </div>` : "");
};
const socket = io();
socket.on("connect", () => {
    console.info("Connected.");
    if (localStorage.getItem("t")) socket.emit("login", localStorage.getItem("t"));
    else document.querySelector(".login-container").hidden = false;
    document.querySelector(".loading").hidden = true;
});
let _pkId = 0;
const fetchApps = async (user = false) => {
    const id = _pkId++;
    socket.emit("fetch" + (user ? "User" : "") + "Apps", id);
    return await new Promise(r => {
        const cb = o => {
            if (o.result[0] !== id) return;
            if (!o.success) r(false);
            else {
                if (user) userApps = o.result[1];
                else apps = o.result[1].map(i => Application.fromJSON(i));
                r(o.result[1]);
            }
            socket.off("fetch" + (user ? "User" : "") + "Apps", cb);
        };
        socket.on("fetch" + (user ? "User" : "") + "Apps", cb);
    });
};
window.createApp = async id => {
    const body = {};
    const app = apps.find(i => i.id === id);
    if (!app) return closeAppPopup();
    app.sections.forEach(section => {
        const sec = body[section.id] = {};
        section.components.forEach(component => sec[component.id] = component.dataDefault);
    });
    userApps[id] = {
        sections: body,
        lastEditedTimestamp: Date.now(),
        createdTimestamp: Date.now(),
        status: 0
    };
    socket.emit("saveApp", id, body);
};
socket.on("saveApp", o => {
    if (o.success) {
        closeAppPopup();
        refreshApps();
    } else {
        console.error(o.error);
    }
});

socket.on("login", async msg => {
    if (!msg.success) {
        switch (msg.error) {
            case "Invalid access token.":
                localStorage.removeItem("t");
                document.querySelector(".login-container").hidden = false;
                break;
        }
    } else {
        document.querySelector(".login-container").hidden = true;
        await Promise.all([fetchApps(), fetchApps(true)]);
        refreshApps();
        const staffBtn = document.querySelector(".staff-btn");
        staffBtn.hidden = !msg.result.staff;
    }
});

socket.on("kick", () => {
    if (query.has("dev")) alert("An error happened.");
    else location.reload();
});

socket.on("forceUpdate", async () => {
    await Promise.all([fetchApps(), fetchApps(true)]);
    refreshApps();
});

socket.on("disconnect", () => {
    console.info("Disconnected.");
    document.querySelector(".loading > div").innerHTML = "Reconnecting...";
    document.querySelector(".loading").hidden = false;
    document.querySelector(".login-container").hidden = true;
});

addEventListener("contextmenu", e => e.preventDefault());

document.querySelector(".popup-container").style.translate = "-50% -200%";
window.appPopup = () => {
    const p = document.querySelector(".create-popup");
    p.style.display = "";
    p.style.pointerEvents = "";
    setTimeout(() => document.querySelector(".popup-container").style.translate = "-50% -50%", 100);
    document.querySelector(".new-select").innerHTML = apps.filter(i => !userApps[i.id]).map(i => `<option value="${i.id}">${i.name}</option>`).join("");
};
window.closeAppPopup = () => {
    const p = document.querySelector(".create-popup");
    p.style.pointerEvents = "none";
    document.querySelector(".popup-container").style.translate = "-50% -200%";
    setTimeout(() => p.style.display = "none", 600);
};