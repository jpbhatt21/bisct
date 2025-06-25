import fs from "fs";
import path from "path";
import { addProject, projectsSubdir, parentDir } from "./constants";
import { spawn } from "node:child_process";
let contPath = path.join(parentDir,projectsSubdir)
export function saveCompose(name:any,content:any){
    let uuid= crypto.randomUUID().replaceAll("-","");
    fs.mkdirSync(path.join(contPath,uuid))    
    fs.writeFileSync(path.join(contPath,uuid,"docker-compose.yaml"), content, "utf8");
    addProject(uuid,{name})
    return uuid
}
export function startContainer(dir:any){
        console.log("Avc",path.join(contPath,dir) )
        const child = spawn("docker", ["compose","up","-d"], { cwd: path.join(contPath,dir) });
        child.stdout.on("data", (data)=>{console.log(data.toString())})
        child.stderr.on("data", (data)=>{console.log(data.toString())})
}
export function dockerPS(){
    const child = spawn("docker", ["ps", "-a"], { cwd: contPath });
    let output = "";
    child.stdout.on("data", (data) => {
        output += data.toString();
    });
    child.stderr.on("data", (data) => {
        console.error(data.toString());
    });
    return new Promise((resolve, reject) => {
        child.on("close", (code) => {
            if (code === 0) {
                resolve(output);
            } else {
                reject(new Error(`Docker command failed with code ${code}`));
            }
        });
    });
    
}