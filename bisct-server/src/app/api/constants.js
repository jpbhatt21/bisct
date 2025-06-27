import fs from "fs";
import Parser from "docker-compose-parser";
import path from "path";
import jwt from "jsonwebtoken";
import { spawn } from "child_process";
const dynamicRouteYaml = `http:
  routers:
    bis-app:
      rule: "Host(\`bis.localhost\`)"
      service: bis-service
      entryPoints:
        - web

  services:
    bis-service:
      loadBalancer:
        servers:
          - url: "http://host.docker.internal:3000"

`;
const traefikComposeYaml = ` 
version: '3.8'

services:
  traefik:
    image: traefik:v3.4
    container_name: bisct-traefik
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.file.directory=/etc/traefik/dynamic"
      - "--providers.file.watch=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./dynamic:/etc/traefik/dynamic:ro
    networks:
      - traefik

networks:
  traefik:
    name: traefik
    attachable: true
`;
export const parentDir = path.join(path.dirname(process.cwd()), "bisct-data");
let usersFile = "users.json";
export const projectsSubdir = "projects";
export const projectsFile = "projects.json";

let users = {};
let projects = {};

export async function test() {
	try {
		setUsers(JSON.parse(fs.readFileSync(path.join(parentDir, usersFile), "utf8")));
	} catch {
		fs.mkdirSync(path.join(parentDir, projectsSubdir), { recursive: true });
		fs.writeFileSync(path.join(parentDir, usersFile), JSON.stringify({}), "utf8");
	}
	try {
		setProjects(JSON.parse(fs.readFileSync(path.join(parentDir, projectsSubdir, projectsFile), "utf8")));
	} catch {
		fs.mkdirSync(path.join(parentDir, projectsSubdir), { recursive: true });
		fs.writeFileSync(path.join(parentDir, projectsSubdir, projectsFile), JSON.stringify({}), "utf8");
	}
	try {
		fs.readFileSync(path.join(parentDir, "dynamic", "routes.yaml"), "utf-8");
	} catch {
		fs.mkdirSync(path.join(parentDir, "dynamic"), { recursive: true });
		fs.writeFileSync(path.join(parentDir, "dynamic", "routes.yaml"), dynamicRouteYaml, "utf8");
	}
	try {
		fs.readFileSync(path.join(parentDir, "docker-compose.yaml"), "utf-8");
	} catch {
		fs.writeFileSync(path.join(parentDir, "docker-compose.yaml"), traefikComposeYaml, "utf8");
	}
	try {
		let cmdOP = await cmdOutput(spawn("docker", ["ps", "-a", "--filter", `name=bisct-traefik`, "--format", "json"], { cwd: ppath }));
		if (cmdOP.length == 0 || JSON.parse(cmdOP).status !== "running") {
			throw new Error("start traefik");
		}
	} catch {
		let proc = spawn("docker", ["compose", "up", "-d"], { cwd: parentDir });
		proc.stdout.on("data", (data) => console.log(data.toString()));
		proc.stderr.on("data", (data) => console.log(data.toString()));
		proc.on("error", (error) => {
			console.log(error);
			process.exit();
		});
	}
	return "ok";
}

export const getProjects = () => {
	projects = JSON.parse(fs.readFileSync(path.join(parentDir, projectsSubdir, projectsFile), "utf8"));
	return { ...projects };
};
export const setProjects = (val) => {
	projects = val;
	fs.writeFileSync(path.join(parentDir, projectsSubdir, projectsFile), JSON.stringify(projects), "utf8");
};
export const addProject = (key, val) => {
	projects[key] = val;
	fs.writeFileSync(path.join(parentDir, projectsSubdir, projectsFile), JSON.stringify(projects), "utf8");
};
export const getUsers = () => {
	users = JSON.parse(fs.readFileSync(path.join(parentDir, "users.json"), "utf8"));

	return { ...users };
};
export const setUsers = (val) => {
	users = val;
	fs.writeFileSync(path.join(parentDir, usersFile), JSON.stringify(users), "utf8");
};

