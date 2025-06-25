import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader } from "lucide-react";

function OverviewGit({ module }: any) {
	return (
		<>
			<div className="w-full h-fit flex flex-col">
				<div className="w-full flex gap-4 h-20">
					<div className="w-1/2 flex flex-col h-full">
						<label className="text-base">Source</label>
						<Input className="w-full" defaultValue={module.content} />
					</div>
					<div className="w-1/2 flex flex-col h-full">
						<label className="text-base">
							Install Cmd <Button className="h-4 bg-hover hover:bg-selected duration-300 text-foreground text-xs w-4 peer p-0"><Loader className="max-h-3 max-w-3"/></Button>
							<label className="peer-hover:block absolute hidden ml-31 -mt-5.5 pointer-events-none text-muted-foreground text-xs"> {"<"} Preview commands</label>
						</label>
						<Input className="w-full" defaultValue={module.install} placeholder="Autodetect Using Nixpacks" />
					</div>
				</div>
				<div className="w-full flex gap-4 h-20">
					<div className="w-1/2 flex flex-col h-full">
						<label className="text-base">Build Cmd</label>
						<Input className="w-full" defaultValue={module.build} placeholder="Autodetect Using Nixpacks" />
					</div>
					<div className="w-1/2 flex flex-col h-full">
						<label className="text-base">Run Cmd</label>
						<Input className="w-full" defaultValue={module.run} placeholder="Autodetect Using Nixpacks" />
					</div>
				</div>
				<div className="w-full flex gap-4 h-20">
					<div className="w-1/2 flex flex-col h-full">
						<label className="text-base">URL</label>
						<Input className="w-full" defaultValue={module.url} />
					</div>
					<div className="w-1/2 flex flex-col h-full">
						<label className="text-base">Port</label>
						<Input className="w-full" defaultValue={module.port} />
					</div>
				</div>
			</div>
		</>
	);
}

export default OverviewGit;
