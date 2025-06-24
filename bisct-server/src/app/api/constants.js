import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
export const parentDir = path.join(path.dirname(process.cwd()), "bisct-data");
let usersFile = "users.json";
export const projectsSubdir = "projects";
export const projectsFile = "projects.json";
let temp = {
	users: {},
	projects: {},
};

try {
	temp.users = JSON.parse(fs.readFileSync(path.join(parentDir, usersFile), "utf8"));
	temp.projects = JSON.parse(fs.readFileSync(path.join(parentDir, projectsSubdir, projectsFile), "utf8"));
} catch {
	fs.mkdirSync(parentDir, { recursive: true });
	fs.mkdirSync(path.join(parentDir, projectsSubdir), { recursive: true });
	fs.writeFileSync(path.join(parentDir, usersFile), JSON.stringify({}), "utf8");
	fs.writeFileSync(path.join(parentDir, projectsSubdir, projectsFile), JSON.stringify({}), "utf8");
}
let users = temp.users;
let projects = temp.projects;
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
export const getUsers = () => ({ ...users });
export const setUsers = (val) => {
	users = val;
	fs.writeFileSync(path.join(parentDir, usersFile), JSON.stringify(users), "utf8");
};

export function verify(token) {
	let status = 401;
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
export const defaultCompose = `version: '3.8'
services:
  app:
    image: %uuid
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(\`%url\`)"
      - "traefik.http.routers.app.entrypoints=web"
      - "traefik.http.services.app.loadbalancer.server.port=%port"
    networks:
      - traefik

networks:
  traefik:
    external: true
`;
