import { createServer } from "node:http";
import next from "next";
import { parentDir, projectsSubdir } from "./src/app/api/constants.js";
import { Server } from "socket.io";
import { spawn } from "node:child_process";
import * as os from "node:os";
import fs from "fs";
import path from "node:path";
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handler = app.getRequestHandler();
let defaultCompose = `version: '3.8'

services:
  app:
    image: $uuid
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(\`$uuid.localhost\`)"
      - "traefik.http.routers.app.entrypoints=web"
      - "traefik.http.services.app.loadbalancer.server.port=3000"
    networks:
      - traefik

networks:
  traefik:
    external: true
`;
const busy = {};
app.prepare().then(() => {
	const httpServer = createServer((req, res) => {
		// Handle your custom routes first
		if (req.url === "/custom-endpoint") {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ message: "Custom server route" }));
			return;
		}

		// Pass everything else to Next.js default handler
		// This includes all /api routes
		handler(req, res);
	});

	const io = new Server(httpServer);

	io.on("connection", (socket) => {
		console.log("Socket connected");
		async function comm(child) {
			let finished = 0;
			child.stdout.on("data", (data) => {
				socket.emit("comm", data.toString());
			});

			child.stderr.on("data", (data) => {
				socket.emit("comm", "! " + data.toString());
			});

			child.on("close", (code) => {
				finished = 1;
				if (code != 0) socket.emit("comm", `Process exited with code ${code}`);
			});

			child.on("error", (error) => {
				finished = -1;
				socket.emit("comm", `Err: Failed to start process: ${error.message}`);
			});
			while (finished == 0) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
			return finished;
		}
		socket.on("runCommand", (cmd) => {
			const parts = cmd.trim().split(" ");
			const command = parts[0];
			const args = parts.slice(1);

			// Handle 'cd' command specially to update working directory
			if (command === "cd") {
				try {
					const newDir = args[0] || os.homedir();
					process.chdir(newDir);

					// Send updated system info after directory change
					const updatedInfo = {
						user: os.userInfo().username,
						hostname: os.hostname(),
						cwd: process.cwd(),
					};
					socket.emit("systemInfo", updatedInfo);
					// socket.emit("commandClose", `Changed directory to ${process.cwd()}`);
				} catch (error) {
					socket.emit("commandError", `cd: ${error.message}`);
				}
				return;
			}

			const child = spawn(command, args, { cwd: process.cwd() });

			child.stdout.on("data", (data) => {
				socket.emit("commandOutput", data.toString());
			});

			child.stderr.on("data", (data) => {
				socket.emit("commandError", data.toString());
			});

			child.on("close", (code) => {
				if (code != 0) socket.emit("commandClose", `Process exited with code ${code}`);
			});

			child.on("error", (error) => {
				socket.emit("commandError", `Failed to start process: ${error.message}`);
			});
		});
		socket.on("addModule", async (data) => {
			const project = data.project;
			const type = data.type;
			const content = data.content;
			const uuid = crypto.randomUUID().replaceAll("-", "");
			let filepath = path.join(parentDir, projectsSubdir, project);
			let fin;
			// fs.mkdirSync(path.join(filepath,uuid),{recursive:true})

			if (type == "git") {
				fin = await comm(spawn("git", ["clone", content, uuid], { cwd: filepath }));
				if (fin == 1) {
					fin = await comm(spawn("nixpacks", ["build", "./" + uuid, "--name", uuid], { cwd: filepath }));
					if (fin == 1) {
						fs.writeFileSync(path.join(filepath, "docker-compose-" + uuid + ".yaml"), defaultCompose.replaceAll("$uuid", uuid), "utf-8");
						fin = await comm(spawn("docker", ["compose", "-f", "docker-compose-" + uuid + ".yaml", "up", "-d"], { cwd: filepath }));
					}
				}
			}
		});
		// 		{
		//     "id": "78fefffc-fcf7-49d9-ba28-19f213719cdc",
		//     "status": "Not Deployed",
		//     "type": "git",
		//     "content": "https://github.com/jpbhatt21/im.bhatt.jp.git",
		//     "install": "",
		//     "build": "",
		//     "run": "",
		//     "url": "78fefffc-fcf7-49d9-ba28-19f213719cdc.localhost",
		//     "port": "3000",
		//     "name": "im.bhatt.jp",
		//     "desc": "Module created from repo",
		//     "createdAt": 1750757521996,
		//     "updatedAt": 1750757521996
		// }
		socket.on("moduleReq", async (data) => {
			const { pid, mid } = data;
			const ppath = path.join(parentDir, projectsSubdir, pid);
			const modules = JSON.parse(fs.readFileSync(path.join(ppath, "modules.json"), { encoding: "utf-8" }));
			let fin;
			if (modules[mid]) {
				const module = modules[mid];
				switch (module.status) {
					case "undeployed":
						modules[mid].status="deploying"
						fs.writeFileSync(path.join(ppath, "modules.json"), JSON.stringify(modules, null, 2), { encoding: "utf-8" });
						socket.emit("statusModUpd",{pid,mid,status:modules[mid].status})
						const { type, content, install, build, run } = module;
						if (type == "git") {
							try {
								fs.rmdirSync(path.join(ppath, mid), { recursive: true, force: true });
							} catch {}
							
							fin = await comm(spawn("git", ["clone", content, mid], { cwd: ppath }));
							if (fin == 1) {
								let cmds = [];
								fin = await comm(spawn("nixpacks", ["build", "./" + mid, "--name", mid], { cwd: ppath }));
								if (fin == 1) {
									fin = await comm(spawn("docker", ["compose", "-f", "docker-compose-" + mid + ".yaml", "-p", mid, "up", "-d"], { cwd: ppath }));
								}
								try {
									fs.rmdirSync(path.join(ppath, mid), { recursive: true, force: true });
								} catch {}
							}
						}
						modules[mid].status="running"
						fs.writeFileSync(path.join(ppath, "modules.json"), JSON.stringify(modules, null, 2), { encoding: "utf-8" });
						socket.emit("statusModUpd",{pid,mid,status:modules[mid].status})
						break;
					case "deploying":
						break;
					case "created":
						break;
					case "running":
						modules[mid].status="stopping"
						fs.writeFileSync(path.join(ppath, "modules.json"), JSON.stringify(modules, null, 2), { encoding: "utf-8" });
						socket.emit("statusModUpd",{pid,mid,status:modules[mid].status})
						await comm(spawn("docker", ["compose", "-f", "docker-compose-" + mid + ".yaml", "-p", mid, "stop"], { cwd: ppath }));
						modules[mid].status="exited"
						fs.writeFileSync(path.join(ppath, "modules.json"), JSON.stringify(modules, null, 2), { encoding: "utf-8" });
						socket.emit("statusModUpd",{pid,mid,status:modules[mid].status})
						break;
					case "exited":
						modules[mid].status="starting"
						fs.writeFileSync(path.join(ppath, "modules.json"), JSON.stringify(modules, null, 2), { encoding: "utf-8" });
						socket.emit("statusModUpd",{pid,mid,status:modules[mid].status})
						await comm(spawn("docker", ["compose", "-f", "docker-compose-" + mid + ".yaml", "-p", mid, "start"], { cwd: ppath }));
						modules[mid].status="running"
						fs.writeFileSync(path.join(ppath, "modules.json"), JSON.stringify(modules, null, 2), { encoding: "utf-8" });
						socket.emit("statusModUpd",{pid,mid,status:modules[mid].status})
						break;
					case "removing":
						break;
					default:
						break;
				}
			}
		});
		socket.on("disconnect", () => {
			console.log("Client disconnected");
		});
	});

	httpServer.listen(3000, () => {
		console.log("> Ready on http://localhost:3000");
	});
});
