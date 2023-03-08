let userApps = {};
/*** @type {Application[]} */
let apps = [];
const query = new URLSearchParams(location.href.split("?").slice(1).join("?"));
const params = location.href.split("?")[0].split("/app/")[1].split("/");
const CUSTOM_USER_ID = location.href.includes("/view/") ? location.href.split("/view/")[1].split("/")[0] : null;
const APP_ID = params[0] * 1;
const SECTION_ID = params[1] * 1;

const socket = io();
socket.on("connect", () => {
    console.info("Connected.");
    if (localStorage.getItem("t")) socket.emit("login", localStorage.getItem("t"));
    else location.href = "/";
    document.querySelector(".loading").hidden = true;
});
let _pkId = 0;
const fetchApps = async (user = false) => {
    const id = _pkId++;
    if (CUSTOM_USER_ID && user) {
        socket.emit("fetchViewApps", id, CUSTOM_USER_ID);
        return await new Promise(r => {
            const cb = o => {
                if (o.result[0] !== id) return;
                if (!o.success) r(false);
                else {
                    userApps = o.result[1];
                    r(o.result[1]);
                }
                socket.off("fetchViewApps", cb);
            };
            socket.on("fetchViewApps", cb);
        });
    } else {
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
    }
};
let userSection;
const loadSection = () => {
    const app = apps.find(i => i.id === APP_ID);
    if (!app || !userApps[APP_ID]) return location.href = "/";
    const section = app.sections.find(i => i.id === SECTION_ID);
    if (!section) return location.href = "/";
    const secIds = app.sections.map(i => i.id).sort((a, b) => b - a); // last to first
    const nextDiv = document.querySelector(".next-btn");
    const submitDiv = document.querySelector(".submit-btn");
    const unsubmitDiv = document.querySelector(".unsubmit-btn");
    const deleteDiv = document.querySelector(".delete-btn");
    const buttonsDiv = document.querySelector(".buttons");
    const saveDiv = document.querySelector(".save-btn");
    const rejectDiv = document.querySelector(".reject-btn");
    const approveDiv = document.querySelector(".approve-btn");
    nextDiv.hidden = true;
    submitDiv.hidden = true;
    unsubmitDiv.hidden = true;
    deleteDiv.hidden = true;
    saveDiv.hidden = true;
    rejectDiv.hidden = true;
    approveDiv.hidden = true;
    buttonsDiv.style.display = "none";
    buttonsDiv.hidden = true;
    const open = [];
    if (secIds[0] !== SECTION_ID) open.push(nextDiv);
    if (!CUSTOM_USER_ID && [Application.STATUS.NOT_SUBMITTED, Application.STATUS.PENDING].includes(userApps[APP_ID].status)) {
        //open.push(saveDiv); Auto saves so no need for it
        open.push(deleteDiv);
        const editing = userApps[APP_ID].status === Application.STATUS.PENDING;
        if (editing) open.push(unsubmitDiv);
        if (secIds[0] === SECTION_ID && !editing) open.push(submitDiv);
    }
    if (CUSTOM_USER_ID && userApps[APP_ID].status === Application.STATUS.PENDING) open.push(rejectDiv, approveDiv);
    open.forEach(i => i.hidden = false);
    if (open.length) {
        buttonsDiv.style.display = "";
        buttonsDiv.style.hidden = false;
    }
    userSection = userApps[APP_ID].sections[SECTION_ID];
    app.sections.forEach(sec => sec.components.forEach(component => {
        const old = userSection[component.id];
        userSection[component.id] = old === undefined ? component.dataDefault : old;
    }));
    Object.keys(userSection).forEach(j => {
        if (!section.components.find(l => l.id === j * 1)) return delete userSection[j];
    });
    document.querySelector(".background").style.backgroundImage = `url(${JSON.stringify(section.background)})`;
    document.querySelector(".app-name").innerHTML = app.name;
    const componentsDiv = document.querySelector(".components");
    componentsDiv.innerHTML = "";
    const READONLY_MODE = CUSTOM_USER_ID || [Application.STATUS.PENDING, Application.STATUS.REJECTED, Application.STATUS.APPROVED].includes(userApps[APP_ID].status);
    section.components.forEach(component => {
        const div = document.createElement("div");
        div.classList.add("component");
        div.setAttribute("data-component-id", component.id.toString());
        component.htmlTo(div, userSection, READONLY_MODE);
        componentsDiv.appendChild(div);
    });
};
const handleSectionErrors = error => {
    console.error(error);
    if (Array.isArray(error) && error.some(i => i[0] === SECTION_ID)) {
        const errs = error.filter(i => i[0] === SECTION_ID);
        const e = errs[0];
        window.scrollTo({
            top: document.querySelector(`[data-component-id="${e[1]}"] > .error`)
                .getBoundingClientRect().top,
            behavior: "smooth"
        });
        errs.forEach(e => {
            document.querySelector(`[data-component-id="${e[1]}"] > .error`).innerHTML = e[2];
        });
    }
};
const saveApp = async () => {
    if (CUSTOM_USER_ID) return true;
    const app = apps.find(i => i.id === APP_ID);
    if (!app) return;
    const section = app.sections.find(i => i.id === SECTION_ID);
    if (!section) return;
    const btn = document.querySelector(".save-btn");
    btn.disabled = true;
    btn.innerHTML = "Saving...";
    let updated = false;
    section.components.forEach(component => {
        const div = document.querySelector(`[data-component-id="${component.id}"]`);
        const set = t => {
            const old = userApps[APP_ID].sections[SECTION_ID][component.id];
            userApps[APP_ID].sections[SECTION_ID][component.id] = t;
            if (t !== old) updated = true;
        };
        component.saveTo(() => userApps[APP_ID].sections[SECTION_ID][component.id], set, div);
    });
    if (!updated) {
        btn.disabled = false;
        btn.innerHTML = "Save";
        return true;
    }
    socket.emit("saveApp", APP_ID, userApps[APP_ID].sections);
    return new Promise(r => socket.once("saveApp", async o => {
        r(o.success);
        btn.disabled = false;
        btn.innerHTML = "Save";
        document.querySelectorAll(".error").forEach(i => i.innerHTML = "");
        if (!o.success) handleSectionErrors(o.error);
        else {
            await Promise.all([fetchApps(), fetchApps(true)]);
            loadSection();
        }
    }));
};
const submitApp = async () => {
    const app = apps.find(i => i.id === APP_ID);
    if (!app) return;
    const section = app.sections.find(i => i.id === SECTION_ID);
    if (!section) return;
    socket.emit("submitApp", APP_ID);
    return await new Promise(r => {
        const cb = o => {
            socket.off("submitApp", cb);
            if (!o.success) handleSectionErrors(o.error);
            r(o.success);
        };
        socket.on("submitApp", cb);
    });
};
const unsubmitApp = async () => {
    const app = apps.find(i => i.id === APP_ID);
    if (!app) return;
    const section = app.sections.find(i => i.id === SECTION_ID);
    if (!section) return;
    socket.emit("unsubmitApp", APP_ID);
    return await new Promise(r => {
        const cb = o => {
            socket.off("unsubmitApp", cb);
            r(o.success);
        };
        socket.on("unsubmitApp", cb);
    });
};
const deleteApp = async () => {
    const app = apps.find(i => i.id === APP_ID);
    if (!app) return;
    const section = app.sections.find(i => i.id === SECTION_ID);
    if (!section) return;
    socket.emit("deleteApp", APP_ID);
    return await new Promise(r => {
        const cb = o => {
            socket.off("deleteApp", cb);
            r(o.success);
        };
        socket.on("deleteApp", cb);
    });
};
const resolveApp = async response => {
    if (!CUSTOM_USER_ID) return;
    socket.emit("resolveApp", CUSTOM_USER_ID, APP_ID, response);
    return await new Promise(r => {
        const cb = o => {
            socket.off("resolveApp", cb);
            r(o.success);
        };
        socket.on("resolveApp", cb);
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
        await Promise.all([fetchApps(), fetchApps(true)]);
        const app = apps.find(i => i.id === APP_ID);
        if (
            !app ||
            !app.sections.some(i => i.id === SECTION_ID) ||
            !userApps[APP_ID] ||
            !userApps[APP_ID].sections[SECTION_ID]
        ) return location.href = "/";
        loadSection();
    }
});
socket.on("disconnect", () => {
    console.info("Disconnected.");
    document.querySelector(".loading > div").innerHTML = "Reconnecting...";
    document.querySelector(".loading").hidden = false;
});

