"use client"
import React, { Dispatch, SetStateAction } from 'react'
import { Card, CardContent, CardTitle } from './ui/card'
import {Input} from './ui/input'
import { Button } from './ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select'
import axios, { AxiosError } from 'axios'
import { toast } from './ui/toast'
import { useRouter } from 'next/navigation'

const roles = [
  { label: "Admin", value: "admin" },
  { label: "Student", value: "student" },
]

function SignIn({toggleMode}: {toggleMode: Dispatch<SetStateAction<boolean>>}) {
  const router = useRouter()
  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const data = await axios.post('/api/auth/signin', {
        email: formData.get("email"),
        password: formData.get("password"),
        role: formData.get("role"),
        clubCode: formData.get("club_code")
      });

      toast.add({ title: "Successfully Logged In!" });
      localStorage.setItem("user", JSON.stringify(data.data.user));
      if(String(data.data.user.role) == "admin") {
        router.push('/admin/dashboard')
      } else {
        router.push('/student/dashboard')
      }

    } catch (e) {
      console.log("error while signup: ", e);
      if(axios.isAxiosError(e)){
        toast.add({ title: "Error", description: e.response?.data.error});
      }
    }
  }

  return (
    <Card
    className='w-full max-w-sm'
    >
      <CardContent
      >
      <CardTitle
      className='mb-2'
      >
        Sign In
      </CardTitle>
      <form onSubmit={handleSignup} className='flex flex-col items-start justify-start gap-2'>
       <Input name="email" type='email' placeholder='Email'/>      
       <Input name="password" type='password' placeholder='Password'/>      
        <div className="flex gap-2 w-full">
         <Select name="role" items={roles} defaultValue={"student"}>
           <SelectTrigger className="w-full max-w-48">
         <SelectValue />
       </SelectTrigger>
       <SelectContent>
         <SelectGroup>
           <SelectLabel>Role</SelectLabel>
           {roles.map((item) => (
             <SelectItem key={item.value} value={item.value}>
               {item.label}
             </SelectItem>
           ))}
         </SelectGroup>
       </SelectContent>
         </Select>
        <Input name="club_code" placeholder='Club Code'/>
        </div>
       <div className='w-full mt-1 flex justify-center'>
       <Button type='submit' className="w-full">
        Sign In
       </Button>
       </div>
      </form>
      <div className=" w-full flex items-center justify-center">
        New? <button className='underline mx-2' onClick={()=>toggleMode(true)}>
           Create Account
          </button>
      </div>
      </CardContent>
    </Card>
  )
}

export default SignIn