import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { spawn } from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";
import * as pty from "node-pty"
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handler = app.getRequestHandler();

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
		// Create a new PTY process for each connection
		const shell = os.platform() === "win32" ? "powershell.exe" : "bash";
		const ptyProcess = pty.spawn(shell, [], {
			name: "xterm-color",
			cols: 80,
			rows: 24,
			cwd: process.env.HOME || process.cwd(),
			env: process.env,
		});

		// Send initial system info
		const systemInfo = {
			user: os.userInfo().username,
			hostname: os.hostname(),
			cwd: ptyProcess.process.cwd || process.cwd(),
		};
		socket.emit("systemInfo", systemInfo);

		// Handle data from PTY (output from commands)
		ptyProcess.onData((data) => {
			socket.emit("terminalOutput", data);
		});

		// Handle input from frontend
		socket.on("terminalInput", (data) => {
			ptyProcess.write(data);
		});

		// Handle terminal resize
		socket.on("resize", ({ cols, rows }) => {
			ptyProcess.resize(cols, rows);
		});

		// Handle PTY exit
		ptyProcess.onExit(({ exitCode, signal }) => {
			console.log(`PTY process exited with code ${exitCode}, signal ${signal}`);
			socket.emit("terminalExit", { exitCode, signal });
		});

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

		socket.on("disconnect", () => {
			console.log("Client disconnected");
		});
	});

	httpServer.listen(3000, () => {
		console.log("> Ready on http://localhost:3000");
	});
});
