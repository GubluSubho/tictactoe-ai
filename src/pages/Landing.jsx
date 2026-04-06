import Navbar from '../components/Navbar'
import Hero from '../sections/Hero'
import Features from '../sections/Features'
import Difficulty from '../sections/Difficulty'
import AlgoVisualizer from '../sections/AlgoVisualizer'
import CTA from '../sections/CTA'
import Footer from '../sections/Footer'

export default function Landing() {
  return (
    <main style={{ background: '#060912', minHeight: '100vh', overflowX: 'hidden' }}>
      <Navbar />
      <Hero />
      <Features />
      <Difficulty />
      <AlgoVisualizer />
      <CTA />
      <Footer />
    </main>
  )
}