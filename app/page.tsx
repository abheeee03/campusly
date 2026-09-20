"use client"

import SignIn from "@/components/SignIn";
import SignUp from "@/components/SignUp";
import axios from "axios"
import { useEffect, useState } from "react"

export default function Root(){
    const [isSignup, setIsSignup] = useState(false);
    
    return <div className="h-screen w-full px-10 py-10 flex items-center justify-center">
        <div className="h-full w-full flex items-center justify-center">
        {
            isSignup ? <SignUp toggleMode={setIsSignup}/> : <SignIn toggleMode={setIsSignup}/>
        }
        </div>
    </div>
}