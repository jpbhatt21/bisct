import { cookies } from "next/headers";
import fs from "fs";
import { getProjects, parentDir, projectsSubdir, verify } from "../../../constants";
import { NextResponse } from "next/server";
import path from "path";

export async function GET(request: Request, { params }: any) {
	params = await params;
	let project = params.slug;
	let token = (await cookies()).get("token");
	let status = verify(token);
	let message = "ok";
	let modules = {};
	if (status == 200) {
		const projects = getProjects();
		if (projects[project as keyof typeof projects]) {
			modules = JSON.parse(fs.readFileSync(path.join(parentDir, projectsSubdir, project, "modules.json"), { encoding: "utf-8" }));
		} else {
			status = 404;
			message = "Project not found";
		}
	}
	return NextResponse.json({ modules, message }, { status });
}
