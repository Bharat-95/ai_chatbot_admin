import React from 'react'
import { ArrowLeft } from 'lucide-react';


const page = () => {
  return (
    <div className='flex justify-center items-center min-h-screen text-2xl gap-5'>
    <ArrowLeft size={30} className='animate-pulse' /> Select a Folder
    </div>
  )
}

export default page