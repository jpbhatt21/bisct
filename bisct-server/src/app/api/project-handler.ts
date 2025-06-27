import fs from "fs";
import path from "path";
import { addProject, projectsSubdir, parentDir, defaultCompose } from "./constants";
let contPath = path.join(parentDir, projectsSubdir);
export function createNewProject(name: string, desc: string) {
	let uuid = crypto.randomUUID().replaceAll("-","");
	let projectPath = path.join(contPath, uuid);
	fs.mkdirSync(projectPath, { recursive: true });
	fs.writeFileSync(path.join(projectPath, ".env"), "URL=%uuid.localhost\nPORT=3000", { encoding: "utf-8" });
	fs.writeFileSync(path.join(projectPath, "modules.json"), JSON.stringify({}), { encoding: "utf-8" });
	fs.writeFileSync(path.join(projectPath, "docker-compose.yaml"), defaultCompose, { encoding: "utf-8" });
	addProject(uuid, { name, desc, createdAt: Date.now(), updatedAt: Date.now() });
	return uuid;
}
