"use client"
import { useSignIn } from '@clerk/nextjs'
import React, { useState } from 'react'
import { Form } from '../ui/form'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserFormValidation, userSignInValidation } from '@/lib/validation'
import CustomFormField, { FormFieldType } from '../CustomFormField'
import SubmitButton from '../SubmitButton'
import { useRouter } from 'next/navigation'
import { Button } from '../ui/button'

function SignInForm() {
    const {signIn,isLoaded,setActive}=useSignIn()
    const [isLoading,setIsLoading]=useState(false)
    const router=useRouter()

    const form = useForm<z.infer<typeof userSignInValidation>>({
        resolver: zodResolver(userSignInValidation),
        defaultValues: {
         email:"",
         password:""
        },
      });
console.log(form)


      const onSubmit = async (values: z.infer<typeof userSignInValidation>) => {
        setIsLoading(true);
        console.log(values)
        try {
        //   const user = {
        //     name: values.name,
        //     email: values.email,
        //     phone: values.phone,
        //   };
          //  await signUp?.create({
          //   emailAddressOrPhoneNumber
          //  })
        //   const newUser = await createUser(user);
    
        const signInAttempt = await signIn?.create({
            identifier: values.email,
            password:values.password,
          })
    
          if (signInAttempt?.status === 'complete') {
            await setActive({ session: signInAttempt?.createdSessionId })
            router.replace('/')
          } else {
            // See https://clerk.com/docs/custom-flows/error-handling
            // for more info on error handling
            console.error(JSON.stringify(signInAttempt, null, 2))
          }
        } catch (error) {
          console.log(error);
        }
    
        setIsLoading(false);
      
      };
    

  return (
    <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-6">
      <section className="mb-12 space-y-4">
        <h1 className="header ">Hi there 👋</h1>
        <p className="text-dark-700">Get started with appointments.</p>
      </section>

      <CustomFormField
        fieldType={FormFieldType.INPUT}
        control={form.control}
        name="email"
        label="Email or Phone number"
        placeholder="John Doe"
        iconSrc="/assets/icons/user.svg"
        iconAlt="user"
      />

      <CustomFormField
        fieldType={FormFieldType.INPUT}
        control={form.control}
        name="password"
        label="Password"
        placeholder="Password"
        iconAlt="password"
      />


<SubmitButton isLoading={isLoading}>Get Started</SubmitButton>
    </form>
  </Form>
  )
}

export default SignInForm