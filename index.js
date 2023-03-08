const config = require("./config.json");
const express = require("express");
const app = express();
const http = require("http");
const https = require("https");
const httpServer = (config.https ? https : http).createServer(app);
const IO = require("socket.io");
const socketServer = new IO.Server(httpServer);
const clients = [];
const DB = require("quick.db");
const db = new DB.QuickDB({
    filePath: "./app.db"
});
const path = require("path");
app.use(express.static("public"));
const oauthURL = `https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&redirect_uri=${encodeURI(config.callbackURL)}&response_type=code&scope=${config.scopes.join("%20")}`;
const charsBetween = (a, b) => [..." ".repeat(b.charCodeAt(0) - a.charCodeAt(0) + 1)].map((_, i) => String.fromCharCode(a.charCodeAt(0) + i));
const {floor, random} = Math;
app.use(express.static("public"));

const DATA_LIMIT = 100;

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "src", "index.html"));
});

app.get("/app/:appId/:sectionId", (req, res) => {
    res.sendFile(path.join(__dirname, "src", "app.html"));
});

app.get("/view/:userId/app/:appId/:sectionId", (req, res) => {
    res.sendFile(path.join(__dirname, "src", "app.html"));
});

app.get("/view", (req, res) => {
    res.sendFile(path.join(__dirname, "src", "view.html"));
});

app.get("/login", async (req, res) => {
    if (req.query.code) res.sendFile(path.join(__dirname, "src", "login.html"));
    else res.redirect(oauthURL);
});

app.get("/logout", (req, res) => {
    res.send(`<script>localStorage.removeItem("t");location.href="/"</script>`);
});

