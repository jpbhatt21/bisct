import Card from "@/components/ModuleCard";

function Content({modules,openModule}:any) {
    return ( <>
    {
        modules.map((module: any) => <Card {...module} openModule={openModule} />)
    }
    </> );
}

export default Content;