"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="py-4 border-b border-gray-100">
      <div className="container-custom flex justify-between items-center">
        <Link href="/" className="text-2xl font-heading tracking-wider">
          Piano Academy
        </Link>

        {/* Mobile menu button */}
        <button
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Desktop navigation */}
        <nav className="hidden md:flex space-x-8">
          <NavLinks />
        </nav>

        {/* Mobile navigation */}
        {isMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-white z-50 border-b border-gray-100 md:hidden">
            <nav className="container-custom py-4 flex flex-col space-y-4">
              <NavLinks />
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

function NavLinks() {
  return (
    <>
      <Link href="/" className="hover:text-gold transition-colors">
        Home
      </Link>
      <Link href="/about" className="hover:text-gold transition-colors">
        About
      </Link>
      <Link href="/inscription" className="hover:text-gold transition-colors">
        Inscription
      </Link>
      <Link href="/resources" className="hover:text-gold transition-colors">
        Resources
      </Link>
    </>
  )
}

