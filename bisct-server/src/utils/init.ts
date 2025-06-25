"use client";

import { navigatorAtom, projectsAtom, store } from "./vars";

export async function main(): Promise<null> {
	if (typeof window !== 'undefined')
	fetch("/api/auth").then((res) => {
		let location = window.location.pathname.split("?")[0];
		let status = res.status;
		if (status == 200) {
			res.json().then((data) => {
				store.set(projectsAtom, data.projects || []);
				// store.set(containersAtom, data.containers || []);
			});
		}
		if (status == 200 && (location == "/signin" || location == "/signup" || location == "/")) {
			store.set(navigatorAtom, {
				trigger: true,
				path: "/dashboard",
				replace: false,
			});
		} else if (status == 302 && !(location == "sign")) {
			store.set(navigatorAtom, {
				trigger: true,
				path: "/sign?up",
				replace: false,
			});
		} else if (status == 401 && !(location == "/sign"))
			store.set(navigatorAtom, {
				trigger: true,
				path: "/sign?in",
				replace: false,
			});
	});

	try {
	} catch (error) {}
	return null;
}
