"use client";
import { defFont, gemFont, robFont, store } from "@/utils/vars";
import { Provider } from "jotai";
import Left from "./Left";
import Head from "./Head";
import Foot from "./Foot";
import { Germania_One, Montserrat, Roboto } from "next/font/google";

// Germania_One({
// 	weight: "400",
// 	subsets: ["latin"],
// 	variable: "--font-eng",
// });
function Main({ children }: any) {
	return (
		<Provider store={store}>
			<Left className={defFont.className} />
			<div className="flex flex-col h-screen w-full">
				<Head />
				<div className={"w-full h-full flex flex-col bg-transparent items-center gap-1 justify-center "+robFont.className}>{children}</div>
				{/* <Foot /> */}
			</div>
		</Provider>
	);
}

export default Main;
