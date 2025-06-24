import Card from "@/components/ProjectCard";

function Content({projects,openProject}:any) {
	return (
		<>
			{projects.map((project:any) => (
				<Card {...project} openProject={openProject} />
			))}
		</>
	);
}

export default Content;
