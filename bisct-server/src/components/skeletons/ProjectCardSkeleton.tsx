function SkeletonCard() {
    return ( <div className="w-56 h-20 cursor-pointer bg-card rounded-sm flex flex-col p-2 gap-2 justify-center">
<div className="h-5 w-1/2 rounded-sm bg-selected"></div>
<div className="h-3 w-3/4 rounded-sm bg-hover"></div>
    </div> );
}

export default SkeletonCard;