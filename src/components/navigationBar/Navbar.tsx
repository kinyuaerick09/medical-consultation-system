"use client"
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React, { useEffect, useMemo } from 'react'
import { Button } from '../ui/button'
import { IoNotifications, IoNotificationsOutline } from "react-icons/io5";
import { useAuth } from '@clerk/nextjs'
import { cn, formatNumber } from '@/lib/utils'
import DropDownMenu from './DropDownMenu'
import { TooltipDemo } from '../ToolTipProvider'
import { useCurrentUser } from '../providers/UserProvider'
import { fetchAPI } from '@/lib/fetch'
import { socket } from '@/socket'
import { useSocket } from '@/stores/useSocket'
import { Skeleton } from '../ui/skeleton'
import { useBalance } from '@/stores/useBalance'
import { toast } from '@/hooks/use-toast'
import { createAppointment } from '@/lib/actions/appointment.actions'
import { makeAppointmentPayment } from '@/lib/actions/user.actions'





const Navbar = () => {
    const pathname=usePathname()
    const router=useRouter()
    const {userId}=useAuth()
    const {user,status}=useCurrentUser()
    const updateSocket = useSocket((state) => state.setSocket);
    const removeSocket = useSocket((state) => state.removeSocket);
     const {balance,setBalance}=useBalance()
  
    
    
    const navlinks=useMemo<NavigationLink[]>(()=>{
      if(user?.role==="doctor"){
       
        return [
          {
            name:"Home",
            href:"/",
            active:pathname==="/"
          },
          {
           name:"Appointments",
           href:`/appointments`,
           active:pathname.includes("/appointments")
         },
         {
           name:"payments",
           href:`/payments/${userId}`,
           active:pathname.includes("/payments")
         },
         {
           name:"Withdraw",
           href:`/withdraw/${userId}`,
           active:pathname.includes("/withdraw")
         },
       ]

      }
      if(user?.role==="user"){

        return [
           {
             name:"Home",
             href:"/",
             active:pathname==="/"
           },
           {
            name:"Appointments",
            href:`/appointments`,
            active:pathname.includes("/appointments")
          },
          {
            name:"payments",
            href:`/payments/${userId}`,
            active:pathname.includes("/payments")
          },
          {
            name:"Deposit",
            href:`/deposit/${userId}`,
            active:pathname.includes("/deposit")
          },
        ]
      }

     return [
        {
          name:"Home",
          href:"/",
          active:pathname==="/"
        },
        {
         name:"Appointments",
         href:`/appointments`,
         active:pathname.includes("/appointments")
       },
      ]
      
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[pathname,user])

    const handleCreateAppointment=async(patientId:string)=>{
      if(user?.role!=="doctor") return
      
      try{
        const date=new Date()
        const [updatedBalances,appointment]=await Promise.all([makeAppointmentPayment(user?.id,patientId,date),createAppointment({
          doctor:user.id,
          user:patientId,
          schedule:date,
          status:"scheduled",
          reason:"it was an urgent appointment",
          note:""
        })])
       
        if(updatedBalances.error||updatedBalances.error){
          toast({
            variant:"destructive",
            title:"!Ooops something went wrong",
            description:updatedBalances.error
          })
          toast({
            variant:"destructive",
            title:"!Ooops something went wrong",
            description:appointment.error
          })
          return
        }     

        
        toast({
          title:"Success",
          description:"Appointment created successfully"
        })

        setBalance(balance+500)
        
        socket?.emit("sendBookingResponse", {
          patientId,
          doctorId: user?.id,
          urlPath: `/appointments/${appointment}/meetup`,
        });
       socket?.emit("updateStatus", {userId:user.id,status:"occupied"})
       router.push(`/appointments/${appointment}/meetup`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }catch(error:any){
        console.log(error)
      }
    }

    useEffect(()=>{
      if ("Notification" in window) {
        if (Notification.permission === "default") {
          Notification.requestPermission().catch((err) => {
            console.error("Notification permission request failed:", err);
          });
        }
      }
  }, []);


  

    // fetch balance if user has logged in
    useEffect(()=>{
      if(!user||!userId ) return
      const controller = new AbortController();
      const fetchAccountBalance=async()=>{
         if(!userId) return
        try {
          const balance=await fetchAPI(`/api/balance/${user?.id}`,{
            method:"GET",
            headers: {
              'Content-Type': 'application/json'
            },
            signal: controller.signal,
          })
          setBalance(balance?.balance)
        } catch (error) {
          console.log(error)
        }
        
      }
      
       
        fetchAccountBalance()
    
      return () => {
        controller.abort(); // Cancel fetch if userId changes or component unmounts
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[userId,user])

    // push user to socket server
    useEffect(() => {
      if (user&& socket.connected) {
       
        if(socket) updateSocket(socket);
        socket?.emit("newUser", { userId: user.id, role: user?.role });
         
        socket.on("receiveBookingResponse",(data)=>{
          toast({
            variant:"default",
            title:"Booking Response",
            description:`The doctor accepted your booking request. Now you will be redirected to meet the doctor.`,
          })
          if(user?.role==="user"){
            setBalance(balance-500)
          }
          router.push(data.urlPath);
        })

        socket?.on("receivePatientNotification",(data)=>{

          if (Notification.permission === "granted") {
            const notification = new Notification("Appointment Notification", {
              body: data.message.description,
              icon: "/assets/icons/logo-icon.svg", // Optional: Add a relevant icon
            });
             
            

          // Add a click event to the notification (e.g., redirect to appointment page)
          notification.onclick = () => {
            window.open(`/appointments/${data?.message.appointmentId}/meetup`, "_blank");
          };
        } else {
          console.log("Notifications are not allowed by the user.");
        }

        })

        socket?.on("receiveBookingRequest",(data)=>{

          toast({
            variant:"default",
            title:"Booking Request",
            description:`${data.message}`,
            action:<Button onClick={()=>handleCreateAppointment(data?.patientId)} variant={"outline"}>Accept</Button>

          })

          if (Notification.permission === "granted") {
            const notification = new Notification("Booking Session request.", {
              body: data.message,
              icon: "/assets/icons/logo-icon.svg", // Optional: Add a relevant icon
            });
             
            

          // Add a click event to the notification (e.g., redirect to appointment page)
          notification.onclick = () => {
            window.open(`/appointments/${data?.message.appointmentId}/meetup`, "_blank");
          };
        } else {
          console.log("Notifications are not allowed by the user.");
        }

        })

        socket.on('payment_update', (data) => {
          if(user?.id===data?.id){
            setBalance(data?.amount)
          }
           
        });

      }
      
      
      removeSocket()

      return () => {
        socket?.off("newUser");
        socket?.off("receivePatientNotification")
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user,socket])
   
  

    
    if(pathname.includes('/auth') )  return

  return (
    <div className="z-10 sticky top-0 w-full h-20 flex items-center justify-between bg-dark-300 py-3 px-3 md:px-6 xl:px-12 2xl:px-32 ">
      <div className="h-full flex items-center">
        <Link href={"/"}>
          {/* desktop */}
          <Image
            src="/assets/icons/logo-full.svg"
            alt="patient"
            width={1000}
            height={1000}
            className=" h-10 w-fit  hidden md:block  "
          />
          {/* mobile */}
          <Image
            src="/assets/icons/logo-icon.svg"
            alt="patient"
            width={1000}
            height={1000}
            className="h-10 w-fit  block md:hidden"
          />
        </Link>
      </div>

      {status==="autheticated" ?
      <div className="hidden md:flex items-center gap-3 xl:gap-8 2xl:gap-12 ">
        {navlinks?.map((item, i) => (
          <Link key={i} href={item.href} className={cn("font-normal first-letter:capitalize", item.active && "font-bold text-green-500 ")}>
            {item.name}
          </Link>
        ))}
      </div>
      :
      <div className="hidden md:flex items-center gap-3 xl:gap-8 2xl:gap-12 ">
        <Skeleton className="w-[100px] h-7 rounded-full bg-dark-500"/>
        <Skeleton className="w-[100px] h-7  rounded-full bg-dark-500"/>
        <Skeleton className="w-[100px] h-7  rounded-full bg-dark-500"/>
        <Skeleton className="w-[100px] h-7  rounded-full bg-dark-500"/>
      </div>
      }

      <div className="flex items-center gap-3">


{/* account balance in ksh in desktop */}
      {pathname!=="/"&&<div className="flex items-center gap-2">
        <span className='text-base text-neutral-400 font-semibold'>Ksh</span>
        <span className="font-mono">{formatNumber(balance)}</span>
      </div>}

       <TooltipDemo title='Notifications'>
        <Link
          href={pathname !== "/notifications" ? "/notifications" : "/"}
          className="relative p-2 rounded-full border border-neutral-700 hover:bg-neutral-700 hover:cursor-pointer"
        >
          {pathname !== "/notifications" ? (
            <IoNotificationsOutline size={20} />
          ) : (
            <IoNotifications size={20} />
          )}
          <div className="size-2 rounded-full absolute top-1 right-2 bg-green-400"/>
        </Link>
        </TooltipDemo>

       <DropDownMenu>
    
          <Button
          title={user?.name?user.name:"John doe"}
            className="relative  p-1 rounded-full border border-neutral-700 hover:bg-neutral-700 hover:cursor-pointer"
          >
           <Image
              src="/assets/images/noavatar.jpg"
              alt="patient"
              width={24}
              height={24}
              className=" size-7  rounded-full "
            />
          </Button>
          
       </DropDownMenu>
      </div>
    </div>
  );
}

export default Navbar