export function verify(token) {
	let status = 401;
	const users = getUsers();
	if (token) {
		let verify = jwt.verify(token.value, process.env.JWT_SECRET);
		if (verify.exp * 1000 > Date.now()) {
			if (users[verify.email] && users[verify.email].token == token.value) status = 200;
			else if (Object.keys(users).length == 0) {
				status = 302;
			}
		}
	} else if (Object.keys(users).length == 0) {
		status = 302;
	}
	return status;
}
export function parseIt(yamlString, uuid) {
	let env = {};
	const compose = Parser.parse(yamlString).json();
	if (compose.services.traefik) {
		return { yaml: "illegal name traefik", envs: {} };
	}
	let traefikExists = false;
	Object.values(compose.services).forEach((x) => {
		if (x.image && x.image.startsWith("traefik")) traefikExists = true;
		x.labels &&
			x.labels.forEach((x) => {
				if (x.startsWith("traefik.")) traefikExists = true;
			});
		if (x.networks && x.networks.includes("traefik")) traefikExists = true;
	});
	if (!traefikExists) {
		for (let key of Object.keys(compose.services)) {
			compose.services[key].container_name=uuid+"-"+key
			let service = compose.services[key];
			if (service.ports) {
				service.ports.forEach((x, i) => {
					env[`URL_${key}_${i}`] = key + i + uuid + ".localhost";
					env[`PORT_${key}_${i}`] = x.split(":").slice(-1)[0];
					let arr = ["traefik.enable=true", `traefik.http.routers.${key}.rule=Host(\`\${URL_${key}_${i}}\`)`, `traefik.http.routers.${key}.entrypoints=web`, `traefik.http.services.${key}.loadbalancer.server.port=\${PORT_${key}_${i}}`];
					compose.services[key].labels = compose.services[key].labels?.concat(arr) || arr;
				});
				compose.services[key].networks = compose.services[key].networks?.push("traefik") || ["traefik"];
				let netTraf={traefik:{external:true}}
				console.log(compose.networks)
				compose.networks = compose.networks?{...compose.networks,...netTraf}:netTraf
				console.log(compose.networks)
			}
		}
	}
	return {
		yaml: Parser.parse(compose).text(),
		env,
		config:compose
	};
}
export const defaultCompose = `version: '3.8'
services:
  app:
    image: \${NAME}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(\`\${URL}\`)"
      - "traefik.http.routers.app.entrypoints=web"
      - "traefik.http.services.app.loadbalancer.server.port=\${PORT}"
    networks:
      - traefik

networks:
  traefik:
    external: true
`;
let stateMap = {
	created: "undeployed",
	running: "running",
	paused: "paused",
	restarting: "restarting",
	removing: "removing",
	exited: "exited",
	dead: "undeployed",
};
export async function cmdOutput(child) {
	let finished = 0;
	let op = "";
	child.stdout.on("data", (data) => (op += data.toString()));
	child.stderr.on("data", (data) => (op += data.toString()));
	child.on("close", (code) => {
		finished = 1;
	});

	child.on("error", (error) => {
		finished = -1;
	});
	while (finished == 0) {
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	return op;
}

export async function getStatus(mid, status, ppath) {
	let cmdOP = (await cmdOutput(spawn("docker", ["ps", "-a", "--filter", `name=${mid}`, "--format", "json"], { cwd: ppath })))
		.split("\n")
		.filter((x) => x.trim().length > 0)
		.map((x) => JSON.parse(x));
	cmdOP = cmdOP.map((x) => ({
		name: x.Names.replace(`${mid}-`, ""),
		status: x.State,
		uptime: x.RunningFor,
	}));
	if (cmdOP.length == 0) {
		let data = await cmdOutput(spawn("docker", ["images", mid, "--format", "json"], { cwd: ppath }));
		if (data.length == 0 && status != "undeployed") {
			console.log("bruh", status);
			if (status != "building") status = "unbuiltundeployed";
		} else {
			if (status != "deploying" || status != "building") {
				status = "undeployed";
			}
		}
	} else {
		status = stateMap[cmdOP[0].status];
	}
	return { status, cmdOP };
}
