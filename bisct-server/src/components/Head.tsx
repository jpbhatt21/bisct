"use client";

import { navigatorAtom, store } from "@/utils/vars";
import { main } from "@/utils/init";
import { Provider, useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

main()
function Head() {
    const router = useRouter()
    const [navigator,setNavigator] = useAtom(navigatorAtom)
    useEffect(()=>{
        if(navigator.trigger){
            if(window.location.href == navigator.path){
                setNavigator(prev=>({...prev,trigger:false}))
            }
            else if(navigator.replace){
                router.replace(navigator.path)
            }
            else
            router.push(navigator.path)
        }
    },[navigator])
	return<Provider store={store}> <div className="flex w-full min-h-10 bg-g1 border-b border-g3"></div></Provider>;
}

export default Head;
