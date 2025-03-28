"use client"
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useMemo } from 'react'
import { Button } from '../ui/button'
import { IoNotifications, IoNotificationsOutline } from "react-icons/io5";
import { useAuth } from '@clerk/nextjs'
import { cn, extractInitials, formatNumber, nameColor } from '@/lib/utils'
import DropDownMenu from './DropDownMenu'
import { TooltipDemo } from '../ToolTipProvider'
import { useCurrentUser } from '../providers/UserProvider'
import { fetchAPI } from '@/lib/fetch'
import { socket } from '@/socket'
import { useSocket } from '@/stores/useSocket'
import { Skeleton } from '../ui/skeleton'
import { useBalance } from '@/stores/useBalance'
import { createAppointment } from '@/lib/actions/appointment.actions'
import { makeAppointmentPayment } from '@/lib/actions/user.actions'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'




const Navbar = () => {
    const pathname=usePathname()
    const router=useRouter()
    const {userId}=useAuth()
    const {user,status}=useCurrentUser()
    const updateSocket = useSocket((state) => state.setSocket);
    const removeSocket = useSocket((state) => state.removeSocket);
    const {balance,setBalance}=useBalance()

    const userNameColor=nameColor(user?.name||"John Doe")
  
    // navigation links
    const navlinks=useMemo(() => {
      if (!user) return [{ name: "Home", href: "/", active: pathname === "/" }];
  
      const links = [
        { name: "Home", href: "/", active: pathname === "/" },
        { name: "Appointments", href: "/appointments", active: pathname.includes("/appointments") },
        { name: "Payments", href: `/payments/${userId}`, active: pathname.includes("/payments") },
      ];
  
      if (user.role === "doctor") {
        links.push({ name: "Withdraw", href: `/withdraw/${userId}`, active: pathname.includes("/withdraw") });
      } else if (user.role === "user") {
        links.push({ name: "Deposit", href: `/deposit/${userId}`, active: pathname.includes("/deposit") });
      }
  
      return links;
    }, [pathname, user, userId]);

    // create appointment and make payment
    const handleCreateAppointment=useCallback(async (patientId: string) => {
      if (user?.role !== "doctor") return;
  
      try {
        const date = new Date();
        const [updatedBalances, appointment] = await Promise.all([
          makeAppointmentPayment(user.id, patientId, date),
          createAppointment({
            doctor: user.id,
            user: patientId,
            schedule: date,
            status: "scheduled",
            reason: "Urgent appointment",
            note: "",
          }),
        ]);
  
        if (updatedBalances.error || appointment.error) {
          toast.error("Error processing request", { description: updatedBalances.error || appointment.error });
          return;
        }
  
        toast.success("Appointment created successfully");
  
        setBalance(balance + 500);
  
        socket?.emit("sendBookingResponse", { patientId, doctorId: user.id, urlPath: `/appointments/${appointment}/meetup` });
        socket?.emit("updateStatus", { userId: user.id, status: "occupied" });
  
        router.push(`/appointments/${appointment}/meetup`);
      } catch (error) {
        console.error("Error creating appointment:", error);
      }
    }, [user, balance, setBalance, router]);
    
 // **Request Notification Permission**
 useEffect(() => {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch(console.error);
  }
}, []);

   // **Fetch User Balance**
   useEffect(() => {
    if (!user || !userId) return;

    const controller = new AbortController();

    const fetchAccountBalance = async () => {
      try {
        const response = await fetchAPI(`/api/balance/${user.id}`, { method: "GET", signal: controller.signal });
        setBalance(response?.balance);
      } catch (error) {
        console.error("Error fetching balance:", error);
      }
    };

    fetchAccountBalance();

    return () => controller.abort();
  }, [user, userId, setBalance]);

    // **Handle Socket Events**
  useEffect(() => {
    if (!user || !socket.connected) {
      removeSocket();
      return;
    }

    updateSocket(socket);
    socket.emit("newUser", { userId: user.id, role: user.role });

    socket.on("receiveBookingResponse", (data) => {
      toast.success("Booking Accepted", { description: "Redirecting to meet the doctor..." });
      if (user.role === "user") setBalance((balance - 500));
      router.push(data.urlPath);
    });

    socket.on("receivePatientNotification", (data) => {
      if (Notification.permission === "granted") {
        const notification = new Notification("Appointment Notification", {
          body: data.message.description,
          icon: "/assets/icons/logo-icon.svg",
        });

        notification.onclick = () => window.open(`/appointments/${data.message.appointmentId}/meetup`, "_blank");
      }
    });

    socket.on("receiveBookingRequest", (data) => {
      toast("Booking Request", {
        description: data.message,
        action: <Button onClick={() => handleCreateAppointment(data.patientId)} variant="outline">Accept</Button>,
      });

      if (Notification.permission === "granted") {
        const notification = new Notification("Booking Request", {
          body: data.message,
          icon: "/assets/icons/logo-icon.svg",
        });

        notification.onclick = () => window.open(`/appointments/${data.message.appointmentId}/meetup`, "_blank");
      }
    });

    socket.on("getPaymentUpdate", (data) => {
      if (user.id === data.userId) {
        setBalance(data.amount);
        toast[data.status === "success" ? "success" : "error"](data.message);
      }
    });

    return () => {
      socket.off("receiveBookingResponse");
      socket.off("receivePatientNotification");
      socket.off("receiveBookingRequest");
      socket.off("getPaymentUpdate");
    };
  }, [user, socket]);
    // if in auth page return null
    if(pathname.includes('/auth') )  return

  return (
    <div className="z-10 sticky top-0 w-full h-20 flex items-center justify-between bg-dark-300 border-b dark:border-neutral-700 py-3 px-3 md:px-6 xl:px-12 2xl:px-32 ">
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

      {status==="authenticated" ?
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
      {(pathname!=="/"||pathname.includes("/withdraw"))&&<div className="flex items-center gap-2">
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
            className="relative p-0 rounded-full border border-neutral-700 hover:bg-neutral-700 hover:cursor-pointer"
          >
           <Avatar>
      <AvatarImage src={user?.image?user?.image:""} alt="@shadcn" />
      <AvatarFallback style={{backgroundColor:`${userNameColor}`}} className='font-semibold '>{extractInitials(user?.name||"John Doe")}</AvatarFallback>
    </Avatar>
          </Button>
          
       </DropDownMenu>
      </div>
    </div>
  );
}

export default Navbar