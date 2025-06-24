import { cookies } from "next/headers";
import { getProjects, parentDir, projectsSubdir, verify } from "../../../../constants";
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
				const modules = fs.readFileSync(path.join(projectPath, "modules.json"), { encoding: "utf-8" });
				const modulesJson = JSON.parse(modules);
				const env = fs
					.readFileSync(path.join(projectPath, ".env"), { encoding: "utf-8" })
					.split("\n")
					.reduce((acc, line) => {
						const [key, value] = line.split("=");
						acc[key] = value;
						return acc;
					}, {} as Record<string, string>);
				modulesJson[uuid] = {
					id: uuid,
					status: "undeployed",
					type: body.type,
					content: body.content,
					install: "",
					build: "",
					run: "",
					services: body.type == "git" ? ["app"] : [],
					url: env.URL.replaceAll("%uuid", uuid),
					port: "3000",
					name:
						body.type == "git"
							? body.content.split("/").pop()?.replace(".git", "") || "Module"
							: body.content
									.split("\n")
									.find((line: string) => line.startsWith("name:"))
									?.split(":")[1]
									?.trim() || "Module",
					desc: body.type == "git" ? "Module created from repo" : "Module created from docker-compose",
					createdAt: Date.now(),
					updatedAt: Date.now(),
				};
				env[`URL${uuid}`] = env.URL.replaceAll("%uuid", uuid);
				env[`PORT${uuid}`] = "3000";
				let moduleCompose = "";
				fs.writeFileSync(path.join(projectPath, "modules.json"), JSON.stringify(modulesJson, null, 2), { encoding: "utf-8" });
				fs.writeFileSync(
					path.join(projectPath, ".env"),
					Object.entries(env)
						.map(([key, value]) => `${key}=${value}`)
						.join("\n"),
					{ encoding: "utf-8" }
				);
				if (body.type == "git") {
					moduleCompose = fs
						.readFileSync(path.join(projectPath, "docker-compose-default.yaml"), { encoding: "utf-8" })
						.replaceAll("%url", "${URL" + uuid + "}")
						.replaceAll("%port", "${PORT" + uuid + "}")
						.replaceAll("%uuid", uuid);
					fs.writeFileSync(path.join(projectPath, "docker-compose-" + uuid + ".yaml"), moduleCompose, { encoding: "utf-8" });
				}

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
