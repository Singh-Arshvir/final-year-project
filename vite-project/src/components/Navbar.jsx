import { useState } from 'react'

export default function Navbar() {
  const [open, setOpen] = useState(false)

  const links = ['Home', 'Projects', 'Services', 'About', 'Contact']

  return (
    <nav className="fixed w-full top-0 left-0 z-50 bg-white/80 backdrop-blur-md border-b">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-widest">SHAHI ARCH</h1>
        </div>

        {/* Desktop Menu */}
        <ul className="hidden md:flex gap-10 text-sm uppercase tracking-wide">
          {links.map((link, i) => (
            <li key={i} className="relative cursor-pointer group">
              {link}
              <span className="absolute left-0 -bottom-1 w-0 h-[2px] bg-black transition-all duration-300 group-hover:w-full"></span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="hidden md:block">
          <button className="border border-black px-4 py-2 text-sm hover:bg-black hover:text-white transition">
            Get Quote
          </button>
        </div>

        {/* Mobile Icon */}
        <div className="md:hidden">
          <button onClick={() => setOpen(!open)}>
            {open ? (
              <span className="text-2xl">✕</span>
            ) : (
              <span className="text-2xl">☰</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${
          open ? 'max-h-96' : 'max-h-0'
        } bg-white border-t`}
      >
        <div className="px-6 py-4 space-y-4">
          {links.map((link, i) => (
            <p
              key={i}
              className="text-sm uppercase tracking-wide border-b pb-2 cursor-pointer hover:text-gray-500"
            >
              {link}
            </p>
          ))}

          <button className="w-full border border-black py-2 mt-2 hover:bg-black hover:text-white transition">
            Get Quote
          </button>
        </div>
      </div>
    </nav>
  )
}
