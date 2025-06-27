import { createServer } from "node:http";
import next from "next";
import { getStatus, parentDir, projectsSubdir, test } from "./src/app/api/constants.js";
import { Server } from "socket.io";
import { spawn } from "node:child_process";
import * as pty from "node-pty";
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
const kill = {};
test();
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
	let processes = {};
	io.on("connection", (socket) => {
		console.log("Socket connected");
		async function comm(child, mid) {
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

			return kill[mid].killed ? -1 : finished;
		}
		function updateStatus(pid, mid, modules, ppath, status) {
			modules[mid].status = status;
			fs.writeFileSync(path.join(ppath, "modules.json"), JSON.stringify(modules, null, 2), { encoding: "utf-8" });
			socket.emit("statusModUpd", { pid, mid, status: modules[mid].status });
		}
		async function runCommand2(str, cwd, mid) {
			str = str.split(" ");
			let child = spawn(str[0], str.slice(1), { cwd });
			kill[mid] = { pid: child.pid, killed: false };

			return comm(child, mid);
		}
		const processes = {};

		async function runCommand(commandWithArgs, cwd, mid) {
			return new Promise((resolve) => {
				// Parse command and arguments
				const args = commandWithArgs.split(" ");
				const command = args.shift();

				// Determine shell and arguments based on platform
				const shell = os.platform() === "win32" ? "cmd.exe" : "bash";
				const shellArgs = os.platform() === "win32" ? ["/c", commandWithArgs] : ["-c", commandWithArgs];

				// Spawn the process using shell to execute the command
				const ptyProcess = pty.spawn(shell, shellArgs, {
					name: "xterm-color",
					cols: 80,
					rows: 30,
					cwd: cwd,
					env: process.env,
				});

				// Store process in global processes object using uuid
				processes[mid] = ptyProcess;

				// Listen for data output and emit through socket
				ptyProcess.onData((data) => {
					socket.emit("comm", data);
				});

				// Listen for process exit to determine success/failure
				ptyProcess.onExit(({ exitCode, signal }) => {
					// Clean up from processes storage
					delete processes[mid];

					// Return 1 for success (exit code 0), -1 for failure
					if (exitCode === 0) {
						resolve(1);
					} else {
						resolve(-1);
					}
				});

				// Handle any errors during process creation
				// ptyProcess.onError((error) => {
				// 	delete processes[mid];
				// 	resolve(-1);
				// });
			});
		}
		socket.on("moduleReq", async (data) => {
			const { pid, mid, req } = data;
			const ppath = path.join(parentDir, projectsSubdir, pid);
			const modules = JSON.parse(fs.readFileSync(path.join(ppath, "modules.json"), { encoding: "utf-8" }));
			let status = (await getStatus(mid, modules[mid].status, ppath)).status;
			let fin = 0;
			if (modules[mid]) {
				const module = modules[mid];
				const mpath = path.join(ppath, mid);
				const { type, content, install, build, run } = module;
				switch (req) {
					case "Remove":
						if (["undeployed", "running", "stopped", "exited", "paused"].includes(status)) {
							updateStatus(pid, mid, modules, ppath, "removing");
							await runCommand(`docker compose down --rmi all`, mpath, mid);
							updateStatus(pid, mid, modules, ppath, type=="git"?"unbuiltundeployed":"undeployed");
						}
						break;

					case "Rebuild":
						if (type=="git"&&["undeployed"].includes(status)) {
							try {
								updateStatus(pid, mid, modules, ppath, "removing");
								await runCommand(`docker compose down --rmi all`, mpath, mid);
							} catch {}
							try {
								fs.rmdirSync(path.join(mpath, "app"), { recursive: true, force: true });
							} catch {}
							// modules[mid].config = (({ type, url, port, content, install, build, run, env }) => ({ type, url, port, content, install, build, run, env }))(modulesJson[mid]);
							updateStatus(pid, mid, modules, ppath, "building");
							fin = await runCommand(`git clone ${content.source} app`, mpath, mid);
							fin = fin == 1 ? await runCommand(`nixpacks build ./app --name  ${mid} `, mpath, mid) : -1;
							updateStatus(pid, mid, modules, ppath, fin == 1 ? "undeployed" : "unbuiltundeployed");
							try {
								fs.rmdirSync(path.join(mpath, "app"), { recursive: true, force: true });
							} catch {}
						}
						break;

					case "Deploy":
						if (["undeployed"].includes(status)) {
							
							updateStatus(pid, mid, modules, ppath, "deploying");
							fin = await runCommand(`docker compose up -d`, mpath, mid);
							updateStatus(pid, mid, modules, ppath, fin == 1 ? "running" : "undeployed");
						}
						break;

					case "Redeploy":
						if (["running", "stopped", "exited", "paused"].includes(status)) {
							updateStatus(pid, mid, modules, ppath, "deploying");
							fin = await runCommand(`docker compose up -d`, mpath, mid);
							updateStatus(pid, mid, modules, ppath, fin == 1 ? "running" : "undeployed");
						}
						break;

					case "Build & Deploy":
						if (type=="git"&&["unbuiltundeployed"].includes(status)) {
							try {
								fs.rmdirSync(path.join(mpath, "app"), { recursive: true, force: true });
							} catch {}
							updateStatus(pid, mid, modules, ppath, "building");
							fin = await runCommand(`git clone ${content.source} app`, mpath, mid);
							fin = fin == 1 ? await runCommand(`nixpacks build ./app --name ${mid}`, mpath, mid) : -1;
							updateStatus(pid, mid, modules, ppath, "deploying");
							fin = fin == 1 ? await runCommand(`docker compose up -d`, mpath, mid) : -1;
							updateStatus(pid, mid, modules, ppath, fin == 1 ? "running" : "unbuiltundeployed");
						}
						break;

					case "Rebuild & Redeploy":
						if (type=="git"&&["running", "stopped", "exited", "paused"].includes(status)) {
							try {
								updateStatus(pid, mid, modules, ppath, "removing");
								await runCommand(`docker compose down --rmi all`, mpath, mid);
							} catch {}
							try {
								fs.rmdirSync(path.join(mpath, "app"), { recursive: true, force: true });
							} catch {}
							updateStatus(pid, mid, modules, ppath, "building");
							fin = await runCommand(`git clone ${content.source} app`, mpath, mid);
							fin = fin == 1 ? await runCommand(`nixpacks build ./app --name ${mid}`, mpath, mid) : -1;
							updateStatus(pid, mid, modules, ppath, "deploying");
							fin = fin == 1 ? await runCommand(`docker compose up -d`, mpath, mid) : -1;
							updateStatus(pid, mid, modules, ppath, fin == 1 ? "running" : "unbuiltundeployed");
							try {
								fs.rmdirSync(path.join(mpath, "app"), { recursive: true, force: true });
							} catch {}
						}
						break;

					case "Pause":
						if (["running"].includes(status)) {
							await runCommand(`docker compose pause`, mpath, mid);
							updateStatus(pid, mid, modules, ppath, "paused");
						}
						break;

					case "Resume":
						if (["paused"].includes(status)) {
							updateStatus(pid, mid, modules, ppath, "starting");
							await runCommand(`docker compose unpause`, mpath, mid);
							updateStatus(pid, mid, modules, ppath, "running");
						}
						break;

					case "Start":
						if (["exited"].includes(status)) {
							updateStatus(pid, mid, modules, ppath, "starting");
							await runCommand(`docker compose start`, mpath, mid);
							updateStatus(pid, mid, modules, ppath, "running");
						}
						break;

					case "Stop":
						if (["running"].includes(status)) {
							updateStatus(pid, mid, modules, ppath, "stopping");
							await runCommand(`docker compose stop`, mpath, mid);
							updateStatus(pid, mid, modules, ppath, "exited");
						}
						break;

					case "Restart":
						if (["running", "stopped", "exited", "paused"].includes(status)) {
							updateStatus(pid, mid, modules, ppath, "restarting");
							await runCommand(`docker compose restart`, mpath, mid);
							updateStatus(pid, mid, modules, ppath, "running");
						}
						break;

					case "Cancel":
						if (["building", "deploying", "starting"].includes(status)) {
							if (processes[mid]) {
								try {
									processes[mid].kill();
									delete processes[mid];
									return true;
								} catch (error) {
									console.error(`Error killing process ${mid}:`, error);
									return false;
								}
							}
							updateStatus(pid, mid, modules, ppath, status == "starting" ? "undeployed" : type=="git"?"unbuiltundeployed":"undeployed");
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
