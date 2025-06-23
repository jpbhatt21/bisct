"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function Dashboard() {
	return (
		<>
			{/* <Input type="text" placeholder="name" />
			<Textarea placeholder="content" className="w-80 min-h-60" />
			<Button
				onClick={(e) => {
					const cur = e.currentTarget;
					const p1 = cur?.previousElementSibling as HTMLTextAreaElement;
					let p2: any = p1?.previousElementSibling as HTMLInputElement;
					const name = p2?.value;
					const content = p1?.value;
					fetch("/api/compose", {
						method: "POST",
						body: JSON.stringify({
							name,
							content,
						}),
					});
				}}>
				save
			</Button> */}
		</>
	);
}

export default Dashboard;
