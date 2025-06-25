"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { gemFont, lexFont, svg } from "@/utils/vars";
import { useRouter } from "next/navigation";

function SignUp() {
	const router = useRouter()
	let query:string="In"
	if (typeof window !== 'undefined') {
		query=window.location.search.slice(1)
		if(query !="up")
			query="In"
		else
		query="Up"
	}
	
	return (
		<>
			<div className="fixed top-0 left-0 h-screen w-full bg-background flex items-center justify-center flex-col gap-2">
				<label className={"h-10 flex items-center gap-2 text-4xl top-1/4 -translate-y-1/2 fixed "+gemFont.className}>{svg.cookie} bisct</label>
				<div className={"text-3xl "+gemFont.className}>Sign{" "+query}</div>
			<Input type="email" placeholder="email" />
			<Input type="password" placeholder="password" />
			<Button
				onClick={(e) => {
					const cur = e.currentTarget;
					const p1 = cur?.previousElementSibling as HTMLInputElement;
					const p2 = p1?.previousElementSibling as HTMLInputElement;
					const email = p2?.value;
					const pass = p1?.value;
					if (email && pass) {
						fetch("/api/auth", {
							method: "POST",
							body: JSON.stringify({
								email,
								pass,
							}),
						}).then(async (res) => {
							switch (res.status) {
								case 200:
									router.push("/dashboard")
									break;
							}
						});
					}
				}}
				className={lexFont.className}
				>
				Submit
			</Button>
			</div>
		</>
	);
}

export default SignUp;
