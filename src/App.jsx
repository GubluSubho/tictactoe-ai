import Navbar from './components/Navbar'
import Hero from './sections/Hero'
import Features from './sections/Features'
import Difficulty from './sections/Difficulty'
import CTA from './sections/CTA'
import Footer from './sections/Footer'

function App() {
  return (
    <main className="bg-[#060912] min-h-screen overflow-x-hidden">
      <Navbar />
      <Hero />
      <Features />
      <Difficulty />
      <CTA />
      <Footer />
    </main>
  )
}

export default App