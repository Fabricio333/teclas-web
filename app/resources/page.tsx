import Image from "next/image"
import Link from "next/link"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faFileLines,
  faVideo,
  faMusic,
  faBookOpen,
} from "@fortawesome/free-solid-svg-icons"

import { resourcesMetadata } from "@/lib/metadata";

export { resourcesMetadata as metadata };

export default function ResourcesPage() {
  return (
    <>
      {/* Page Header */}
      <section className="bg-beige py-16 md:py-24">
        <div className="container-custom">
          <h1 className="text-4xl md:text-5xl font-heading text-center">Learning Resources</h1>
          <div className="w-24 h-1 bg-gold mx-auto mt-6"></div>
          <p className="text-center text-gray-700 mt-6 max-w-2xl mx-auto">
            Access our collection of learning materials to enhance your piano practice and musical knowledge.
          </p>
        </div>
      </section>

      {/* Resources Navigation */}
      <section className="py-8 border-b">
        <div className="container-custom">
          <div className="flex flex-wrap justify-center gap-4">
            <a href="#sheet-music" className="px-4 py-2 bg-beige hover:bg-gold hover:text-white transition-colors">
              Sheet Music
            </a>
            <a
              href="#practice-exercises"
              className="px-4 py-2 bg-beige hover:bg-gold hover:text-white transition-colors"
            >
              Practice Exercises
            </a>
            <a
              href="#video-demonstrations"
              className="px-4 py-2 bg-beige hover:bg-gold hover:text-white transition-colors"
            >
              Video Demonstrations
            </a>
            <a href="#music-theory" className="px-4 py-2 bg-beige hover:bg-gold hover:text-white transition-colors">
              Music Theory
            </a>
          </div>
        </div>
      </section>

      {/* Sheet Music Section */}
      <section id="sheet-music" className="section-padding">
        <div className="container-custom">
          <div className="flex items-center mb-8">
            <FontAwesomeIcon icon={faFileLines} className="text-gold mr-3" size="lg" />
            <h2 className="text-3xl font-heading">Sheet Music</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {["Beginner", "Intermediate", "Advanced"].map((level) => (
              <div key={level} className="border p-6">
                <h3 className="text-xl font-heading mb-4">{level} Level</h3>
                <div className="relative h-40 mb-4">
                  <Image
                    src="/placeholder.svg?height=300&width=400&text=Sheet+Music"
                    alt="Sheet music preview"
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="text-gray-600 mb-4">
                  A collection of {level.toLowerCase()} level pieces carefully selected to develop your skills.
                </p>
                <Link href="#" className="text-gold hover:underline flex items-center">
                  Download PDF <FontAwesomeIcon icon={faFileLines} className="ml-2" size="sm" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Practice Exercises */}
      <section id="practice-exercises" className="section-padding bg-gray-50">
        <div className="container-custom">
          <div className="flex items-center mb-8">
            <FontAwesomeIcon icon={faMusic} className="text-gold mr-3" size="lg" />
            <h2 className="text-3xl font-heading">Practice Exercises</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 shadow-sm">
              <h3 className="text-xl font-heading mb-4">Scales & Arpeggios</h3>
              <p className="text-gray-600 mb-4">Essential scales and arpeggios in all keys with fingering guides.</p>
              <Link href="#" className="text-gold hover:underline">
                Download Exercises
              </Link>
            </div>

            <div className="bg-white p-6 shadow-sm">
              <h3 className="text-xl font-heading mb-4">Finger Exercises</h3>
              <p className="text-gray-600 mb-4">
                Exercises designed to improve finger strength, independence, and dexterity.
              </p>
              <Link href="#" className="text-gold hover:underline">
                Download Exercises
              </Link>
            </div>

            <div className="bg-white p-6 shadow-sm">
              <h3 className="text-xl font-heading mb-4">Rhythm Exercises</h3>
              <p className="text-gray-600 mb-4">Practice materials to develop your sense of rhythm and timing.</p>
              <Link href="#" className="text-gold hover:underline">
                Download Exercises
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Video Demonstrations */}
      <section id="video-demonstrations" className="section-padding">
        <div className="container-custom">
          <div className="flex items-center mb-8">
            <FontAwesomeIcon icon={faVideo} className="text-gold mr-3" size="lg" />
            <h2 className="text-3xl font-heading">Video Demonstrations</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="border">
                <div className="relative aspect-video">
                  <Image
                    src={`/placeholder.svg?height=400&width=600&text=Video+${item}`}
                    alt={`Video demonstration ${item}`}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/80 flex items-center justify-center">
                      <div className="w-0 h-0 border-y-8 border-y-transparent border-l-12 border-l-gold ml-1"></div>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-heading mb-2">Technique Demonstration {item}</h3>
                  <p className="text-gray-600 text-sm">
                    Learn proper hand positioning and technique for optimal playing.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Music Theory */}
      <section id="music-theory" className="section-padding bg-gray-50">
        <div className="container-custom">
          <div className="flex items-center mb-8">
            <FontAwesomeIcon icon={faBookOpen} className="text-gold mr-3" size="lg" />
            <h2 className="text-3xl font-heading">Music Theory Essentials</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Note Reading", desc: "Master the basics of reading sheet music" },
              { title: "Rhythm & Time", desc: "Understanding time signatures and note values" },
              { title: "Scales & Keys", desc: "Learn about major and minor scales and key signatures" },
              { title: "Chords & Harmony", desc: "Explore chord construction and progressions" },
            ].map((item, index) => (
              <div key={index} className="bg-white p-6 shadow-sm">
                <h3 className="text-xl font-heading mb-4">{item.title}</h3>
                <p className="text-gray-600 mb-4">{item.desc}</p>
                <Link href="#" className="text-gold hover:underline">
                  View Resource
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

