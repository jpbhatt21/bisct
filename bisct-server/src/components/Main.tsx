"use client";
import { store } from "@/utils/vars";
import { Provider } from "jotai";
import Left from "./Left";
import Head from "./Head";
import Foot from "./Foot";
import { Germania_One } from "next/font/google";
const gem=Germania_One({
	weight: "400",
	subsets: ["latin"],
	variable: "--font-eng",
});
function Main({ children }: any) {
	return (
		<Provider store={store}>
			<Left className={gem.className} />
			<div className="flex flex-col h-screen w-full">
				<Head />
				<div className={"w-full h-full flex flex-col items-center gap-1 justify-center text-xl "+gem.className}>{children}</div>
				{/* <Foot /> */}
			</div>
		</Provider>
	);
}

export default Main;
