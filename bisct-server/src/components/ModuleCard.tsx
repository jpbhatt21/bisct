"use client";
import {  defFont } from "@/utils/vars";

let focusTimeout: any = null;
function Card(module: any) {
	return (
		<div
			onClick={() => {
				module.openModule(module.id);
			}}
			key={module.id}
			className="w-56 h-20 bg-card hover:bg-hover duration-300  rounded-sm cursor-pointer flex flex-col p-2  justify-center">
			{module.name && <div 
			className={"px-2 py-1 font-semibold text-xl "+defFont.className}>{module.name}</div>}
			{module.desc && <label className="px-2 text-sm text-muted-foreground whitespace-nowrap pointer-events-none overflow-hidden text-ellipsis">{module.desc}</label>}
		</div>
	);
}

export default Card;
