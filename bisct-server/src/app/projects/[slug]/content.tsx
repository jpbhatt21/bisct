'use client';
import { Button } from "@/components/ui/button";
import { projectsAtom, socket } from "@/utils/vars";
import { useAtom } from "jotai";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
function Content({slug}:any) {
	const [projects, setProjects] = useAtom(projectsAtom);
	const [modules, setModules] = useState([]);
    const router = useRouter();
	useEffect(() => {
		let project = projects.find((p) => p.id === slug);
		if (project) {
			setModules(project.modules || []);
			document.title = project.name || "Project";
			document.querySelector("meta[name='description']")?.setAttribute("content", project.desc || "No description available.");
		} else {
		}
	}, []);
	return <div
				className="w-full h-full grid"
				style={{
					gridTemplateColumns: "repeat(auto-fill, minmax(256px, 256px))",
					gridAutoRows: "75px",
					columnGap: "0px",
					rowGap: "32px",
					justifyItems: "center",
				}}>
                    <Button
					onClick={() => {
						router.push("/projects/"+slug+"/add-module")
					}}
					className="w-56 h-20 hover:bg-g1 bg-g0 select-none cursor-pointer duration-300 border-g2 border rounded-md text-xl flex items-center justify-center gap-2">
					Add
				</Button>
                </div>;
}

export default Content;
