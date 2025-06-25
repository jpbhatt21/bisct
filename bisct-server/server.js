import { createServer } from "node:http";
import next from "next";
import { getStatus, parentDir, projectsSubdir, test } from "./src/app/api/constants.js";
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
const kill={}
test()
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
		async function comm(child,mid) {
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
				if(kill[mid])
				{	child.kill()

					finished=-1;
				}

			}
			return finished;
		}
		function updateStatus(pid, mid, modules, ppath, status) {
			modules[mid].status = status;
			fs.writeFileSync(path.join(ppath, "modules.json"), JSON.stringify(modules, null, 2), { encoding: "utf-8" });
			socket.emit("statusModUpd", { pid, mid, status: modules[mid].status });
		}
		async function runCommand(str,cwd,mid) {
			str = str.split(" ");
			return comm(spawn(str[0], str.slice(1), { cwd }),mid);
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
			const { pid, mid, req } = data;
			const ppath = path.join(parentDir, projectsSubdir, pid);
			const modules = JSON.parse(fs.readFileSync(path.join(ppath, "modules.json"), { encoding: "utf-8" }));
			let status = (await getStatus(mid, modules[mid].status, ppath)).status;
			let fin=0;
			if (modules[mid]) {
				const module = modules[mid];
				const { type, content, install, build, run } = module;
				kill[mid]=false
				switch (req) {
					case "Remove":
						if (["undeployed", "running", "stopped", "exited", "paused"].includes(status)) {
							updateStatus(pid, mid, modules, ppath, "removing");
							await runCommand(`docker compose -f docker-compose-${mid}.yaml -p ${mid} down --rmi all`, ppath,mid);
							updateStatus(pid, mid, modules, ppath, "unbuiltundeployed");
						}
						break;

					case "Rebuild":
						if (["undeployed"].includes(status)) {
							try {
								updateStatus(pid, mid, modules, ppath, "removing");
								await runCommand(`docker compose -f docker-compose-${mid}.yaml -p ${mid} down --rmi all`, ppath,mid);
							} catch {}
							try {
								fs.rmdirSync(path.join(ppath, mid), { recursive: true, force: true });
							} catch {}
							updateStatus(pid, mid, modules, ppath, "building");
							fin=await runCommand(`git clone ${content} ${mid}`,ppath ,mid);
							fin=fin==1?await runCommand(`nixpacks build ./${mid} --name  ${mid} ` , ppath,mid):-1
							updateStatus(pid, mid, modules, ppath, fin==1?"undeployed":"unbuiltundeployed");
							try {
								fs.rmdirSync(path.join(ppath, mid), { recursive: true, force: true });
							} catch {}

						}
						break;

					case "Deploy":
						if (["undeployed"].includes(status)) {
							updateStatus(pid, mid, modules, ppath, "deploying");
							fin=await runCommand(`docker compose -f docker-compose-${mid}.yaml -p ${mid} up -d`, ppath,mid);
							updateStatus(pid, mid, modules, ppath, fin==1?"running":"undeployed");
						}
						break;

					case "Redeploy":
						if (["running", "stopped", "exited", "paused"].includes(status)) {
							updateStatus(pid, mid, modules, ppath, "deploying");
							fin=await runCommand(`docker compose -f docker-compose-${mid}.yaml -p ${mid} up -d`, ppath,mid);
							updateStatus(pid, mid, modules, ppath, fin==1?"running":"undeployed");
						}
						break;

					case "Build & Deploy":
						if (["unbuiltundeployed"].includes(status)) {
							try {
								fs.rmdirSync(path.join(ppath, mid), { recursive: true, force: true });
							} catch {}
							updateStatus(pid, mid, modules, ppath, "building");
							fin=await runCommand(`git clone ${content} ${mid}`,ppath,mid);
							fin=fin==1?await runCommand(`nixpacks build ./${mid} --name ${mid}` , ppath,mid):-1
							updateStatus(pid, mid, modules, ppath, "deploying");
							fin=fin==1?await runCommand(`docker compose -f docker-compose-${mid}.yaml -p ${mid} up -d`, ppath,mid):-1
							updateStatus(pid, mid, modules, ppath, fin==1?"running":"unbuiltundeployed");
							
						}
						break;

					case "Rebuild & Redeploy":
						if (["running", "stopped", "exited", "paused"].includes(status)) {
							try {
								updateStatus(pid, mid, modules, ppath, "removing");
								await runCommand(`docker compose -f docker-compose-${mid}.yaml -p ${mid} down --rmi all`, ppath,mid);
							} catch {}
							try {
								fs.rmdirSync(path.join(ppath, mid), { recursive: true, force: true });
							} catch {}
							updateStatus(pid, mid, modules, ppath, "building");
							fin=await runCommand(`git clone ${content} ${mid}`,ppath,mid);
							fin=fin==1?await runCommand(`nixpacks build ./${mid} --name ${mid}` , ppath,mid):-1
							updateStatus(pid, mid, modules, ppath, "deploying");
							fin=fin==1?await runCommand(`docker compose -f docker-compose-${mid}.yaml -p ${mid} up -d`, ppath,mid):-1
							updateStatus(pid, mid, modules, ppath, fin==1?"running":"unbuiltundeployed");
							try {
								fs.rmdirSync(path.join(ppath, mid), { recursive: true, force: true });
							} catch {}
						}
						break;

					case "Pause":
						if (["running"].includes(status)) {
							await runCommand(`docker compose -f docker-compose-${mid}.yaml -p ${mid} pause`, ppath,mid);
							updateStatus(pid, mid, modules, ppath, "paused");
						}
						break;

					case "Resume":
						if (["paused"].includes(status)) {
							updateStatus(pid, mid, modules, ppath, "starting");
							await runCommand(`docker compose -f docker-compose-${mid}.yaml -p ${mid} unpause`, ppath,mid);
							updateStatus(pid, mid, modules, ppath, "running");
						}
						break;

					case "Start":
						if (["exited"].includes(status)) {
							updateStatus(pid, mid, modules, ppath, "starting");
							await runCommand(`docker compose -f docker-compose-${mid}.yaml -p ${mid} start`, ppath,mid);
							updateStatus(pid, mid, modules, ppath, "running");
						}
						break;

					case "Stop":
						if (["running"].includes(status)) {
							updateStatus(pid, mid, modules, ppath, "stopping");
							await runCommand(`docker compose -f docker-compose-${mid}.yaml -p ${mid} stop`, ppath,mid);
							updateStatus(pid, mid, modules, ppath, "exited");
						}
						break;

					case "Restart":
						if (["running", "stopped", "exited", "paused"].includes(status)) {
							updateStatus(pid, mid, modules, ppath, "restarting");
							await runCommand(`docker compose -f docker-compose-${mid}.yaml -p ${mid} restart`, ppath,mid);
							updateStatus(pid, mid, modules, ppath, "running")
						}
						break;

					case "Cancel":
						if (["building", "deploying", "starting"].includes(status)) {
							kill[mid]=true
							updateStatus(pid,mid,modules,ppath,status=="starting"?"undeployed":"unbuiltundeployed")
						}
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
