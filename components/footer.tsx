import Link from "next/link"
import { Phone, Mail, MapPin, Facebook, Instagram, Youtube } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100">
      <div className="container-custom py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-heading mb-4">Piano Academy</h3>
            <p className="text-gray-600 mb-6">
              Personalized in-person piano lessons designed to bring out the pianist in you.
            </p>
            <div className="flex space-x-4">
              <Link href="#" className="text-gray-500 hover:text-gold transition-colors">
                <Facebook size={20} />
                <span className="sr-only">Facebook</span>
              </Link>
              <Link href="https://www.instagram.com/teclas.ciudadjardin/" className="text-gray-500 hover:text-gold transition-colors">
                <Instagram size={20} />
                <span className="sr-only">Instagram</span>
              </Link>
              <Link href="#" className="text-gray-500 hover:text-gold transition-colors">
                <Youtube size={20} />
                <span className="sr-only">YouTube</span>
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-heading mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Phone size={18} className="mr-2 mt-1 text-gold" />
                <span>(123) 456-7890</span>
              </li>
              <li className="flex items-start">
                <Mail size={18} className="mr-2 mt-1 text-gold" />
                <span>contact@pianoacademy.com</span>
              </li>
              <li className="flex items-start">
                <MapPin size={18} className="mr-2 mt-1 text-gold" />
                <span>123 Music Avenue, New York, NY 10001</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-heading mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-600 hover:text-gold transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-600 hover:text-gold transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/inscription" className="text-gray-600 hover:text-gold transition-colors">
                  Inscription
                </Link>
              </li>
              <li>
                <Link href="/resources" className="text-gray-600 hover:text-gold transition-colors">
                  Learning Resources
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-12 pt-6 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Piano Academy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

