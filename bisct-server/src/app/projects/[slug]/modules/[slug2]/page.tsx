"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lexFont, projectsAtom, socket } from "@/utils/vars";
import { useAtom } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Overview from "./Overview";
import { Button } from "@/components/ui/button";
import { BanIcon, EllipsisVerticalIcon, PlayIcon, RefreshCwIcon, ReplyAllIcon, Save, SquareIcon, StopCircleIcon, XIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

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
	unbuiltundeployed: {
		button: "Build & Deploy",
		icon: <PlayIcon className="fill-success text-success" />,
		bgColor: "--selected",
		color: "--foreground",
		titleColor: "--foreground",
		options: [],
	},
	building: {
		button: "Cancel",
		icon: <XIcon className="text-error" />,
		bgColor: "--muted-error",
		color: "--foreground",
		titleColor: "--warning",
		options: [],
	},
	undeployed: {
		button: "Deploy",
		icon: <PlayIcon className="text-success fill-success" />,
		bgColor: "--selected",
		color: "--foreground",
		titleColor: "--foreground",
		options: ["Remove", "Rebuild"],
	},
	deploying: {
		button: "Cancel",
		icon: <XIcon className="text-error" />,
		bgColor: "--muted-error",
		color: "--foreground",
		titleColor: "--warning",
		options: [],
	},
	running: {
		button: "Stop",
		icon: <SquareIcon className="text-error fill-error" />,
		bgColor: "--muted-error",
		color: "--foreground",
		titleColor: "--success",
		options: ["Pause", "Remove", "Restart", "Redeploy", "Rebuild & Redeploy"],
	},
	stopping: {
		button: "Disabled",
		icon: <BanIcon className="text-error" />,
		bgColor: "--hover",
		color: "--foreground",
		titleColor: "--error",
		options: [],
	},
	starting: {
		button: "Cancel",
		icon: <XIcon className="text-error" />,
		bgColor: "--muted-error",
		color: "--foreground",
		titleColor: "--warning",
		options: [],
	},
	removing: {
		button: "Disabled",
		icon: <BanIcon className="text-error" />,
		bgColor: "--hover",
		color: "--foreground",
		titleColor: "--error",
		options: [],
	},
	restarting: {
		button: "Disabled",
		icon: <BanIcon className="text-error" />,
		bgColor: "--hover ",
		color: "--foreground",
		titleColor: "--error",
		options: [],
	},
	stopped: {
		button: "Start",
		icon: <PlayIcon className="text-success fill-success" />,
		bgColor: "--hover",
		color: "--foreground",
		titleColor: "--foreground",
		options: ["Remove", "Restart", "Redeploy", "Rebuild & Redeploy"],
	},
	exited: {
		button: "Start",
		icon: <PlayIcon className="text-success fill-success" />,
		bgColor: "--hover",
		color: "--foreground",
		titleColor: "--foreground",
		options: ["Remove", "Redeploy", "Rebuild & Redeploy"],
	},
	paused: {
		button: "Resume",
		icon: <PlayIcon className="text-success fill-success" />,
		bgColor: "--hover",
		color: "--foreground",
		titleColor: "--foreground",
		options: ["Stop", "Remove", "Restart", "Redeploy", "Rebuild & Redeploy"],
	},
};
let interval: any = null;
let is_changed = false;
let original: any = {};
let typeDefault={
	git:{
		content:{
			source:"",
			install:"",
			build:"",
			run:""
		},
		benv:{},
		renv:{
			URL:"%uuid.localhost",
			PORT:3000,
			NAME:"%uuid"
		}
	},
	docker:{
		content:{
			services:{
				app:{}
			},
			
		}

	}

}
function recurDiff(obj1: any, obj2: any, keys: string[] = Object.keys({ ...obj1, ...obj2 })) {
	const ret: any = Object.fromEntries(keys.map((key) => [key, false]));
	let val1, val2;
	for (const key of keys) {
		val1 = obj1[key];
		val2 = obj2[key];

		if (typeof val1 === "object" && typeof val2 === "object" && val1 !== null && val2 !== null) {
			ret[key] = recurDiff(val1, val2);
		} else {
			ret[key] = val1 !== val2;
			if (ret[key]) {
				is_changed = true;
			}
		}
	}
	return ret;
}

