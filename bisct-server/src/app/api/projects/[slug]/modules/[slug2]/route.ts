import { cookies } from "next/headers";
import fs from "fs";
import { getProjects, parentDir, projectsSubdir, verify } from "../../../../constants";
import { NextResponse } from "next/server";
import path from "path";
import { spawn } from "child_process";
async function comm(child: any) {
	let finished = 0;
	let op: any = "";
	child.stdout.on("data", (data: any) => (op += data.toString()));
	child.stderr.on("data", (data: any) => (op += data.toString()));
	child.on("close", (code: any) => {
		finished = 1;
	});

	child.on("error", (error: any) => {
		finished = -1;
	});
	while (finished == 0) {
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	return op;
}
export async function GET(request: Request, { params }: any) {
	params = await params;
	let pid = params.slug;
	let mid = params.slug2;
	let token = (await cookies()).get("token");
	let status = verify(token);
	let data: any = "ok";
	let module = {};
	if (status == 200 || true) {
		const projects = getProjects();
		if (projects[pid as keyof typeof projects]) {
			const ppath = path.join(parentDir, projectsSubdir, pid);
			const modules = JSON.parse(fs.readFileSync(path.join(ppath, "modules.json"), { encoding: "utf-8" }));
			if (modules[mid as keyof typeof modules]) {
				data = (await comm(spawn("docker", ["ps", "-a", "--filter", `name=${mid}`, "--format", "{{json .}}"], { cwd: ppath })))
					.split("\n")
					.filter((x: any) => x.trim().length > 0)
					.map((x: any) => JSON.parse(x));
				data = data.map((x: any) => ({
					name: x.Names.replace(`${mid}-`, ""),
					status: x.State,
					uptime: x.RunningFor,
				}));
				if (modules[mid as keyof typeof modules].status == "deploying") {
				} else if (data.length == 0) {
					modules[mid as keyof typeof modules].status = "undeployed";
				} else {
					modules[mid as keyof typeof modules].status = data[0].status;
				}
				fs.writeFileSync(path.join(ppath, "modules.json"), JSON.stringify(modules, null, 2), { encoding: "utf-8" });
				module = {
					id: mid,
					...modules[mid as keyof typeof modules],
				};
			} else {
				status = 404;
				data = "Module not found";
			}
		} else {
			status = 404;
			data = "Project not found";
		}
	}
	return NextResponse.json({ module, message: data }, { status });
}
