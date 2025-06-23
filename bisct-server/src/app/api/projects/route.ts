import { cookies } from "next/headers";
import { verify } from "../constants";

import { NextResponse } from "next/server";

export async function POST(request: Request) {
    let body = await request.json();
    let token = (await cookies()).get("token");
    let status = verify(token);
    if (status == 200) {
        // startContainer(saveCompose(body.name, body.content));
    }
    return NextResponse.json({ ok: "ok" }, { status: 200 });
}
