"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lexFont } from "@/utils/vars";
import { Editor } from "@monaco-editor/react";
import { usePathname, useRouter } from "next/navigation";
// import { useEffect, useRef } from "react";
let compose = "";
let github = "";
function AddModule() {
	const pathname = usePathname();
	const pid = pathname.split("/")[2];
	const router = useRouter();

	return (
		<>
			<div className="w-full max-w-160 h-full p-4 gap-2 flex flex-col overflow-hidden">
				<label className={"h-10 flex items-center gap-2 text-3xl m-4 self-center " + lexFont.className}>Add Module</label>
				<label className={"text-2xl " + lexFont.className}>Using Git </label>
				<label className="flex items-center w-full justify-center gap-1">
					<label className="min-w-fit">git clone</label>{" "}
					<Input
						onChange={(e) => {
							github = e.currentTarget?.value || github;
						}}
						placeholder="https://repo.hub/usr/repo.git"
						className="w-full"
					/>
				</label>
				<label className={"text-2xl mt-4 " + lexFont.className}>Using Docker</label>
				<label className="text-base ">docker-compose.yaml</label>

				<Editor
					onChange={(e) => {
						compose = e || "";
					}}
					language="yaml"
					defaultValue={`version: '3.8'
services:
  app:
    image: \${NAME}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(\`\${URL}\`)"
      - "traefik.http.routers.app.entrypoints=web"
      - "traefik.http.services.app.loadbalancer.server.port=\${PORT}"
    networks:
      - traefik

networks:
  traefik:
    external: true
`}
					options={{
						minimap: { enabled: false },
						lineNumbersMinChars: 3,
						wordWrap:"on"
					}}
					className="h-9/10 w-full max-w-160"
					theme="vs-dark"
				/>

				<Button
					className={"w-32 min-h-10 text-lg self-end " + lexFont.className}
					onClick={() => {
						fetch("/api/projects/" + pid + "/modules/create", {
							method: "POST",
							body: JSON.stringify({
								type: github.length > 0 ? "git" : "docker",
								content: github.length > 0 ? github : compose,
							}),
						}).then((res) => {
							if (res.status == 200) {
								res.json().then((data) => {
									router.push("/projects/" + pid + "/modules/" + data.id);
								});
							}
						});
						// socket.emit("addModule", {
						// 	project: pathname.split("/")[2],
						// 	type: github ? "git" : "docker",
						// 	content: github || compose,
						// });
					}}>
					Create
				</Button>
			</div>
		</>
	);
}

export default AddModule;
