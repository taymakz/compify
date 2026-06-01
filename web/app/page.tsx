import { Header } from "@/components/landing/header"
import { Hero } from "@/components/landing/hero"
import { Bento } from "@/components/landing/bento"
import { Footer } from "@/components/landing/footer"

export default function Page() {
  return (
    <div className="min-h-screen bg-[#080808]">
      <Header />
      <main>
        <Hero />
        <Bento />
      </main>
      <Footer />
    </div>
  )
}