function ModulesSlug() {
	const [tries, setTries] = useState(0);
	const pathname = usePathname();
	const router = useRouter();
	const query = "";
	const pid = pathname.split("/")[2];
	const mid = pathname.split("/")[4];
	const [module, setModule] = useState({} as any);
	const status: keyof typeof statusOptions = module.status || "undeployed";
	const [projects, setProjects] = useAtom(projectsAtom);
	const [reReq, setReReq] = useState("");
	const [modified,setModified] = useState({} as any)
	const [enableSave, setEnableSave] = useState(false);
	
	useEffect(() => {
		let config = module?.config || {};
		is_changed = false;
		if (config) {
			setModified(recurDiff(original, module, Object.keys(config)))
			setEnableSave(is_changed)
		}
	}, [module]);
	useEffect(() => {
		socket.on("statusModUpd", (status: any) => {
			if (status.pid == pid && status.mid == mid) {
				setModule((prevModule: any) => ({ ...prevModule, status: status.status }));
				setProjects((prevProjects: any) => prevProjects.map((project: any) => (project.id == pid ? { ...project, modules: project.modules.map((m: any) => (m.id == mid ? { ...m, status: status.status } : m)) } : project)));
			}
		});
		return () => {
			socket.off("statusModUpd");
		};
	}, []);
	useEffect(() => {
		if (tries > 5 || module.status) {
			if (interval) {
				clearInterval(interval);
				interval = null;
			}
			console.log("Module loaded or max tries reached");
			return;
		}
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
							original = JSON.parse(JSON.stringify(mod))
							setModule(mod);
						}
					});
				}
			});
		}
		if (!interval)
			interval = setInterval(() => {
				setTries((prevTries) => prevTries + 1);
			}, 1000);
	}, [tries]);
	let statusOpt = statusOptions[status];
	if (module?.type != "git") statusOpt.options = statusOpt.options.filter((option: any) => option !== "Rebuild" && option !== "Rebuild & Redeploy" && option !== "Build & Deploy");
	console.log(modified)
	return (
		<>
			<div className="w-full h-28 flex items-center gap-2 pr-8 justify-between">
				<div className=" flex flex-col gap-1">
					{module.name ? (
						<>
							<label className={"h-10 flex items-center gap-2 text-3xl m-4 -mb-2 self-start " + lexFont.className} style={{ color: "var(" + statusOpt?.titleColor || "" + ")" }}>
								{module.name}
								<label className="text-sm">({module.status})</label>
							</label>
							<label className="h-10 flex items-center gap-2 text-muted-foreground text-lg m-4 mt-0 self-start">{module?.desc || "..."}</label>
						</>
					) : (
						<>
							<div className="h-10 bg-selected w-48 m-4 -mb-2 rounded-sm"></div>
							<div className="h-6 bg-hover w-72 m-4 rounded-sm"></div>
						</>
					)}
				</div>
				<div className="flex gap-1">
					{module.status ? (
						<>
							<Button
								className=" w-32 h-10"
								disabled={enableSave ? false : true}
								style={{
									filter: enableSave ? "none" : "grayscale(0.5) brightness(0.5)",
								}}>
								<Save />
								Save
							</Button>
							<Button
								className=" w-32 h-10"
								onClick={() => {
									socket.emit("moduleReq", { pid, mid, req: statusOpt?.button });
								}}
								style={{
									backgroundColor: "var(" + statusOpt?.bgColor || "" + ")",
									color: "var(" + statusOpt?.color || "" + ")",
								}}>
								{reReq && <label className="absolute ml-0 -mt-18 pointer-events-none text-muted-foreground text-xs blink ">{reReq} Required</label>}
								{statusOpt?.icon || ""}
								{statusOpt?.button || "Disabled"}
							</Button>
							{statusOpt.options.length !== 0 && (
								<DropdownMenu>
									<DropdownMenuTrigger className="min-w-5 h-10 bg-card rounded-sm hover:bg-hover duration-300 outline-0 focus-visible:ring-ring/50 focus-visible:ring-3">
										<EllipsisVerticalIcon className="h-2/3 text-muted-foreground" />
									</DropdownMenuTrigger>
									<DropdownMenuContent className="w-24 mr-4">
										{statusOpt?.options?.map((option: string, i: number) => (
											<>
												<DropdownMenuItem
													key={option}
													className="text-sm"
													onClick={() => {
														socket.emit("moduleReq", { pid, mid, req: option });
													}}>
													{option}
												</DropdownMenuItem>
												{i + 1 !== statusOpt.options.length && <DropdownMenuSeparator />}
											</>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							)}
						</>
					) : (
						<div className="bg-hover w-32 h-10 rounded-sm" />
					)}
				</div>
			</div>
			<div className="w-full h-full flex p-4 pt-0">
				{module.type ? (
					<Tabs className="w-full h-full gap-2" defaultValue="">
						<TabsList key="tablist" className="w-fit duration-300  h-10">
							{tabs.map((tab: any) => (
								<TabsTrigger value={tab.url} className={lexFont.className + " text-base"}>
									{tab.name}
								</TabsTrigger>
							))}
						</TabsList>
						<TabsContent value="">
							<Overview module={module} setModule={setModule} modified={modified} />
						</TabsContent>
						<TabsContent value="?env"></TabsContent>
						<TabsContent value="?term"></TabsContent>
					</Tabs>
				) : (
					<div className="flex flex-col gap-2 w-full h-full">
						<div key="tablist" className="w-96 h-10  duration-300 rounded-sm bg-card" />
						<div className="flex flex-col w-full rounded-sm h-full bg-card"></div>
					</div>
				)}
			</div>
		</>
	);
}

export default ModulesSlug;
