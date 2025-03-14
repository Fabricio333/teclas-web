import Image from "next/image"

export default function AboutPage() {
  return (
    <>
      {/* Page Header */}
      <section className="bg-beige py-16 md:py-24">
        <div className="container-custom">
          <h1 className="text-4xl md:text-5xl font-heading text-center">About Our Academy</h1>
          <div className="w-24 h-1 bg-gold mx-auto mt-6"></div>
        </div>
      </section>

      {/* Instructor Section */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="relative aspect-[3/4] w-full">
                <Image
                  src="/fotoDeFrente.jpg?height=800&width=600"
                  alt="Piano instructor at the piano"
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-heading mb-6">Meet Your Instructor</h2>
              <div className="w-16 h-1 bg-gold mb-6"></div>

              <div className="space-y-4 text-gray-700">
                <p>
                  With over 15 years of teaching experience and a Master's degree in Piano Performance from Juilliard
                  School of Music, our lead instructor brings both technical expertise and a passion for nurturing
                  musical talent.
                </p>
                <p>
                  Having performed in prestigious venues across Europe and North America, they combine practical
                  performance knowledge with effective teaching methodologies to help students of all levels achieve
                  their musical goals.
                </p>
                <p>
                  Their teaching philosophy centers on developing strong technical foundations while fostering
                  creativity and musical expression. Each student receives personalized attention and a customized
                  curriculum designed to address their specific needs and aspirations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Teaching Philosophy */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading mb-4">Our Teaching Philosophy</h2>
            <div className="w-24 h-1 bg-gold mx-auto"></div>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="space-y-6 text-gray-700">
              <p>
                At Piano Academy, we believe that learning to play the piano should be a joyful and rewarding
                experience. Our approach balances technical development with musical expression, ensuring students build
                the skills they need while maintaining their love for music.
              </p>
              <p>
                We recognize that each student is unique, with different learning styles, goals, and musical interests.
                That's why we create individualized learning plans that address specific needs while providing a
                comprehensive musical education.
              </p>
              <p>
                Beyond teaching notes and technique, we aim to instill a deep appreciation for music and develop
                well-rounded musicians. Our curriculum includes elements of music theory, history, and ear training to
                provide a holistic musical education.
              </p>
              <p>
                We believe in creating a supportive community where students can share their progress, inspire one
                another, and grow together as musicians. Regular performance opportunities help build confidence and
                celebrate achievements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Student Recitals Gallery */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading mb-4">Student Recitals</h2>
            <div className="w-24 h-1 bg-gold mx-auto"></div>
            <p className="text-gray-600 mt-4 max-w-2xl mx-auto">
              We regularly organize recitals to give our students the opportunity to showcase their progress and gain
              performance experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="relative aspect-video overflow-hidden">
                <Image
                  src={`/placeholder.svg?height=400&width=600&text=Recital+Image+${item}`}
                  alt={`Piano recital ${item}`}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

