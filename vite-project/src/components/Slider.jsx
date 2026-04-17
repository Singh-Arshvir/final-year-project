import { useEffect, useState } from 'react'

export default function Slider() {
  const images = [
    'https://source.unsplash.com/random/1200x600?architecture',
    'https://source.unsplash.com/random/1200x600?building',
    'https://source.unsplash.com/random/1200x600?interior',
    'https://source.unsplash.com/random/1200x600?modern-house',
  ]

  const [index, setIndex] = useState(0)

  // Auto slide
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const nextSlide = () => {
    setIndex((prev) => (prev + 1) % images.length)
  }

  const prevSlide = () => {
    setIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className="relative w-full h-[60vh] overflow-hidden">
      {/* Images */}
      {images.map((img, i) => (
        <img
          key={i}
          src={img}
          alt="slide"
          className={`absolute w-full h-full object-cover transition-opacity duration-700 ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
        <h1 className="text-white text-3xl md:text-5xl font-bold tracking-widest">
          SHAHI ARCHITECTS
        </h1>
      </div>

      {/* Buttons */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/70 px-3 py-2"
      >
        ◀
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/70 px-3 py-2"
      >
        ▶
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 w-full flex justify-center gap-2">
        {images.map((_, i) => (
          <div
            key={i}
            onClick={() => setIndex(i)}
            className={`w-3 h-3 rounded-full cursor-pointer ${
              i === index ? 'bg-white' : 'bg-gray-400'
            }`}
          ></div>
        ))}
      </div>
    </div>
  )
}
