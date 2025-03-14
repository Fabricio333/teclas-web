"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { CheckCircle2 } from "lucide-react"

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().min(10, { message: "Please enter a valid phone number" }),
  age: z.string(),
  experience: z.string(),
  schedule: z.string(),
  goals: z.string().max(500, { message: "Goals must be less than 500 characters" }),
})

type FormValues = z.infer<typeof formSchema>

export default function InscriptionPage() {
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      age: "",
      experience: "",
      schedule: "",
      goals: "",
    },
  })

  const onSubmit = async (data: FormValues) => {
    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500))
    console.log(data)
    setIsSubmitted(true)
  }

  return (
    <>
      {/* Page Header */}
      <section className="bg-beige py-16 md:py-24">
        <div className="container-custom">
          <h1 className="text-4xl md:text-5xl font-heading text-center">Inscription Form</h1>
          <div className="w-24 h-1 bg-gold mx-auto mt-6"></div>
          <p className="text-center text-gray-700 mt-6 max-w-2xl mx-auto">
            Fill out the form below to enroll in our piano lessons. We'll contact you within 48 hours to confirm your
            registration.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="section-padding">
        <div className="container-custom max-w-3xl">
          {isSubmitted ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
                <CheckCircle2 className="text-green-600" size={32} />
              </div>
              <h2 className="text-2xl md:text-3xl font-heading mb-4">Thank You for Your Submission!</h2>
              <p className="text-gray-600 mb-8">
                We've received your enrollment request and will contact you shortly to confirm your registration and
                discuss the next steps.
              </p>
              <button onClick={() => setIsSubmitted(false)} className="text-gold hover:underline">
                Submit another form
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    id="name"
                    type="text"
                    {...register("name")}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    id="email"
                    type="email"
                    {...register("email")}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    {...register("phone")}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gold"
                  />
                  {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
                </div>

                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
                    Age Group
                  </label>
                  <select
                    id="age"
                    {...register("age")}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gold"
                  >
                    <option value="">Select age group</option>
                    <option value="child">Child (5-12)</option>
                    <option value="teen">Teen (13-17)</option>
                    <option value="adult">Adult (18+)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">
                  Previous Experience
                </label>
                <select
                  id="experience"
                  {...register("experience")}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gold"
                >
                  <option value="">Select experience level</option>
                  <option value="none">None (Beginner)</option>
                  <option value="basic">Basic (Some knowledge)</option>
                  <option value="intermediate">Intermediate (1-3 years)</option>
                  <option value="advanced">Advanced (4+ years)</option>
                </select>
              </div>

              <div>
                <label htmlFor="schedule" className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Lesson Schedule
                </label>
                <select
                  id="schedule"
                  {...register("schedule")}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gold"
                >
                  <option value="">Select preferred schedule</option>
                  <option value="weekday-morning">Weekday Mornings</option>
                  <option value="weekday-afternoon">Weekday Afternoons</option>
                  <option value="weekday-evening">Weekday Evenings</option>
                  <option value="weekend-morning">Weekend Mornings</option>
                  <option value="weekend-afternoon">Weekend Afternoons</option>
                </select>
              </div>

              <div>
                <label htmlFor="goals" className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Goals (What do you hope to achieve?)
                </label>
                <textarea
                  id="goals"
                  rows={4}
                  {...register("goals")}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gold"
                ></textarea>
                {errors.goals && <p className="mt-1 text-sm text-red-600">{errors.goals.message}</p>}
              </div>

              <div className="pt-4">
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full md:w-auto">
                  {isSubmitting ? "Submitting..." : "Submit Enrollment Request"}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  )
}

