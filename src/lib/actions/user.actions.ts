"use server"

import { auth } from "@clerk/nextjs/server";
import { generateTimestamp, parseStringify } from '../utils';
import {
    APPOINTMENT_COLLECTION_ID,
    DATABASE_ID,
    DOCTOR_COLLECTION_ID,
    FEEDBACK_COLLECTION_ID,
    PAYMENT_COLLECTION_ID,
    USER_COLLECTION_ID,
    databases,
  } from "../appwrite.config";
import { ID, Query } from "node-appwrite";

interface MpesaTokenResponse {
    access_token: string;
    expires_in: string;
  }



//  GET user amount balance 
export const getUserBalance=async()=>{
    const {userId}=await auth()

    if(!userId)  return parseStringify({error:"Not Autheticated"});

    try {
        const userBalance = await databases.listDocuments(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            [Query.equal("clerkId",userId)]
          );
        return parseStringify({balance:userBalance.documents[0].balance})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err:any) {
        console.log(err)
        return parseStringify({error:"Internal Server Error"})
    }
}

// GET users appointments
export const getUserAppointments=async()=>{
    const {userId}=await auth()

    if(!userId)  return parseStringify({error:"Not Autheticated"});

    try {
        const user= await databases.listDocuments(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            [Query.equal("clerkId",userId) ]
          );
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let appointments: any[] = [];
          let doctor=null

          if(user.total===0)  return parseStringify({error:"User does not exist"})
          if(user.documents[0].role==="doctor"){
            doctor=await databases.listDocuments(
                DATABASE_ID!,
                DOCTOR_COLLECTION_ID!,
                [Query.equal("user",user.documents[0].$id) ]
              );
              if(doctor.total===0) return parseStringify({error:"This doctor does not exist"})
                appointments=doctor.documents[0].appointments
          }
          if(user.documents[0].role==="user"){
           appointments=user.documents[0].appointments
          }


          
          
            if(appointments.length===0) return parseStringify({appointments:[]})

        
          const processedAppointments = appointments?.map((doc) => {
            if(user.documents[0].role!=="doctor"){
            return {
                id: doc.$id, // Rename $id to id
                appointmentDate: doc.schedule,
                status: doc.status,
                doctor: {
                    name: doc.doctor.name,
                    reason:doc.doctor.reason,
                },
                patient: {
                    id:user.documents[0].$id,
                    name: user.documents[0].name,
                    email: user.documents[0].email,
                },
            };
        }
        return{
            id: doc.$id, // Rename $id to id
                appointmentDate: doc.schedule,
                status: doc.status,
                patient: {
                    id:doc.user.$id,
                    name: doc.user.name,
                    reason:doc.reason,
                },
                doctor: {
                  doctorId:doctor?.documents[0].$id,
                   id: user.documents[0].$id,
                    name: user.documents[0].name,
                    email: user.documents[0].email,
                },
        }
        });
        // destructure the appointments json
       


        return parseStringify({appointments:processedAppointments.sort((a,b)=>new Date(b.appointmentDate).getTime()-new Date(a.appointmentDate).getTime())})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err:any) {
        console.log("Appointments Error: ",err)
        return parseStringify({error:"internal server error"})
    }
}

// GET appointment by Id
export const   getAppointmentById=async(id:string)=>{
    const {userId}=await auth()

    if(!userId)  return parseStringify({error:"Not Autheticated"});

    try {
        const user = await databases.listDocuments(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            [Query.equal("clerkId", userId!)]
        );

        if (user.total === 0) return parseStringify({ error: "User does not exist" });
              
             
        const userAppointment = await databases.getDocument(
            DATABASE_ID!,
            APPOINTMENT_COLLECTION_ID!,
            id,
          );
        
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
         const {$id,doctor,patient,$permissions,$databaseId,$createdAt,$updatedAt,$collectionId,...others}=userAppointment
         
         const resData={
            ...others,
            id:$id,
            doctor:{
                id:doctor.user.$id,
                name:doctor.name,
                email:doctor.email
            }
         }
        

        return parseStringify({appointments:resData})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err:any) {
        console.log("Appointments Error: ",err)
        return parseStringify({error:"internal server error"})
    }
}

//GET user info
export const fetchUserData=async()=>{
    const { userId } = await auth();

    if (!userId) return parseStringify({ error: "Not Authenticated" });

     try {
        const user = await databases.listDocuments(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            [Query.equal("clerkId", userId!)]
        );

        if (user.total === 0) return parseStringify({ error: "User does not exist" });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {gender,balance,reviews,appointments,payments,doctorInfo,patient,myPayments,$databaseId,$collectionId,birthDate,clerkId,$id,$permissions,$updatedAt,$createdAt,...userData} = user.documents[0];
        return parseStringify({ user: {...userData,id:$id},error:null });

     // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
     } catch (err:any) {
        return parseStringify({user:null, error: "Internal Server Error" });
     }
}


