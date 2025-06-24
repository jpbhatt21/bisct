"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lexFont, projectsAtom, socket } from "@/utils/vars";
import { useAtom } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Overview from "./Overview";
import { Button } from "@/components/ui/button";
import { BanIcon, PlayIcon, RefreshCwIcon, ReplyAllIcon, SquareIcon, StopCircleIcon, XIcon } from "lucide-react";
const tabs = [
	{ name: "Overview", url: "" },
	{ name: "Env Vars", url: "?env" },
	// { name: "Files", url: "?files" },
	{ name: "Terminal", url: "?term" },
];
// const statusOptions = {
// 	undeployed: "Deploy",
// 	deploying: "Cancel",
// 	starting: "Cancel",
// 	created: "Start",
// 	running: "Stop",
// 	stopping: "Disabled",
// 	exited: "Restart",
// 	removing: "Disabled",
// };

const statusOptions = {
	undeployed: {
		button: "Deploy",
		icon: <PlayIcon fill="var(--success)" className="text-success" />,
		bgColor: "--selected",
		color: "--foreground",
		titleColor: "--foreground",
	},
	deploying: {
		button: "Cancel",
		icon: <XIcon className="text-error" />,
		bgColor: "--muted-error",
		color: "--foreground",
		titleColor: "--warning",
	},
	starting: {
		button: "Cancel",
		icon: <XIcon className="text-error" />,
		bgColor: "--muted-error",
		color: "--foreground",
		titleColor: "--warning",
	},
	created: {
		button: "Start",
		icon: <PlayIcon fill="var(--success)" className="text-success" />,
		bgColor: "--selected",
		color: "--foreground",
		titleColor: "--foreground",
	},
	running: {
		button: "Stop",
		icon: <SquareIcon fill="var(--error)" className="text-error" />,
		bgColor: "--muted-error",
		color: "--foreground",
		titleColor: "--success",
	},
	stopping: {
		button: "Disabled",
		icon: <BanIcon className="text-error"/>,
		bgColor: "--hover",
		color: "--foreground",
		titleColor: "--error",
	},
	exited: {
		button: "Restart",
		icon: <RefreshCwIcon className="text-warning" />,
		bgColor: "--hover",
		color: "--foreground",
		titleColor: "--foreground",
	},
	removing: {
		button: "Disabled",
		icon: <BanIcon className="text-error"/>,
		bgColor: "--hover ",
		color: "--foreground",
		titleColor: "--error",
	},
};
function ModulesSlug() {
	const pathname = usePathname();
	const router = useRouter();
	const query = "";
	const pid = pathname.split("/")[2];
	const mid = pathname.split("/")[4];
	const [module, setModule] = useState({} as any);
	const status:keyof typeof statusOptions = module.status || "undeployed"; 
	const [projects, setProjects] = useAtom(projectsAtom);
	console.log(module, mid, query);
	useEffect(() => {
		socket.on("statusModUpd", (status: any) => {
			if (status.pid == pid && status.mid == mid) {
				setModule((prevModule: any) => ({ ...prevModule, status: status.status }));
				setProjects((prevProjects: any) => prevProjects.map((project: any) => (project.id == pid ? { ...project, modules: project.modules.map((m: any) => (m.id == mid ? { ...m, status: status.status } : m)) } : project)));
			}
		});
		const project = projects.find((p) => p.id === pid);
		if (project) {
			const mod = project?.modules?.find((m: any) => m.id === mid) || {};
			setModule(mod);
			document.title = mod.name || "Module";
			document.querySelector("meta[name='description']")?.setAttribute("content", mod.desc || "No description available.");
			fetch(`/api/projects/${pid}/modules/${mid}`).then((res) => {
				if (res.status == 200) {
					res.json().then((data) => {
						if (data.module) {
							const mod = data.module;
							setProjects((prevProjects) => prevProjects.map((project) => (project.id == pid ? (project.modules ? project.modules.map((module: any) => (module.id == mid ? mod : module)) : [mod]) : project)));
							setModule(mod);
						}
					});
				}
			});
		} else {
		}
	}, []);

	return (
		<>
			<div className="w-full h-28 flex items-center gap-2 pr-8 justify-between">
				<div className=" flex flex-col gap-1">
					<label className={"h-10 flex items-center gap-2 text-3xl m-4 -mb-2 self-start " + lexFont.className}
					style={{ color: "var(" + statusOptions[status]?.titleColor || "" + ")" }}
					>{module?.name || "..."}<label className="text-sm">({module.status})</label></label>
					<label className="h-10 flex items-center gap-2 text-muted-foreground text-lg m-4 mt-0 self-start">{module?.desc || "..."}</label>
				</div>
				<div className="flex flex-col gap-1">
					{(module.status ) && (
						<>
							
							<Button
								onClick={() => {
									socket.emit("moduleReq", { pid, mid });
								}}
								style={{
									backgroundColor: "var(" + statusOptions[status]?.bgColor || "" + ")",
									color: "var(" + statusOptions[status]?.color || "" + ")",
								}}>
								{statusOptions[status]?.icon || ""}{statusOptions[status]?.button || "Disabled"}
							</Button>
						</>
					)}
				</div>
			</div>
			<div className="w-full h-full flex p-4 pt-0">
				<Tabs className="w-full h-full gap-2" defaultValue="">
					<TabsList className="w-fit h-10">
						{tabs.map((tab: any) => (
							<TabsTrigger value={tab.url} className={lexFont.className + " text-base"}>
								{tab.name}
							</TabsTrigger>
						))}
					</TabsList>
					<TabsContent value="">
						<Overview module={module} />
					</TabsContent>
					<TabsContent value="?env"></TabsContent>
					<TabsContent value="?term"></TabsContent>
				</Tabs>
			</div>
		</>
	);
}

export default ModulesSlug;
