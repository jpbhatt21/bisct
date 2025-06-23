import Content from "./content";

async function PageSlug({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	return (
		<>
			<label className="h-10 flex items-center gap-2 text-3xl m-4 self-start">Modules</label>
			<Content slug={slug} />


		</>
	);
}

export default PageSlug;
