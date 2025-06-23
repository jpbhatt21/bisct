"use client";

import Card from "@/components/Card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { projectsAtom } from "@/utils/vars";
import { useAtom } from "jotai";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";

function Projects() {
	const [projects, setProjects] = useAtom(projectsAtom);
	const router = useRouter()
	function openProject(id:any){
		router.push("/projects/"+id)
	}
	return (
		<>
			<label className="h-10 flex items-center gap-2 text-3xl m-4 self-start">Projects</label>
			<div
				className="w-full h-full grid"
				style={{
					gridTemplateColumns: "repeat(auto-fill, minmax(256px, 256px))",
					gridAutoRows: "75px",
					columnGap: "0px",
					rowGap: "32px",
					justifyItems: "center",
				}}>
				{projects.map((project) => (
					<Card {...project} openProject={openProject} />
				))}
				<Button
					onClick={() => {
						setProjects((prev) => [
							...prev.filter((p) => p.id[0] !== '-'),
							{
								name: "New Project",
								desc: "This is a new project.",
								id: "-"+Date.now(),
								createdAt: new Date().toISOString(),
								updatedAt: new Date().toISOString(),
							},
						]);
					}}
					className="w-56 h-20 hover:bg-g1 bg-g0 select-none cursor-pointer duration-300 border-g2 border rounded-md text-xl flex items-center justify-center gap-2">
					 Add
				</Button>
			</div>
		</>
	);
}

export default Projects;
