import { cookies } from "next/headers";
import { verify } from "../../constants";
import { NextResponse } from "next/server";
import { createNewProject } from "../../project-handler";

export async function POST(request: Request) {
    let body = await request.json();
    let token = (await cookies()).get("token");
    let status = verify(token);
    let id="-1"
    if (status == 200) {
        id=createNewProject(body.name,body.desc)
    }
    return NextResponse.json({ id }, { status: 200 });
}
