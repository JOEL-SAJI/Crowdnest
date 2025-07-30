import React from 'react'
import CircularGallery from './Gallery'

const Hero2 = () => {
  return (
       <div className='bg-black h-screen w-full'>
        <div style={{ height: '600px', position: 'relative' }}>
        <CircularGallery bend={3} textColor="#ffffff" borderRadius={0.05} scrollEase={0.02}/>
      </div>
       </div>
  )
}

export default Hero2