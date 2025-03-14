import Image from "next/image"
import Link from "next/link"
import { Music, Award, Users } from "lucide-react"

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[80vh] min-h-[600px] flex items-center">
        <div className="absolute inset-0 z-0">
          <Image
            src="/teclas.jpg?height=1080&width=1920"
            alt="Grand piano in a concert hall"
            fill
            priority
            className="object-cover brightness-50"
          />
        </div>
        <div className="container-custom relative z-10 text-white">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading leading-tight mb-6">
              Master the Art of Piano with a Passionate Instructor
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-100">
              Personalized in-person lessons designed to bring out the pianist in you.
            </p>
            <Link href="/inscription" className="btn-primary">
              Start Learning Today
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding bg-beige">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading mb-4">Why Choose Our Academy</h2>
            <div className="w-24 h-1 bg-gold mx-auto"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 text-center shadow-sm">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-beige mb-6">
                <Music className="text-gold" size={28} />
              </div>
              <h3 className="text-xl font-heading mb-4">Personalized Approach</h3>
              <p className="text-gray-600">
                Lessons tailored to your skill level, goals, and learning style for optimal progress.
              </p>
            </div>

            <div className="bg-white p-8 text-center shadow-sm">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-beige mb-6">
                <Award className="text-gold" size={28} />
              </div>
              <h3 className="text-xl font-heading mb-4">Expert Instruction</h3>
              <p className="text-gray-600">
                Learn from experienced instructors with formal education and performance backgrounds.
              </p>
            </div>

            <div className="bg-white p-8 text-center shadow-sm">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-beige mb-6">
                <Users className="text-gold" size={28} />
              </div>
              <h3 className="text-xl font-heading mb-4">Supportive Community</h3>
              <p className="text-gray-600">
                Join a community of fellow pianists with regular recitals and performance opportunities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading mb-4">What Our Students Say</h2>
            <div className="w-24 h-1 bg-gold mx-auto"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-50 p-8 border-l-4 border-gold">
              <p className="italic text-gray-600 mb-6">
                "The personalized approach has helped me progress faster than I ever thought possible. My instructor
                truly understands my goals and adapts each lesson to help me achieve them."
              </p>
              <p className="font-heading">— Sarah M., Student for 2 years</p>
            </div>

            <div className="bg-gray-50 p-8 border-l-4 border-gold">
              <p className="italic text-gray-600 mb-6">
                "As an adult beginner, I was nervous about starting piano lessons. The supportive environment and
                patient instruction have made learning enjoyable and rewarding."
              </p>
              <p className="font-heading">— Michael T., Student for 1 year</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-heading mb-6">Ready to Begin Your Piano Journey?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join our academy today and discover the joy of playing piano with expert guidance.
          </p>
          <Link href="/inscription" className="btn-primary bg-gold hover:bg-gold/90">
            Enroll Now
          </Link>
        </div>
      </section>
    </>
  )
}

