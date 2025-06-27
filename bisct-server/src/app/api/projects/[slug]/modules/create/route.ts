import { cookies } from "next/headers";
import { getProjects, parentDir, parseIt, projectsSubdir, verify } from "../../../../constants";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: Request, { params }: any) {
	params = await params;
	let pid = params.slug;
	let message = "ok";
	let body = await request.json();
	let token = (await cookies()).get("token");
	let status = verify(token);
	let id = "";
	if (status == 200 && pid && body.type && body.content) {
		let projects = getProjects();
		if (projects[pid as keyof typeof projects]) {
			if (body.type == "git" || body.type == "docker") {
				const uuid = crypto.randomUUID().replaceAll("-", "");
				id = uuid;
				const projectPath = path.join(parentDir, projectsSubdir, pid);
				const modulePath = path.join(projectPath, uuid);
				fs.mkdirSync(modulePath, { recursive: true });
				const modules = fs.readFileSync(path.join(projectPath, "modules.json"), { encoding: "utf-8" });
				const modulesJson = JSON.parse(modules);
				const proj_env = fs
					.readFileSync(path.join(projectPath, ".env"), { encoding: "utf-8" })
					.split("\n")
					.reduce((acc, line) => {
						const [key, value] = line.split("=");
						acc[key] = value;
						return acc;
					}, {} as Record<string, string>);
				let env: any = {
					URL: proj_env.URL.replaceAll("%uuid", uuid) || "localhost",
					PORT: proj_env.PORT,
					NAME: uuid,
				};
				let content: any = {
					source: body.content,
					install: "",
					build: "",
					run: "",
				};
				if (body.type == "git") {
					fs.copyFileSync(path.join(projectPath, "docker-compose.yaml"), path.join(modulePath, "docker-compose.yaml"));
				} else {
					let { yaml, env, config } = parseIt(body.content, uuid);

					fs.writeFileSync(path.join(modulePath, "docker-compose.yaml"), yaml, { encoding: "utf-8" });
				}
				modulesJson[uuid] = {
					id: uuid,
					name: "Module " + uuid,
					desc: body.type == "git" ? "Module created from repo" : "Module created from docker-compose",
					createdAt: Date.now(),
					updatedAt: Date.now(),
					status: body.type == "git" ? "unbuiltundeployed" : "undeployed",
					type: body.type,
					content,
					benv: {},
					renv: env,
					services: body.type == "git" ? ["app"] : [],
					config: {},
				};
				modulesJson[uuid].config = {
					type: { lv: 3, cur: modulesJson[uuid].type },
					content: { lv: 2, cur: modulesJson[uuid].content },
					benv: { lv: 1, cur: modulesJson[uuid].benv },
					renv: { lv: 1, cur: modulesJson[uuid].renv },
				};
				fs.writeFileSync(path.join(projectPath, "modules.json"), JSON.stringify(modulesJson, null, 2), { encoding: "utf-8" });
				fs.writeFileSync(
					path.join(modulePath, ".env"),
					Object.entries(env)
						.map(([key, value]) => `${key}=${value}`)
						.join("\n"),
					{ encoding: "utf-8" }
				);
				message = "Module created successfully.";
				status = 200;
			} else {
				status = 400;
				message = "Invalid type. Must be 'git' or 'docker'.";
			}
		} else {
			status = 404;
			message = "Project not found.";
		}
	} else if (status == 200) {
		status = 400;
		message = "Missing required field " + (pid ? (body.type ? "content" : "type") : "project") + ".";
	}
	return NextResponse.json({ message, id }, { status });
}
