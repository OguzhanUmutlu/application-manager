let userApps = {};
/*** @type {Application[]} */
let apps = [];
let users = {};
const query = new URLSearchParams(location.href.split("?").slice(1).join("?"));
const checkboxCache = {};
Object.values(Application.STATUS).forEach(i => checkboxCache["stat-" + i] = true);
const updateApplications = () => {
    document.querySelector(".filter-app > .nav-list").innerHTML = apps.map(a => {
        return `
<div class="nav-list-item">
    <div class="checkbox ${checkboxCache["app-" + a.id] ? "checkbox-on" : ""}" data-checkbox-id="app-${a.id}"></div>
    ${a.name}
</div>`;
    }).join("");
    document.querySelector(".filter-user > .nav-list > select").innerHTML = `<option value="none" ${checkboxCache["user-val"] === null ? "selected" : ""}>None</option>` + Object.keys(users).map(uId => {
        const u = users[uId];
        return `<option value="${uId}" ${checkboxCache["user-val"] === uId ? "selected" : ""}>${u.username}#${u.discriminator}</option>`;
    }).join("");
    const results = [];
    Object.keys(userApps).forEach(uId => {
        const user = users[uId] || {};
        const uApps = userApps[uId];
        if (checkboxCache["user-val"] && uId !== checkboxCache["user-val"]) return;
        Object.keys(uApps).forEach(appId => {
            const app = uApps[appId];
            const originApp = apps.find(i => i.id === appId * 1);
            const secIds = originApp.sections.sort((a, b) => a.id - b.id);
            if (!checkboxCache["app-" + originApp.id]) return;
            if (!checkboxCache["stat-" + app.status]) return;
            results.push(`
<div class="card" onclick="location.href = '/view/${uId}/app/${appId}/${secIds[0].id}'">
    <img src="${(originApp.sections.find(i => i.background) || {}).background}">
    <div class="application-name">${originApp.name}</div>
    <div class="user-name">${user.username}#${user.discriminator}</div>
    <div class="status" style="color: ${["lightgray", "yellow", "red", "green"][app.status]}">${["Not submitted", "Pending", "Rejected", "Approved"][app.status]}</div>
</div>`);
        });
    });
    document.querySelector(".results").innerHTML = results.length + " results found.";
    document.querySelector(".cards").innerHTML = results.join("");
};
const customStyle = document.createElement("style");
document.body.appendChild(customStyle);
const socket = io();
socket.on("connect", () => {
    console.info("Connected.");
    if (localStorage.getItem("t")) socket.emit("login", localStorage.getItem("t"));
    else location.href = "/";
});
let _pkId = 0;
const fetchApps = async (user = false) => {
    const id = _pkId++;
    socket.emit("fetch" + (user ? "Staff" : "") + "Apps", id);
    return await new Promise(r => {
        const cb = o => {
            if (o.result[0] !== id) return;
            if (!o.success) r(false);
            else {
                if (user) {
                    userApps = o.result[1];
                    users = o.result[2];
                } else apps = o.result[1].map(i => Application.fromJSON(i));
                r(o.result[1]);
            }
            socket.off("fetch" + (user ? "Staff" : "") + "Apps", cb);
        };
        socket.on("fetch" + (user ? "Staff" : "") + "Apps", cb);
    });
};

socket.on("login", async msg => {
    if (!msg.success) {
        switch (msg.error) {
            case "Invalid access token.":
                localStorage.removeItem("t");
                location.href = "/";
                break;
        }
    } else {
        document.querySelector(".loading").hidden = true;
        await Promise.all([fetchApps(), fetchApps(true)]);
        apps.forEach(i => checkboxCache["app-" + i.id] = true);
        updateApplications();
    }
});

socket.on("kick", () => {
    if (query.has("dev")) alert("An error happened.");
    else location.reload();
});

socket.on("forceUpdate", () => updateApplications());

socket.on("disconnect", () => {
    console.info("Disconnected.");
    document.querySelector(".loading > div").innerHTML = "Reconnecting...";
    document.querySelector(".loading").hidden = false;
});

addEventListener("contextmenu", e => e.preventDefault());

const onResize = () => {
    const amount = Math.floor(innerWidth / 250) || 1;
    const w = innerWidth / amount - 45;
    customStyle.innerHTML = `
.card {
    width: ${w}px !important;
}`;
};
onResize();
addEventListener("resize", onResize);

addEventListener("mousemove", ev => {
    const listF = document.querySelector(".filter-app > .nav-list");
    const listU = document.querySelector(".filter-user > .nav-list");
    const listS = document.querySelector(".filter-status > .nav-list");
    if (ev.composedPath().some(i => i.classList && i.classList.contains("filter-app"))) listF.style.display = "";
    else listF.style.display = "none";
    if (ev.composedPath().some(i => i.classList && i.classList.contains("filter-user"))) listU.style.display = "";
    else listU.style.display = "none";
    if (ev.composedPath().some(i => i.classList && i.classList.contains("filter-status"))) listS.style.display = "";
    else listS.style.display = "none";
});

addEventListener("click", ev => {
    if (!ev.target.classList.contains("checkbox")) return;
    const on = ev.target.classList.contains("checkbox-on");
    ev.target.classList[on ? "remove" : "add"]("checkbox-on");
    checkboxCache[ev.target.getAttribute("data-checkbox-id")] = !on;
    updateApplications();
});
document.querySelector(".filter-user > .nav-list > select").addEventListener("change", ev => {
    const val = ev.target["value"];
    checkboxCache["user-val"] = val === "none" ? null : val;
    updateApplications();
});