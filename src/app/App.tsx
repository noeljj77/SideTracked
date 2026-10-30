import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Explore } from '@/routes/Explore/Explore'
import { Landing } from '@/routes/Landing/Landing'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/explore/:topic" element={<Explore />} />
      </Routes>
    </BrowserRouter>
  )
}
