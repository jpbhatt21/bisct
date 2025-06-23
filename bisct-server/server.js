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
let defaultCompose=`version: '3.8'

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
`
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
			const uuid = crypto.randomUUID();
			let filepath = path.join(parentDir, projectsSubdir, project);
			let fin
			// fs.mkdirSync(path.join(filepath,uuid),{recursive:true})
			async function comm(child) {
				let finished=0
				child.stdout.on("data", (data) => {
					socket.emit("comm", data.toString());
				});

				child.stderr.on("data", (data) => {
					socket.emit("comm","! "+ data.toString());
				});

				child.on("close", (code) => {
					finished=1
					if (code != 0) socket.emit("comm", `Process exited with code ${code}`);
				});

				child.on("error", (error) => {
					finished=-1
					socket.emit("comm", `Err: Failed to start process: ${error.message}`);
				});
				while(finished==0){
					await new Promise(resolve => setTimeout(resolve, 100));
				}
				return finished
			}
			if (type == "git") {
				fin=await comm(spawn("git", ["clone", content, uuid], { cwd: filepath }))
				if(fin==1){
					fin=await comm(spawn("nixpacks", ["build", "./"+uuid, "--name",uuid], { cwd: filepath }))
					if(fin==1){
						fs.writeFileSync(path.join(filepath,"docker-compose-"+uuid+".yaml"),defaultCompose.replaceAll("$uuid",uuid),"utf-8")						
						fin=await comm(spawn("docker", ["compose","-f","docker-compose-"+uuid+".yaml","up","-d"], { cwd: filepath }))
					}
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
