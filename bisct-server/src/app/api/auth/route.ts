import { NextResponse } from "next/server";
import fs from "fs/promises";
import jwt from "jsonwebtoken";
import path from "path";
import { cookies } from "next/headers";
import { getProjects, getUsers, setUsers, verify } from "../constants";

export async function GET(request: Request) {
	let token = (await cookies()).get("token");
	let status = verify(token);
	let projects: any = {};
	if (status == 200) {
		projects = getProjects();
		projects = Object.keys(projects).map((key) => {
			return { id:key, ...projects[key] };
		});
	}
	return NextResponse.json({ auth: status == 200, projects: projects }, { status });
}
export async function POST(request: Request) {
	let content = await request.json();
	let users = getUsers();
	let email = content.email;
	let pass = content.pass;
	let user = users[email];
	let response = NextResponse.json({ auth: "err" }, { status: 401 });
	if ((user && !user.pass) || Object.keys(users).length == 0) {
		let id = crypto.randomUUID();
		const token = jwt.sign({ id, email }, process.env.JWT_SECRET as string, { expiresIn: "30d" });
		users[email] = { id, pass, token };
		setUsers(users);
		response = NextResponse.json({ auth: "ok" }, { status: 200 });
		response.cookies.set("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
	} else if (pass == user.pass) {
		const token = jwt.sign({ id: user.id, email }, process.env.JWT_SECRET as string, { expiresIn: "30d" });
		users[email].token = token;
		setUsers(users);
		response = NextResponse.json({ auth: "ok" }, { status: 200 });
		response.cookies.set("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production" });
	}
	return response;
}
