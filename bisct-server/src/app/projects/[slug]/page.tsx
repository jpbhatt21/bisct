"use client";
import { Button } from "@/components/ui/button";
import { lexFont, projectsAtom } from "@/utils/vars";
import { useAtom } from "jotai";
import { PlusIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
const DynamicProjects = dynamic(() =>import ("./content"),{ssr:false,loading: () => <div className="w-full h-full flex items-center justify-center">Loading...</div>});

function PageSlug() {
	let pid = usePathname().split("/")[2];
	const [projects, setProjects] = useAtom(projectsAtom);
	const [modules, setModules] = useState([] as any[]);
	const router = useRouter();
	function openModule(id: any) {
		router.push("/projects/" + pid + "/modules/" + id);
	}
	useEffect(() => {
		let project = projects.find((p) => p.id === pid);
		if (project) {
			setModules(project.modules || [])
			document.title = project.name || "Project";
			document.querySelector("meta[name='description']")?.setAttribute("content", project.desc || "No description available.");
			fetch("/api/projects/" + pid+"/modules").then((res) => {
				if (res.status == 200) {
					res.json().then((data) => {
						if (data.modules) {
							const modules = Object.keys(data.modules).map((key) => {
								return { ...data.modules[key], id: key };
							});
							setProjects((prev) => prev.map((p) => (p.id === pid ? { ...p, modules } : p)));
							setModules(modules||[]);
						}
					});
				}
			});
		} else {
		}
	}, []);
	return (
		<>
			<label className={"h-10 flex items-center gap-2 text-3xl m-4 self-start "+lexFont.className}>Modules</label>
			<div
				className="w-full h-full grid"
				style={{
					gridTemplateColumns: "repeat(auto-fill, minmax(256px, 256px))",
					gridAutoRows: "75px",
					columnGap: "0px",
					rowGap: "32px",
					justifyItems: "center",
				}}>
				<DynamicProjects modules={modules} openModule={openModule} />
				<Button
					onClick={() => {
						router.push("/projects/" + pid + "/add-module");
					}}
					className={"w-56 h-20 text-foreground hover:bg-card bg-background select-none cursor-pointer duration-300 border rounded-sm text-xl flex items-center justify-center gap-2 "+lexFont.className}>
					<PlusIcon/>Add
				</Button>
			</div>
		</>
	);
}

export default PageSlug;
