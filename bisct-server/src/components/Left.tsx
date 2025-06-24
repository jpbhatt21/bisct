import { gemFont, sidebarOptions, svg } from "@/utils/vars";
import { useAtomValue } from "jotai";
import { useRouter, usePathname } from "next/navigation";

const pathToName: any = {
	"/dashboard": "Dashboard",
	"/term": "Terminal",
	"/settings": "Settings",
	"/projects": "Projects",
};
const nameToPath: any = Object.fromEntries(Object.entries(pathToName).map(([key, value]) => [value, key]));
function Left({className}:any) {
	const pathname = usePathname();
	const router = useRouter();

	return (
		<div className={"h-screen min-w-50 border-r border bg-sidebar flex flex-col items-center "+className}>
			<div className="h-10 p-2 my-4 w-full flex items-center justify-center">
				<label className={"h-full flex items-center gap-2 text-3xl "+gemFont.className}>{svg.cookie} bisct</label>
			</div>
			<div className="flex flex-col gap-2 w-full items-center  p-1">
				{sidebarOptions.map((option) => {
					return (
						<div
							key={option.name}
							className={`h-10 flex rounded-sm items-center w-full duration-300 gap-2 p-2 cursor-pointer hover:bg-hover ${pathToName[pathname] == option.name ? "bg-selected" : ""}`}
							onClick={() => {
								if (nameToPath[option.name]) {
									router.push(nameToPath[option.name]);
								}
							}}>
							{option.icon}
							<span className="text-base">{option.name}</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default Left;
