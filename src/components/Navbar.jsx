import React from 'react'

const Navbar = () => {
  return (
    <nav className="fixed font-poppins w-full z-10 top-3 left-0 bg-transparent p-4">
      <div className="container mx-auto flex justify-between items-center">
        <a href="/" className="text-white text-2xl font-bold">
         <h1 className='font-poppins ml-8'>Crowdnest</h1>
        </a>
        <ul className="flex space-x-10 pr-150">
          <li>
            <a href="/events" className="text-white hover:text-gray-300 transition duration-300">
              Events
            </a>
          </li>
          <li>
            <a href="/clubs" className="text-white hover:text-gray-300 transition duration-300">
              Clubs
            </a>
          </li>
          <li>
            <a href="/login" className="text-white hover:text-gray-300 transition duration-300">
              Login
            </a>
          </li>
          <li>
            <a href="/host" className="text-white hover:text-gray-300 transition duration-300">
              Host
            </a>
          </li>
        </ul>
      </div>
    </nav>
  )
}

export default Navbar