addEventListener("contextmenu", e => e.preventDefault());

setInterval(() => {
    const bg = document.querySelector(".background");
    const w = document.body.scrollWidth;
    const h = document.body.scrollHeight;
    const size = Math.max(w, h);
    bg.style.backgroundSize = w < h ? size + "px" : "auto " + size + "px";
    bg.style.height = bg.style.width = size + "px";
});

window.backBtn = () => {
    if (!apps.find(i => i.id === APP_ID)) return;
    saveApp().then(() => {
        const app = apps.find(i => i.id === APP_ID);
        if (!app) return location.href = CUSTOM_USER_ID ? "/view/" : "/";
        const secIds = app.sections.map(i => i.id).sort((a, b) => a - b);
        if (secIds[0] === SECTION_ID) return location.href = CUSTOM_USER_ID ? "/view/" : "/";
        location.href = (CUSTOM_USER_ID ? "/view/" + CUSTOM_USER_ID : "") + "/app/" + APP_ID + "/" + secIds[secIds.indexOf(SECTION_ID) - 1];
    });
};
window.saveBtn = async () => {
    if (!apps.find(i => i.id === APP_ID)) return;
    if (await saveApp()) openPopup("Application have been saved!");
    else openPopup("Failed to save the application.");
};
window.nextBtn = () => {
    saveApp().then(() => {
        const app = apps.find(i => i.id === APP_ID);
        if (!app) return;
        const secIds = app.sections.map(i => i.id).sort((a, b) => b - a); // last to first
        if (secIds[0] === SECTION_ID) {
            // submit
            submitApp().then(async a => {
                if (a) {
                    openPopup("Application has been submitted!");
                    await Promise.all([fetchApps(), fetchApps(true)]);
                    loadSection();
                } else {
                    openPopup("Failed to submit the application. Please check if you have filled everything correctly.");
                }
            });
        } else {
            // next
            const n = secIds.reverse();
            location.href = (CUSTOM_USER_ID ? "/view/" + CUSTOM_USER_ID : "") + "/app/" + APP_ID + "/" + n[n.indexOf(SECTION_ID) + 1] + (query.has("dev") ? "?dev" : "");
        }
    });
};
window.unsubmitBtn = async () => {
    if (await unsubmitApp()) {
        openPopup("Application's submission has been removed!");
        await Promise.all([fetchApps(), fetchApps(true)]);
        loadSection();
    }
};
const resolveBtn = async response => {
    if (await resolveApp()) {
        openPopup("Application has been " + (response ? "accepted" : "rejected") + "!");
        await Promise.all([fetchApps(), fetchApps(true)]);
        loadSection();
    } else openPopup("Failed to " + (response ? "accept" : "reject") + " the app.")
};
window.approveBtn = () => resolveBtn(true);
window.rejectBtn = () => resolveBtn(false);
window.deleteBtn = () => {
    openPopup("Do you really want to delete this application?", [
        ["Yes", async () => {
            if (await deleteApp()) location.href = "/";
            else closePopup();
        }, "#37e33a"],
        ["No", closePopup, "#ff3d3d"]
    ]);
};
socket.on("kick", () => {
    if (query.has("dev")) alert("An error happened.");
    else location.reload();
});

