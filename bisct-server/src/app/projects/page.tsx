"use client";
import dynamic from 'next/dynamic'
import { Button } from "@/components/ui/button";
import { lexFont, projectsAtom } from "@/utils/vars";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PlusIcon } from 'lucide-react';
import SkeletonCard from '@/components/skeletons/ProjectCardSkeleton';
const DynamicProjects = dynamic(() =>import ("./content"),{ssr:false,loading: () => <SkeletonCard/>});
function Projects() {
	const [projects, setProjects] = useAtom(projectsAtom);
	const router = useRouter();
	function openProject(id: any) {
		router.push("/projects/" + id);
	}
	useEffect(() => {
		document.title = "Projects";
		document.querySelector("meta[name='description']")?.setAttribute("content", "List of all projects.");
		fetch("/api/projects").then((res) => {
			if (res.status == 200) {
				res.json().then((data) => {
					if (data.projects) {
						setProjects(
							Object.keys(data.projects).map((key) => {
								return { id: key, ...data.projects[key] };
							})
						);
					}
				});
			}
		});
	}, []);
	return (
		<>
			<label className={"h-10 flex items-center gap-2 text-3xl m-4 self-start "+lexFont.className}>Projects</label>
			<div
				className="w-full h-full grid"
				style={{
					gridTemplateColumns: "repeat(auto-fill, minmax(256px, 256px))",
					gridAutoRows: "75px",
					columnGap: "0px",
					rowGap: "32px",
					justifyItems: "center",
				}}>
				<DynamicProjects projects={projects} openProject={openProject} />
				<Button
					onClick={() => {
						setProjects((prev) => [
							...prev.filter((p) => p.id[0] !== "-"),
							{
								name: "New Project",
								desc: "This is a new project.",
								id: "-" + Date.now(),
								createdAt: new Date().toISOString(),
								updatedAt: new Date().toISOString(),
							},
						]);
					}}
					className={"w-56 h-20 hover:bg-card bg-background select-none cursor-pointer duration-300 text-foreground border rounded-sm text-xl flex items-center justify-center gap-2 "+lexFont.className}>
					<PlusIcon/>Add
				</Button>
			</div>
		</>
	);
}

export default Projects;
