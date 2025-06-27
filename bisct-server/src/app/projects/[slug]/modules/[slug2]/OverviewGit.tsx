import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LinkIcon, Loader } from "lucide-react";
import { useEffect } from "react";

function OverviewGit({ module, setModule, modified }: any) {
	function handleChange(key: any, value: any) {
		setModule((prev: any) => {
			prev.content[key] = value;
			return { ...prev };
		});
	}
	return (
		<>
			{JSON.stringify(modified) != "{}" ? (
				<div className="w-full h-fit flex flex-col">
					<div className="w-full flex gap-4 h-20">
						<div className="w-1/2 flex flex-col h-full">
							<label className="text-base">Source</label>
							<Input
								onKeyUp={(e) => {
									handleChange("source", e.currentTarget.value);
								}}
								className={"w-full duration-300 border " + (modified.content.source ? "border-muted-warning" : "border-muted-warning/0")}
								defaultValue={module.content.source}
								placeholder="https://repo.hub/usr/repo.git"
							/>
						</div>
						<div className="w-1/2 flex flex-col h-full">
							<label className="text-base">
								Install Cmd{" "}
								<Button className="h-4 bg-hover hover:bg-selected duration-300 text-foreground text-xs w-4 peer p-0">
									<Loader className="max-h-3 max-w-3" />
								</Button>
								<label className="peer-hover:block absolute hidden ml-31 -mt-5.5 pointer-events-none text-muted-foreground text-xs"> {"<"} Preview commands</label>
							</label>
							<Input
								onKeyUp={(e) => {
									handleChange("install", e.currentTarget.value);
								}}
								className={"w-full duration-300 border " + (modified.content.install ? "border-muted-warning" : "border-muted-warning/0")}
								defaultValue={module.content.install}
								placeholder="Autodetect Using Nixpacks"
							/>
						</div>
					</div>
					<div className="w-full flex gap-4 h-20">
						<div className="w-1/2 flex flex-col h-full">
							<label className="text-base">Build Cmd</label>
							<Input
								onKeyUp={(e) => {
									handleChange("build", e.currentTarget.value);
								}}
								className={"w-full duration-300 border " + (modified.content.build ? "border-muted-warning" : "border-muted-warning/0")}
								defaultValue={module.content.build}
								placeholder="Autodetect Using Nixpacks"
							/>
						</div>
						<div className="w-1/2 flex flex-col h-full">
							<label className="text-base">Run Cmd</label>
							<Input
								onKeyUp={(e) => {
									handleChange("run", e.currentTarget.value);
								}}
								className={"w-full duration-300 border " + (modified.content.run ? "border-muted-warning" : "border-muted-warning/0")}
								defaultValue={module.content.run}
								placeholder="Autodetect Using Nixpacks"
							/>
						</div>
					</div>
					<div className="w-full flex gap-4 h-20">
						<div className="w-1/2 flex flex-col h-full">
							<label className="text-base">URL</label>
							<div className="w-full flex gap-2">
								<Input
									onKeyUp={(e) => {
										let val = e.currentTarget.value;
										setModule((prev: any) => {
											prev.renv.URL = val;
											return { ...prev };
										});
									}}
									className={"w-full duration-300 border " + (modified.renv.URL ? "border-muted-warning" : "border-muted-warning/0")}
									defaultValue={module.renv.URL}
								/>
								<Button
									className="h-9 w-9 bg-hover hover:bg-selected duration-300 text-foreground text-xs  p-0"
									onClick={() => {
										const url = module.renv.URL;
										if (url) {
											window.open("http://" + url, "_blank");
										}
									}}>
									<LinkIcon className="max-h-5 max-w-5" />
								</Button>
							</div>
						</div>
						<div className="w-1/2 flex flex-col h-full">
							<label className="text-base">Port</label>
							<Input
								onKeyUp={(e) => {
									let val = e.currentTarget.value;
									setModule((prev: any) => {
										prev.renv.PORT = val;
										return { ...prev };
									});
								}}
								className={"w-full duration-300 border " + (modified.renv.PORT ? "border-muted-warning" : "border-muted-warning/0")}
								defaultValue={module.renv.PORT}
							/>
						</div>
					</div>
				</div>
			) : (
				<></>
			)}
		</>
	);
}

export default OverviewGit;