addEventListener("click", ev => {
    const {target} = ev;
    if (target.classList.contains("checkbox") && !target.classList.contains("checkbox-disabled")) {
        const app = apps.find(i => i.id === APP_ID);
        if (!app) return;
        const section = app.sections.find(i => i.id === SECTION_ID);
        if (!section) return;
        if ([
            Component.MULTIPLE_CHOICE, Component.CHECKBOXES
        ].some(i => target.getAttribute("data-component-type") * 1 === i)) {
            const componentDiv = target.parentElement.parentElement;
            const componentId = componentDiv.getAttribute("data-component-id") * 1;
            const component = section.components.find(i => i.id === componentId);
            const on = target.classList.contains("checkbox-on");
            target.classList[on ? "remove" : "add"]("checkbox-on");
            if (component instanceof MultipleChoiceComponent) {
                const children = Array.from(componentDiv.querySelectorAll(".option > .checkbox"));
                children.filter(i => i !== target).forEach(i => i.classList.remove("checkbox-on"));
            }
        }
    }
});

window.openPopup = (text, buttons = [["OK", closePopup]]) => {
    document.querySelector(".popup").hidden = false;
    document.querySelector(".popup-text").innerHTML = text;
    const buttonsDiv = document.querySelector(".popup-buttons");
    buttonsDiv.innerHTML = "";
    buttons.forEach(i => {
        const btn = document.createElement("div");
        btn.classList.add("popup-btn", "btn");
        btn.addEventListener("click", i[1]);
        btn.style.backgroundColor = i[2] || "#89d5cf";
        btn.innerHTML = i[0];
        buttonsDiv.appendChild(btn);
    });
};

window.closePopup = () => {
    document.querySelector(".popup").hidden = true;
};

socket.on("forceUpdate", async () => {
    await Promise.all([fetchApps(), fetchApps(true)]);
    loadSection();
});


setInterval(async () => {
    if (document.activeElement !== document.body) return;
    await saveApp();
}, 500);

// TODO: other components