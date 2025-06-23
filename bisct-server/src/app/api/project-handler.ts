import fs from "fs";
import path from "path";
import { addProject, projectsSubdir, parentDir } from "./constants";
let contPath = path.join(parentDir, projectsSubdir);
export function createNewProject(name: string,desc: string) {
	let uuid = crypto.randomUUID();
	fs.mkdirSync(path.join(contPath, uuid));
	addProject(uuid, { name,desc,modules:{},createdAt:Date.now(),updatedAt:Date.now() });
    return uuid

}
