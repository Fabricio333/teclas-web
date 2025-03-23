import type React from "react"
import type {Metadata} from "next"
import {Lora, Playfair_Display} from "next/font/google"
import "../styles/globals.scss"
import NavBar from "@/components/NavBar"
import Footer from "@/components/Footer"

const playfair = Playfair_Display({
    subsets: ["latin"],
    variable: "--font-playfair",
    display: "swap",
})

const lora = Lora({
    subsets: ["latin"],
    variable: "--font-lora",
    display: "swap",
})

export const metadata: Metadata = {
    title: "Teclas Ciudad Jardín",
    description: "Domina el arte del piano con clases presenciales personalizadas",
    generator: 'v0.dev'
}

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
        <body className={`${playfair.variable} ${lora.variable} font-serif bg-white text-gray-900`}>
        <NavBar/>
        <main>{children}</main>
        <Footer/>
        </body>
        </html>
    )
}


