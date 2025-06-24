import { NextResponse } from "next/server";

export async function GET(request: Request,{ params }:any) {
    
    let status =200
    let message = "ok";
    let modules={};
    
    return NextResponse.json({modules,message}, { status });
}
