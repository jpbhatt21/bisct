"use client";
import { defFont, projectsAtom, store } from "@/utils/vars";

let focusTimeout: any = null;
function Card(project: any) {
	function submit(name: string, desc: string) {
		fetch("/api/projects/create", {
			method: "POST",
			body: JSON.stringify({
				name,
				desc,
			}),
		}).then((res) => {
			if (res.status == 200) {
				res.json().then((data) => {
					if (data.id) {
						store.set(projectsAtom, (prev) => {
							prev = prev.filter((p) => p.id[0] != "-");
							prev.push({
								id: data.id,
								name: name,
								desc: desc,
							});
							return prev;
						});
					}
				});
			} else {
			}
		});
	}
	return (
		<div onClick={()=>{
            if(project.id[0] == "-") return 
            project.openProject(project.id)
        }} key={project.id} className="w-56 h-20 cursor-pointer bg-card hover:bg-hover duration-300 rounded-sm flex flex-col p-2  justify-center">
			{project.name &&
				(project.id[0] == "-" ? (
					<input
						onFocus={() => {
							if (focusTimeout) clearTimeout(focusTimeout);
						}}
						onBlur={(e) => {
							if (focusTimeout) clearTimeout(focusTimeout);
							let name = e.currentTarget.value || "New Project";
							let desc = (e.currentTarget.nextElementSibling as HTMLInputElement)?.value || "No description";
							focusTimeout = setTimeout(() => {
								submit(name, desc);
							}, 100);
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.currentTarget.blur();
							}
						}}
						autoFocus
						type="text"
						defaultValue={project.name}
						className={defFont.className+" px-3 py-1 text-xl font-semibold bg-transparent duration-300 rounded-sm focus:outline w-full"}
					/>
				) : (
					<div 
					className={defFont.className+" px-3 py-1  w-full pointer-events-none overflow-hidden whitespace-nowrap text-ellipsis text-xl font-semibold"}>{project.name}</div>
				))}
			{project.desc &&
				(project.id[0] == "-" ? (
					<input
						onFocus={() => {
							if (focusTimeout) clearTimeout(focusTimeout);
						}}
						onBlur={(e) => {
							if (focusTimeout) clearTimeout(focusTimeout);
							let desc = e.currentTarget.value || "No description";
							let name = (e.currentTarget.previousElementSibling as HTMLInputElement)?.value || "New Project";
							focusTimeout = setTimeout(() => {
								submit(name, desc);
							}, 100);
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.currentTarget.blur();
							}
						}}
						defaultValue={project.desc}
						className="px-3 text-muted-foreground text-sm bg-transparent  whitespace-nowrap overflow-hidden text-ellipsis w-full duration-300 rounded-sm focus:outline"
					/>
				) : (
					<label className="px-3 text-sm text-muted-foreground whitespace-nowrap pointer-events-none overflow-hidden text-ellipsis">{project.desc}</label>
				))}
		</div>
	);
}

export default Card;
