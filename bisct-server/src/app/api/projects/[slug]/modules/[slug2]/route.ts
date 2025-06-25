import { cookies } from "next/headers";
import fs from "fs";
import { getProjects, getStatus, parentDir, projectsSubdir, verify } from "../../../../constants";
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
let stateMap:any={
	created : "undeployed",
	running: "running",
	paused :"paused",
	restarting: "restarting",
	removing: "removing",
	exited:"exited",
	dead:"undeployed",
}
export async function GET(request: Request, { params }: any) {
	params = await params;
	let pid = params.slug;
	let mid = params.slug2;
	let token = (await cookies()).get("token");
	let status = verify(token);
	let data: any = "ok";
	let module:any = {};
	if (status == 200 || true) {
		const projects = getProjects();
		if (projects[pid as keyof typeof projects]) {
			const ppath = path.join(parentDir, projectsSubdir, pid);
			const modules = JSON.parse(fs.readFileSync(path.join(ppath, "modules.json"), { encoding: "utf-8" }));
			if (modules[mid]) {
				const {cmdOP,status} =await getStatus(mid,modules[mid].status,ppath)
				data=cmdOP
				modules[mid].status=status
				fs.writeFileSync(path.join(ppath, "modules.json"), JSON.stringify(modules, null, 2), { encoding: "utf-8" });
				module = {
					id: mid,
					...modules[mid],
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
