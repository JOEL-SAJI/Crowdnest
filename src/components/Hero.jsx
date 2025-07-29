import React from 'react'
import TextFader from './Textfader'
import SplitText from "./SplitText";
import Button1 from './button1';



const handleAnimationComplete = () => {
  console.log('All letters have animated!');
};



const Hero = () => {
  return (
    <div className='bg-black h-screen w-full'>
      <div className='flex flex-col items-center justify-center h-1/2 w-full pt-20'>
        <div className='text-white text-8xl  font-black mb-5 mt-10'>
                <SplitText
                  text="Event Management,"
                  className="text-7xl font-bold text-center pb-4"
                  delay={150}
                  duration={0.6}
                  ease="power3.out"
                  splitType="chars"
                  from={{ opacity: 0, y: 40 }}
                  to={{ opacity: 1, y: 0 }}
                  threshold={0.1}
                  rootMargin="-100px"
                  
                  textAlign="center"
                  onLetterAnimationComplete={handleAnimationComplete}
                />
          </div>
        <div className='text-white text-2xl'>
       <TextFader/>
              
        </div>
      </div>
      <div className='text-white text-2xl text-center'>
        <h3 className=' font-poppins pt-6 text-gray-400 text-base'>Crowdnest’s all-in-one event management software simplifies event planning </h3>
        <h3 className=' font-poppins text-gray-400 text-base'>and elevates the attendee experience.</h3>
      </div>
      <div className='flex justify-center items-center mt-20'>
        <Button1 />
      </div>
    </div>
  )
}

export default Hero
