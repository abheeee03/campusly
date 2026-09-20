import React, { Dispatch, SetStateAction, useState } from 'react'
import { Card, CardContent, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select'
import axios from 'axios'
import { toast } from './ui/toast'

const roles = [
  { label: "Admin", value: "admin" },
  { label: "Student", value: "student" },
]

function SignUp({ toggleMode }: { toggleMode: Dispatch<SetStateAction<boolean>> }) {
  const [selectedRole, setSelectedRole] = useState("student");

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const clubCode = String(formData.get("club_code") || "").trim();
    const role = String(formData.get("role") || selectedRole);

    if (role === "student" && !clubCode) {
      toast.add({ title: "Error", description: "Club code is required for students" });
      return;
    }

    try {

      const data = await axios.post('/api/auth/signup', {
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        role,
        clubCode
      });

      console.log("acc created data: ", data.data);
      toast.add({ title: "Successfully Created Account!" });

    } catch (e) {
      console.log("error while signup: ", e);
      if (axios.isAxiosError(e)) {
        toast.add({ title: "Error", description: e.response?.data?.error || "account not created"});
      } else {
        toast.add({ title: "Error", description: "account not created"});
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
          Sign Up
        </CardTitle>
        <form onSubmit={handleSignup} className='flex flex-col items-start justify-start gap-2'>
          <Input name='name' placeholder='Name' />
          <Input name='email' type='email' placeholder='Email' />
          <Input name='password' type='password' placeholder='Password' />
          <div className="flex gap-2 w-full">
            <Select name='role' items={roles} defaultValue={"student"} onValueChange={(v) => setSelectedRole(v as string)}>
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
            <div className="flex-1 flex flex-col">
              <Input name='club_code' placeholder={selectedRole === 'student' ? 'Club Code *' : 'Club Code (optional)'} required={selectedRole === 'student'} />
              <span className="text-[10px] text-muted-foreground mt-0.5">{selectedRole === 'student' ? 'Required for students' : 'Optional for admin'}</span>
            </div>
          </div>
          <div className='w-full flex justify-center'>
            <Button type='submit' className="w-full mt-1">
              Create Account
            </Button>
          </div>
        </form>
        <div className=" w-full flex items-center justify-center">
          Already have account? <button className='underline mx-2' onClick={() => toggleMode(false)}>
            Sign In
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

export default SignUp