const applications = require("./apps.js");
const rawApplications = applications.map(i => i.toJSON());
socketServer.on("connection", socket => {
    clients.push(socket);
    let user;
    let on = true;
    const em = (a, b) => socket.emit(a, b); // do not question.
    const err = (ev, msg, close = false) => {
        em(ev, {success: false, error: msg});
        if (close && on) {
            on = false;
            socket.emit("kick");
            socket.disconnect(true);
        }
    };
    const success = (ev, msg) => em(ev, {success: true, result: msg});
    const informViewers = () => clients.forEach(i => {
        if (i !== socket && (i.viewingId === user.id || i.userId === user.id)) i.emit("forceUpdate");
    });
    const informAppList = () => clients.forEach(i => {
        if (i !== socket && i.viewingApps) i.emit("forceUpdate");
    });
    socket.on("register", async code => {
        try {
            /*** @type {{token_type, access_token}} */
            const oauthData = await (await fetch("https://discord.com/api/oauth2/token", {
                method: "POST",
                body: new URLSearchParams({
                    client_id: config.clientId,
                    client_secret: config.clientSecret,
                    code,
                    grant_type: "authorization_code",
                    redirect_uri: config.callbackURL,
                    scope: config.scopes.join(" ")
                }),
                headers: {"Content-Type": "application/x-www-form-urlencoded"},
            })).json();
            const userData = await (await fetch("https://discord.com/api/users/@me", {
                headers: {authorization: `${oauthData.token_type} ${oauthData.access_token}`},
            })).json();
            const chars = [
                ...charsBetween("a", "z"),
                ...charsBetween("A", "Z"),
                ...charsBetween("0", "9")
            ];
            const token = [..." ".repeat(50)].map(_ => chars[floor(random() * chars.length)]).join("");
            if (["id", "username", "avatar", "discriminator", "email"].some(i => !userData[i])) return err("register", "Invalid scopes.", true);
            await db.set("tokens." + token, {userData, expires: Date.now() + 1000 * 60 * 60 * 24 * 30}); // 30 days
            success("register", token);
        } catch (error) {
            err("register", "Invalid code.", true);
        }
    });
    socket.on("login", async token => {
        if (!on) return;
        if (user) return err("login", "You are already logged in.");
        if (typeof token !== "string") {
            on = false;
            return err("login", "Invalid access token.");
        }
        const tok = await db.get("tokens." + token);
        if (!tok || tok.expires < Date.now()) return err("login", "Invalid access token.");
        user = tok.userData;
        socket.userId = user.id;
        success("login", {
            id: user.id,
            username: user.username,
            discriminator: user.discriminator,
            avatar: user.avatar,
            staff: config.staffs.includes(user.id)
        });
    });
    socket.on("fetchApps", pkId => {
        if (!on || !user) return err("fetchApps", [pkId, "Not authenticated."]);
        success("fetchApps", [pkId, rawApplications]);
    });
    socket.on("fetchUserApps", async pkId => {
        if (!on || !user) return err("fetchUserApps", [pkId, "Not authenticated."]);
        success("fetchUserApps", [pkId, (await db.get(`userApps.${user.id}`)) || {}]);
    });
    socket.on("fetchViewApps", async (pkId, userId) => {
        if (!on || !user || !config.staffs.includes(user.id)) return err("fetchViewApps", [pkId, "Not authenticated."]);
        success("fetchViewApps", [pkId, (await db.get(`userApps.${userId}`)) || {}]);
        socket.viewingId = userId;
    });
    socket.on("fetchStaffApps", async pkId => {
        if (!on || !user || !config.staffs.includes(user.id)) return err("fetchStaffApps", [pkId, "Not authenticated."]);
        const tokens = await db.get("tokens") || {};
        const users = {};
        Object.values(tokens).forEach(i => {
            if (users[i.id] || i.expires < Date.now()) return;
            users[i.userData.id] = {
                username: i.userData.username,
                discriminator: i.userData.discriminator,
                //email: i.userData.email
            };
        });
        success("fetchStaffApps", [pkId, (await db.get("userApps")) || {}, users]);
        socket.viewingApps = true;
    });
    socket.on("saveApp", async (id, body) => {
        const example = {
            1: { // application id
                sections: {
                    2: { // section id
                        4: "Yes, I do want to apply." // component id
                    }
                },
                createdTimestamp: 0,
                lastEditedTimestamp: 0,
                status: 0 // [NOT_SUBMITTED, PENDING, REJECTED, APPROVED]
            }
        };
        if (!on || !user) return err("saveApp", "Not authenticated.", true);
        if (typeof id !== "number" || typeof body !== "object" || Array.isArray(body)) return err("saveApp", "Invalid form object.", true);
        const app = applications.find(i => i.id === id);
        if (!app) return err("saveApp", "Application not found.");
        let stat = 0;
        if ((await db.has(`userApps.${user.id}.${id}`))) {
            stat = await db.get(`userApps.${user.id}.${id}.status`);
            if (![Application.STATUS.NOT_SUBMITTED].includes(stat)) return err("saveApp", "The application is already submitted/resolved.");
        }
        if (
            Object.keys(body).length > DATA_LIMIT ||
            Object.values(body).some(i => Object.keys(i).length > DATA_LIMIT)
        ) return err("saveApp", "Too much data.", true);
        app.sections.forEach(sec => {
            if (!body[sec.id]) body[sec.id] = {};
            sec.components.forEach(component => {
                const old = body[sec.id][component.id];
                body[sec.id][component.id] = old === undefined ? component.dataDefault : old;
            });
        });
        Object.keys(body).forEach(i => {
            const sec = app.sections.find(k => k.id === i * 1);
            if (!sec) return delete body[i];
            Object.keys(body[i]).forEach(j => {
                if (!sec.components.find(l => l.id === j * 1)) return delete body[i][j];
            });
        });
        if (Object.values(body).some(i => typeof i !== "object" || Array.isArray(i))) return err("saveApp", "Invalid section object.", true);
        if (Object.keys(body).some(sectionId => Object.keys(body[sectionId]).join(",") !== app.sections.find(sec => sec.id === sectionId * 1).components.map(com => com.id).join(","))) return err("saveApp", "Component not found.");
        const e = [];
        Object.keys(body).forEach(sectionId => {
            const section = body[sectionId];
            e.push(...Object.keys(section).map(componentId => {
                const component = section[componentId];
                const original = app.sections.find(s => s.id === sectionId * 1).components.find(c => c.id === componentId * 1);
                const re = original.validate(component, stat === Application.STATUS.PENDING);
                return re !== true ? [sectionId, componentId, re] : null;
            }).filter(i => i));
        });
        if (e.length) return err("saveApp", e, e.some(i => i[2].includes("Invalid")));
        if (!(await db.has(`userApps.${user.id}`))) await db.set(`userApps.${user.id}`, {});
        const old = await db.get(`userApps.${user.id}.${id}`) || {
            sections: {},
            createdTimestamp: Date.now(),
            lastEditedTimestamp: Date.now(),
            status: Application.STATUS.NOT_SUBMITTED
        };
        old.sections = body;
        old.lastEditedTimestamp = Date.now();
        await db.set(`userApps.${user.id}.${id}`, old);
        informViewers();
        success("saveApp", id);
    });
    socket.on("submitApp", async id => {
        if (!on || !user) return err("submitApp", "Not authenticated.", true);
        if (!(await db.has(`userApps.${user.id}.${id}`))) return err("unsubmitApp", "Invalid application.");
        const userApps = await db.get(`userApps.${user.id}`);
        const stat = userApps[id].status;
        if (![Application.STATUS.NOT_SUBMITTED, Application.STATUS.PENDING].includes(stat)) return err("submitApp", "Already submitted.");
        const app = applications.find(i => i.id === id);
        if (!app) return err("submitApp", "Application not found.");
        const e = [];
        const body = userApps[id].sections;
        if (Object.values(body).some(i => typeof i !== "object" || Array.isArray(i))) return err("submitApp", "Invalid section object.", true);
        if (Object.keys(body).some(sectionId => Object.keys(body[sectionId]).join(",") !== app.sections.find(sec => sec.id === sectionId * 1).components.map(com => com.id).join(","))) return err("submitApp", "Component not found.");
        Object.keys(body).forEach(sectionId => {
            const section = body[sectionId];
            e.push(...Object.keys(section).map(componentId => {
                const component = section[componentId];
                const original = app.sections.find(s => s.id === sectionId * 1).components.find(c => c.id === componentId * 1);
                const re = original.validate(component, true);
                return re !== true ? [sectionId * 1, componentId * 1, re] : null;
            }).filter(i => i));
        });
        if (e.length) return err("submitApp", e, e.some(i => i[2].includes("Invalid")));
        if (stat !== Application.STATUS.PENDING) {
            await db.set(`userApps.${user.id}.${id}.status`, Application.STATUS.PENDING);
            informAppList();
        }
        informViewers();
        success("submitApp", id);
    });
    socket.on("unsubmitApp", async id => {
        if (!on || !user) return err("unsubmitApp", "Not authenticated.", true);
        if (!(await db.has(`userApps.${user.id}.${id}`))) return err("unsubmitApp", "Invalid application.");
        const stat = await db.get(`userApps.${user.id}.${id}.status`);
        if (![Application.STATUS.PENDING].includes(stat)) return err("unsubmitApp", "Haven't been submitted.");
        const app = applications.find(i => i.id === id);
        if (!app) return err("unsubmitApp", "Application not found.");
        await db.set(`userApps.${user.id}.${id}.status`, Application.STATUS.NOT_SUBMITTED);
        informAppList();
        informViewers();
        success("unsubmitApp", id);
    });
    socket.on("deleteApp", async id => {
        if (!on || !user) return err("deleteApp", "Not authenticated.", true);
        if (!(await db.has(`userApps.${user.id}.${id}`))) return err("deleteApp", "Invalid application.");
        const stat = await db.get(`userApps.${user.id}.${id}.status`);
        if (![Application.STATUS.NOT_SUBMITTED, Application.STATUS.PENDING].includes(stat)) return err("deleteApp", "Has already been resolved.");
        const app = applications.find(i => i.id === id);
        if (!app) return err("deleteApp", "Application not found.");
        await db.delete(`userApps.${user.id}.${id}`);
        informAppList();
        informViewers();
        success("deleteApp", id);
    });
    socket.on("resolveApp", async (userId, appId, approved) => {
        if (!on || !user || !config.staffs.includes(user.id)) return err("resolveApp", "Not authenticated.", true);
        if (!(await db.has(`userApps.${userId}`))) return err("resolveApp", "Invalid user.");
        if (!(await db.has(`userApps.${userId}.${appId}`))) return err("resolveApp", "Invalid application.");
        const stat = await db.get(`userApps.${userId}.${appId}.status`);
        if (![Application.STATUS.PENDING].includes(stat)) return err("resolveApp", "Haven't been submitted.");
        const app = applications.find(i => i.id === appId);
        if (!app) return err("resolveApp", "Application not found.");
        await db.set(`userApps.${userId}.${appId}.status`, [Application.STATUS.REJECTED, Application.STATUS.APPROVED][approved * 1]);
        await db.set(`appResolves.${userId}_${appId}`, user.id);
        informAppList();
        clients.filter(i => i !== socket && i.userId === userId).forEach(i => i.emit("forceUpdate"));
        success("resolveApp");
    });
    socket.on("disconnect", () => {
        on = false;
        clients.splice(clients.indexOf(socket), 1);
    });
});

httpServer.listen(80);