//   Generate Mpesa Token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const generateMpesaToken = async (): Promise<any> => {
    if (!process.env.M_PESA_CONSUMER_KEY || !process.env.M_PESA_CONSUMER_SECRET) {
      return parseStringify({error:'M-Pesa credentials are not set in the environment variables'});
    }
  
    const credentials = Buffer.from(
      `${process.env.M_PESA_CONSUMER_KEY}:${process.env.M_PESA_CONSUMER_SECRET}`
    ).toString('base64');
   
    // Add a timeout to the fetch request
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout
  
    try {
     
      const response = await fetch(
        `${process.env.M_PESA_API_URL}/oauth/v1/generate?grant_type=client_credentials`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );
  
      clearTimeout(timeout);
  
      if (!response.ok) {
        return parseStringify({
          error: `Failed to generate M-Pesa token: ${response.status} ${response.statusText}`
        });
      }
  
      const data: MpesaTokenResponse = await response.json();
  
      if (!data.access_token) {
        return parseStringify({
          error: 'Invalid response: Missing access token'
        });
      }
      return parseStringify({ token: data.access_token });
  
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error:any) {
      clearTimeout(timeout);
      console.error('Error generating M-Pesa token:', error.message);
      return parseStringify({error:error?.message?`Error generating M-Pesa token:,${ error.message}`:'internal server error'});
    }
  };

//   Generate Mpesa Password
export const generateSTKPassword = async (time:Date): Promise<{ password: string; timestamp: string }> => {
    const shortCode = process.env.M_PESA_SHORTCODE!;
  const passkey = process.env.M_PESA_PASSKEY!;
    const timestamp = await generateTimestamp(time)
    const password = Buffer.from(
       `${shortCode}${passkey}${timestamp}`
      ).toString('base64');
  
    return { password, timestamp };
  };

export const getUserPayments=async(id:string)=>{
  const {userId}=await auth()

  if(!userId)  return parseStringify({error:"Not Autheticated"});
  if(!id) return parseStringify({error:"User Id is required"});
  try {
    const [user,userPayments]=await Promise.all([databases.getDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
     id
  ),
  databases.listDocuments(DATABASE_ID!,PAYMENT_COLLECTION_ID!,[Query.or([Query.equal("user",id),Query.equal("doctor",id)])])
]) 
    if(!user) return parseStringify({error:"User does not exist"})
    if(userPayments.total===0) return parseStringify({payments:[]})

      const filteredPayments: ProcessedPayment[] = [];

      for (const doc of userPayments.documents) {
        try {
          if (doc.user.$id === id && doc.doctor!==null) {
            const doctor = await databases.getDocument(
              DATABASE_ID!,
              USER_COLLECTION_ID!,
              doc.doctor
            );
          
            filteredPayments.push({
              id: doc.$id,
              status: doc.status,
              paidBy: {
                name: doctor.name,
                id: doctor.$id,
                role:doctor.role,
              },
              amount: doc.amount,
              date:doc.date,
            });
            
          }else{

            filteredPayments.push({
              id: doc.$id,
              status: doc.status,
              paidBy: {
                name: doc.user.name,
                id: doc.user.$id,
                role:doc.user.role,
              },
              amount: doc.amount,
              date:doc.date,
            });
          }
        } catch (error) {
          console.error('Error processing payment:', error);
          throw error;
        }
      }
    
    
    
    return parseStringify({payments:filteredPayments.sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime())})

  } catch (error) {
    console.log(error)
    return parseStringify({error:"Internal Server Error"})
  }
}  

// 
export const makeAppointmentPayment=async(doctorId:string,patientId:string,time:Date)=>{
  const {userId}=await auth()
  if(!userId) return parseStringify({error:"user not autheticated"})
  
  if(!doctorId || !patientId || !time) return parseStringify({error:"Doctor , time and Patient Id is required"})
  
    try {
      const [doctor,patient]=await Promise.all([databases.getDocument(DATABASE_ID!,USER_COLLECTION_ID!,doctorId),databases.getDocument(DATABASE_ID!,USER_COLLECTION_ID!,patientId)])
      if(!doctor || !patient) return parseStringify({error:"User does not exist"})
      if(patient.balance===0) return parseStringify({error:"You cannot create an appointment due to funds issue."})  
      await databases.updateDocument(DATABASE_ID!,USER_COLLECTION_ID!,patient.$id,{ balance:patient.balance-500})
     await databases.updateDocument(DATABASE_ID!,USER_COLLECTION_ID!,doctor.$id,{ balance:doctor.balance+500})
     const createPaymentInvoice=await databases.createDocument(
      DATABASE_ID!,
      PAYMENT_COLLECTION_ID!,
      ID.unique(),
      {
        amount: 500,
        date:new Date(time),
        status: "paid",
        user:patient.$id,
        doctor:doctor.$id
      })
      if(!createPaymentInvoice) return parseStringify({error:"Failed to create payment invoice."})
      return parseStringify({success:"Payment made successfully"})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error:any) {
      console.log(error)
      return parseStringify({error:"Internal server error."})
    }
}

export const createUserFeedback=async(userFeedback:Feedback)=>{
  try {
    const {userId}=await auth()
    if(!userId){throw new Error("user not autheticated")}
    const feedback=await databases.createDocument(DATABASE_ID!,FEEDBACK_COLLECTION_ID!,ID.unique(),{...userFeedback})
    if(!feedback){
      throw new Error("Something wnt wrong when creating a feedback.")
    }
    return parseStringify({message:"Feedback was created successfully."})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error:any) {
    console.error(error)
    return parseStringify({error:"Internal Server."})
  }
}