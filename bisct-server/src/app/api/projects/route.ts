import { cookies } from "next/headers";
import { getProjects, verify } from "../constants";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    let token = (await cookies()).get("token");
    let status = verify(token);
    let message = "ok";
    let projects = {};
    if (status == 200) {
       projects = getProjects();
    }
    return NextResponse.json({ message,projects }, { status: 200 });
}
