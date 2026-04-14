import { useTheme } from '../context/ThemeContext'
import Navbar from '../components/Navbar'
import Hero from '../sections/Hero'
import Features from '../sections/Features'
import Difficulty from '../sections/Difficulty'
import AlgoVisualizer from '../sections/AlgoVisualizer'
import CTA from '../sections/CTA'
import Footer from '../sections/Footer'

export default function Landing() {
  const { t } = useTheme()
  return (
    <main style={{ background: t.bg, minHeight: '100vh', overflowX: 'hidden', transition: 'background 0.3s ease' }}>
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