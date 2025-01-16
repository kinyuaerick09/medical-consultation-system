"use client"
import { fetchAPI } from '@/lib/fetch';
import { useSocket } from '@/stores/useSocket'
import { useAuth } from '@clerk/nextjs';
import Image from 'next/image';
import React, { useEffect,useState } from 'react'
import { Button } from '../ui/button';
import OnlineBanner from './OnlineBanner';
import { Input } from '../ui/input';
import { BiSearch } from "react-icons/bi";
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';

type OnlineDoctor={
  id:string;
  newUserId:string;
  role:"doctor"
}

const OnlineDoctorsCards = () => {
    const {socket}=useSocket()
    const [onlineDoctors,setOnlineDoctors]=useState<OnlineDoctor[]>([])
    const [doctors,setDoctors]=useState<User[]>([])
    const [isFetchingDoctorsInfo,setIsFetchingDoctorsInfo]=useState(false)
    const [searchInput,setSearchInput]=useState("")
    const [filteredDoctors,setFilteredDoctors]=useState<User[]>([])
  
    useEffect(()=>{
      
      const controller=new AbortController()

      const handleGetOnlineDoctors=(doctors:OnlineDoctor[])=>{
        if(doctors?.length >0){
          setOnlineDoctors(doctors.flat())
        }
    }
  
      const fetchDoctorInfo=async()=>{
        setIsFetchingDoctorsInfo(true)
        const doctorsIds = onlineDoctors.map((item) => item.newUserId)
         try {
            const res =await fetchAPI("/api/getDoctorsInfo",{
              method:"POST",
              headers:{
                "Content-Type": "application/json"
              },
              body:JSON.stringify({ doctorsIds }),
              signal:controller.signal
            })
            setDoctors(res)
            setIsFetchingDoctorsInfo(false)
         } catch (error) {
          console.log("Error fetching Doctor Info: ",error)
          setIsFetchingDoctorsInfo(false)
         }
      }

      socket?.on("getOnlineDoctors",handleGetOnlineDoctors)

      if (onlineDoctors.length > 0) {
        fetchDoctorInfo();
      }

      const intervalId = setInterval(() => {
        // Request the latest list of online doctors from the socket every 5 minutes (300000ms)
        socket?.emit("getOnlineDoctors");  // You can emit a message to request the update
      }, 300000);

      return () => {
        socket?.on("getOnlineDoctors",handleGetOnlineDoctors)
        clearInterval(intervalId)
        controller.abort()
      }
    },[socket,onlineDoctors])

    const handleSearchSpecialty=()=>{
      const regex = new RegExp(`${searchInput}`, "i");
      const searchedDoctors=doctors.filter(item => item.specialty.some(spec => regex.test(spec)))
      setFilteredDoctors(searchedDoctors)
    }

  return (
    <div className=" w-full h-[calc(100vh-80px)] ">
      <ScrollArea className="w-full h-full ">
        <div className="w-full flex flex-col gap-3 relative">
          <div className="z-10 py-1 sticky top-0  flex items-center justify-center bg-dark-300 ">
            <div className="w-11/12 md:w-8/12 lg:w-5/12  flex items-center p-2 ring-2 ring-neutral-500 rounded-full focus-within:bg-neutral-800 focus-within:ring-neutral-200 ">
              <Input
                type="text"
                onChange={(e)=>setSearchInput(e.target.value)}
                placeholder="Search by specialty..."
                className="border-none ring-0 ring-offset-0 bg-transparent focus-visible:ring-offset-0 focus-visible:ring-0 "
              />
              <Button
                variant={"secondary"}
                onClick={handleSearchSpecialty}
                className={`p-3 capitalize bg-green-500 rounded-full `}
              >
                <BiSearch size={24} />
              </Button>
            </div>
          </div>
          <div className="w-full  grid grid-flow-row md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-3  p-3">
            {!isFetchingDoctorsInfo ? (
              <>
               {(filteredDoctors.length > 0 ? filteredDoctors : doctors).map((doctor) => (
      <OnlineDoctorCard key={doctor.id} />
    ))}
              </>
            ) : (
              <>
                 {Array.from({ length: 6 }).map((_, index) => (
      <OnlineDoctorCardSkeleton key={index} />
    ))}
              </>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

const OnlineDoctorCard=({doctor}:{doctor?:User})=>{
  return (
    <div className="col-span-1 p-3 flex flex-col gap-3 bg-dark-400 rounded-md">
    <div className="w-full flex items-center gap-3 relative">
      <div className=" relative w-1/12 aspect-auto rounded-full bg-neutral-600">
        
        <Image
          src={"/assets/images/noavatar.jpg"}
          alt="doctor"
          height={120}
          width={120}
          priority
          className=" w-full aspect-square rounded-full"
        />
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <h4 className="capitalize font-semibold  truncate">
          Dr. John Doe
        </h4>
        <span className="capitalize truncate text-sm font-medium  text-gray-400">
          Peditrician | Surgeon
        </span>
       
       
      </div>
      <div className="absolute top-3 right-3">
      <OnlineBanner userId='uiewutyg2378'/>
      </div>
    </div>
    <p className="text-sm font-thin line-clamp-2">
          Lorem ipsum dolor sit, amet consectetur adipisicing elit. Sit veniam
          hic impedit, nostrum, reprehenderit odit quas odio, ut voluptatem rem
          cupiditate dolorem molestiae similique temporibus obcaecati corporis
          ipsam eveniet deserunt.
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button variant={"link"} className={`capitalize`}>
            Preview Doctor
          </Button>
          <Button variant={"secondary"} className={`capitalize bg-green-500`}>
            Book Doctor
          </Button>
        </div>
    </div>
  );
}

const OnlineDoctorCardSkeleton=()=>{
  return(
    <div className="col-span-1 p-3 flex flex-col gap-3 bg-dark-400 rounded-md">
    <div className="w-full flex items-center gap-3 relative">
      <div className=" relative w-1/12 aspect-auto rounded-full ">
        
      <Skeleton className='w-full aspect-square rounded-full bg-dark-500'/>
      </div>
      <div className="flex-1 flex flex-col gap-1">
      <Skeleton className='w-4/12 h-4 rounded-full bg-dark-500'/>
        <Skeleton className='w-5/12 h-4 rounded-full bg-dark-500'/>
       
       
      </div>
    </div>
    <Skeleton className='w-full h-4 rounded-full bg-dark-500'/>
    <Skeleton className='w-4/12 h-4 rounded-full bg-dark-500'/>
        <div className="flex items-center justify-end gap-3">
        <Skeleton className='w-4/12 h-4 rounded-full bg-dark-500'/>
        <Skeleton className='w-4/12 h-10 rounded-md bg-dark-500'/>
        </div>
    </div>
  )
}

export default OnlineDoctorsCards