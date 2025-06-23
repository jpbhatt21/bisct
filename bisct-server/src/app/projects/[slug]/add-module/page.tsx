"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { socket } from "@/utils/vars";
import { Editor } from "@monaco-editor/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
let compose = "";
let github = "";
function AddModule() {
	const pathname = usePathname();
	useEffect(() => {
		socket.on("comm", (data) => {
			console.log(data);
		});
	}, []);
	return (
		<>
			<div className="w-full max-w-160 h-full p-4 gap-2 flex flex-col overflow-hidden">
				<label className="h-10 flex items-center gap-2 text-3xl m-4 self-center">Add Module</label>
				<label className="text-2xl">Using Git </label>
				<label className="flex items-center w-fit justify-center gap-1">
					git clone{" "}
					<Input
						onChange={(e) => {
							github = e.currentTarget?.value || github;
						}}
						placeholder="https://repo.hub/usr/repo.git"
						className="min-w-52"
					/>
				</label>
				<label className="text-2xl mt-4">Using Docker</label>
				<label className="text-base text-g4">docker-compose.yaml</label>

				<Editor
					onChange={(e) => {
						compose = e || "";
					}}
					language="yaml"
					defaultValue="services:"
					options={{
						minimap: { enabled: false },
						lineNumbersMinChars: 3,
					}}
					className="h-100 max-w-160"
					theme="vs-dark"
				/>

				<Button
					className="w-32 min-h-10 text-lg self-end"
					onClick={() => {
						socket.emit("addModule", {
							project: pathname.split("/")[2],
							type: github ? "git" : "docker",
							content: github || compose,
						});
					}}>
					Create
				</Button>
			</div>
		</>
	);
}

export default AddModule;
