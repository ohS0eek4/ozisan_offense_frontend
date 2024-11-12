"use strict";
import http from "http";
import { Server } from "socket.io";
const server = http.createServer();
const io = new Server(server, {
    cors: {
        origin: "http://localhost:8080",
        credentials: true,
    },
});
const port = 8081;
server.listen(port, () => console.log("app listening on port " + port));
// player : P
// room : R
// session : S
// status : T
// index : ind
// selected : slctd
// 有効なルーム群
let Rlist = [];
//所謂セッション PsT
let PsS = [];
function makePT(id, side, ind) {
    const start_positions = [
        { x: 2500, y: 0, z: 0, y_rotation: 0, elevation_angle: 0 },
        { x: 1200, y: 0, z: 0, y_rotation: 0, elevation_angle: 0 },
        { x: 800, y: 0, z: 0, y_rotation: 0, elevation_angle: 0 },
        { x: 2500, y: 0, z: 700, y_rotation: 0, elevation_angle: 0 },
        { x: 1200, y: 0, z: 700, y_rotation: 0, elevation_angle: 0 },
        { x: 800, y: 0, z: 700, y_rotation: 0, elevation_angle: 0 },
        { x: 2500, y: 0, z: 1400, y_rotation: 0, elevation_angle: 0 },
        { x: 1200, y: 0, z: 1400, y_rotation: 0, elevation_angle: 0 },
        { x: 800, y: 0, z: 1400, y_rotation: 0, elevation_angle: 0 },
    ];
    const PTdata = {
        id: id,
        side: side,
        weapon_ids: { main: "desert_eagle" },
        health: 0,
        position: start_positions[ind % start_positions.length],
        velocity: {
            x: 0,
            y: 0,
            z: 0,
            y_rotation: 0,
            elevation_angle: 0,
        },
        spawn_point: start_positions[ind % start_positions.length],
        kill: 0,
        death: -1,
        alive: true,
        sitting: false,
        running: false,
    };
    return PTdata;
}
io.on("connection", function (socket) {
    let ip = socket.handshake.address != "::ffff:127.0.0.1" ? socket.handshake.address : "::1";
    console.log("detection", ip);
    let PSind = PsS.findIndex((d) => d.ip == ip);
    if (PSind != -1) {
        const reconnectRind = Rlist.findIndex((d) => d.Rid == PsS[PSind].R && d.PsT.findIndex((p) => p.id == PsS[PSind].id) != -1);
        if (reconnectRind != -1) {
            socket.join(PsS[PSind].R);
            io.to(socket.id).emit("reconnectionR", Rlist[reconnectRind]);
        }
        else
            PsS[PSind].R = "&lobby";
        console.log("reconnected", ip);
        io.to(socket.id).emit("reconnection", PsS[PSind].id, PsS[PSind].R);
    }
    else {
        console.log("req_connection", ip);
        io.to(socket.id).emit("req_connection");
    }
    socket.on("login", (id) => {
        // いづれここでパスワード認証
        PsS.push({
            id: id,
            ip: ip,
            R: "&lobby",
            connection: true,
        });
        let PSind = PsS.findIndex((d) => d.ip == ip);
        if (PSind != -1) {
            socket.join(PsS[PSind].R);
            console.log("login_success", ip);
            io.to(socket.id).emit("login_success", PsS[PSind].id, PsS[PSind].R);
        }
        else
            console.error("PsS.pushエラー", PsS);
    });
    socket.on("getRlist", () => {
        console.log("vomitRlist", ip);
        io.to(socket.id).emit("vomitRlist", Rlist);
    });
    socket.on("createR", (arg) => {
        let PSind = PsS.findIndex((d) => d.ip == ip);
        if (PSind != -1) {
            if (PsS[PSind].R.charAt(0) == "&" || Rlist.findIndex((R) => R.Rid == PsS[PSind].R) == -1) {
                let slctdRind = Rlist.findIndex((d) => d.Rid == arg.Rid);
                if (slctdRind == -1 && arg.map == "origin" && (arg.mode == "deathmatch" || arg.mode == "team_deathmatch")) {
                    const npcsT = [];
                    for (let i = 0; i < 13; i++) {
                        npcsT.push(makePT("npc_" + npcsT.length.toString(), npcsT.length, npcsT.length));
                    }
                    Rlist.push({
                        Rid: arg.Rid,
                        map: arg.map,
                        mode: arg.mode,
                        PsT: [],
                        nPsT: npcsT
                    });
                    io.emit("vomitRlist", Rlist);
                }
                else {
                    console.log("重複Rfalse", ip, arg);
                    io.to(socket.id).emit("Rfalse", "重複したid、存在しないmap、modeを検出");
                }
            }
            else {
                io.to(socket.id).emit("Rfalse", "ブラウザを更新してください。");
            }
        }
        else {
            console.log("login_false", ip);
            io.to(socket.id).emit("login_false", "ログインしてください。");
        }
    });
    socket.on("selectR", (Rid) => {
        let PSind = PsS.findIndex((d) => d.ip == ip);
        if (PSind != -1) {
            if (PsS[PSind].R.charAt(0) == "&" || Rlist.findIndex((R) => R.Rid == PsS[PSind].R) == -1) {
                let slctdRind = Rlist.findIndex((d) => d.Rid == Rid);
                if (slctdRind != -1) {
                    if (Rlist[slctdRind].PsT.length < 20) {
                        if (Rlist[slctdRind].mode == "deathmatch") {
                            Rlist[slctdRind].PsT.push(makePT(PsS[PSind].id, Rlist[slctdRind].PsT.length, Rlist[slctdRind].PsT.length));
                            PsS[PSind].R = Rid;
                            console.log("Rsuccess", ip);
                            io.to(socket.id).emit("Rsuccess", Rlist[slctdRind]);
                        }
                        else {
                            Rlist[slctdRind].PsT.push(makePT(PsS[PSind].id, Rlist[slctdRind].PsT.filter((d) => d.side == 0).length <=
                                Rlist[slctdRind].PsT.length / 2
                                ? 0
                                : 1, Rlist[slctdRind].PsT.length));
                            Rlist[slctdRind].nPsT.splice(0, 1);
                            PsS[PSind].R = Rid;
                            console.log("Rsuccess", ip);
                            io.to(socket.id).emit("Rsuccess", Rlist[slctdRind]);
                        }
                    }
                    else {
                        console.log("Rfalse", ip);
                        io.to(socket.id).emit("Rfalse", "おっと！ルームの人数がいっぱいのようです。");
                    }
                }
                else {
                    console.log("Rfalse", ip);
                    io.to(socket.id).emit("Rfalse", "おっと！ルームが存在しないようです。");
                }
            }
            else {
                io.to(socket.id).emit("Rsuccess", PsS[PSind]);
                console.log("doubleRselect", ip);
            }
        }
        else {
            console.log("login_false", ip);
            io.to(socket.id).emit("login_false", "ログインしてください。");
        }
    });
    socket.on("syncT", (T) => {
        let PSind = PsS.findIndex((d) => d.ip == ip);
        if (PSind != -1) {
            let slctdRind = Rlist.findIndex((d) => d.Rid == PsS[PSind].R);
            if (slctdRind != -1) {
                let RPsTind = Rlist[slctdRind].PsT.findIndex((d) => d.id == T.id);
                if (RPsTind != -1) {
                    Rlist[slctdRind].PsT[RPsTind] = T;
                    io.to(socket.id).emit("syncT", { PsT: Rlist[slctdRind].PsT, nPsT: Rlist[slctdRind].nPsT });
                }
                else
                    console.error("slctdR.PsTとPsSに整合性の疑義");
            }
            else {
                console.log("Rfalse", ip);
                io.to(socket.id).emit("Rfalse", "おっと！あなたはこのルームに存在しないようです。");
            }
        }
        else
            io.to(socket.id).emit("login_false", "ログインしてください。");
    });
    socket.on("npc_syncT", (T) => {
        let PSind = PsS.findIndex((d) => d.ip == ip);
        if (PSind != -1) {
            let slctdRind = Rlist.findIndex((d) => d.Rid == PsS[PSind].R);
            if (slctdRind != -1) {
                let RnPsTind = Rlist[slctdRind].nPsT.findIndex((d) => d.id == T.id);
                if (RnPsTind != -1) {
                    Rlist[slctdRind].nPsT[RnPsTind] = T;
                }
                else
                    console.error("slctdR.PsTとPsSに整合性の疑義");
            }
            else {
                console.log("Rfalse", ip);
                io.to(socket.id).emit("Rfalse", "おっと！あなたはこのルームに存在しないようです。");
            }
        }
        else
            io.to(socket.id).emit("login_false", "ログインしてください。");
    });
    socket.on("spawn", (T) => {
        let PSind = PsS.findIndex((d) => d.ip == ip);
        if (PSind != -1) {
            if (PsS[PSind].id == T.id) {
                let slctdRind = Rlist.findIndex((d) => d.Rid == PsS[PSind].R);
                if (slctdRind != -1) {
                    let RPsTind = Rlist[slctdRind].PsT.findIndex((d) => d.id == PsS[PSind].id);
                    if (RPsTind != -1) {
                        Rlist[slctdRind].PsT[RPsTind] = T;
                        io.in(Rlist[slctdRind].Rid).emit("spawn", Rlist[slctdRind].PsT[RPsTind]);
                    }
                    else
                        console.error("slctdR.PsTとPsSに整合性の疑義", Rlist[slctdRind].PsT, PsS);
                }
                else
                    io.to(socket.id).emit("Rfalse", "おっと！あなたはこのルームに存在しないようです。");
            }
        }
        else
            io.to(socket.id).emit("login_false", "ログインしてください。");
    });
    socket.on("fire", (arg) => {
        let PSind = PsS.findIndex((d) => d.ip == ip);
        if (PSind != -1) {
            let slctdRind = Rlist.findIndex((d) => d.Rid == PsS[PSind].R);
            if (slctdRind != -1) {
                let RPsTind = Rlist[slctdRind].PsT.findIndex((d) => d.id == PsS[PSind].id);
                if (RPsTind != -1) {
                    io.to(socket.id).emit("fire", {
                        T: arg.T,
                        weapon_id: arg.weapon_id,
                        ammo_is: arg.ammo_is,
                    });
                }
                else
                    console.error("slctdR.PsTとPsSに整合性の疑義");
            }
            else
                io.to(socket.id).emit("Rfalse", "おっと！あなたはこのルームに存在しないようです。");
        }
        else
            io.to(socket.id).emit("login_false", "ログインしてください。");
    });
    socket.on("disconnect", () => {
        let PSind = PsS.findIndex((d) => d.ip == ip);
        if (PSind != -1) {
            console.log("disconnected", ip);
            PsS[PSind].connection = false;
        }
    });
});