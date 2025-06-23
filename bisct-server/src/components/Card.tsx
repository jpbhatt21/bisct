"use client";
import { projectsAtom, store } from "@/utils/vars";

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
        }} key={project.id} className="w-56 h-20 bg-g1 rounded-md flex flex-col p-2  justify-center">
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
						className="px-2 py-1 font-semibold bg-transparent outline-g4 rounded-md focus:outline w-full"
					/>
				) : (
					<div className="px-2 py-1 font-semibold">{project.name}</div>
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
						className="px-2 py-1 text-g5 text-base bg-transparent  whitespace-nowrap overflow-hidden text-ellipsis w-full outline-g4 rounded-md focus:outline"
					/>
				) : (
					<label className="px-2 py-1 text-base text-g5 whitespace-nowrap overflow-hidden text-ellipsis">{project.desc}</label>
				))}
		</div>
	);
}

export default Card;
