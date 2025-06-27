import { Tabs } from "@/components/ui/tabs";
import { TabsList, TabsTrigger } from "@/components/ui/tabs"
import { svg } from "@/utils/vars";
import { TabsContent } from "@radix-ui/react-tabs";
import { ContainerIcon, GitBranchIcon, GitBranchPlusIcon, GitCommit, GitForkIcon } from "lucide-react";
import OverviewGit from "./OverviewGit";

function Overview({module,setModule,modified}:any) {
    return ( 
    <div className="w-full max-h-full text-lg bg-card rounded-sm flex flex-col p-2">
        <Tabs className="w-full h-fit" onValueChange={(e:any)=>{
                setModule((prev:any)=>{
                    prev.type = e;
                    return {...prev};
                });
                
            }} defaultValue={module.type||"git"}>
            <TabsList className={"h-10 duration-300 border "+(modified.type?"border-muted-warning":"border-muted-warning/0")} >
                <TabsTrigger value="git"><GitForkIcon/>Git</TabsTrigger>
                <TabsTrigger value="docker">{svg.docker} Docker</TabsTrigger>
            </TabsList>
            <TabsContent value="git" className="w-full flex flex-col gap-2 px-4" >
                <OverviewGit {...{module,setModule,modified}} />
            </TabsContent>
        </Tabs>
    </div>
    );
}

export default Overview;