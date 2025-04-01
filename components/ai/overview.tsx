import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { MessageIcon, VercelIcon } from './icons';

export const Overview = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [bounce, setBounce] = useState(false);
  
  useEffect(() => {
    // 创建周期性的弹跳效果
    const interval = setInterval(() => {
      setBounce(true);
      setTimeout(() => setBounce(false), 500);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const welcomeVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const letterVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4
      }
    }
  };

  const welcomeText = "欢迎来到我的智能助手！";

  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <motion.div 
        className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center max-w-xl mx-auto"
        style={{ 
          backgroundImage: 'linear-gradient(to right, #f6d365 0%, #fda085 100%)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
        }}
        whileHover={{ 
          boxShadow: '0 15px 35px rgba(0,0,0,0.15)',
          scale: 1.02 
        }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <motion.div 
          className="flex flex-row justify-center gap-4 items-center"
          animate={bounce ? { y: [0, -10, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}>
            <VercelIcon size={40} />
          </motion.div>
          <motion.span 
            animate={{ scale: [1, 1.2, 1] }} 
            transition={{ repeat: Infinity, repeatDelay: 1, duration: 0.5 }}
          >
            ✨
          </motion.span>
          <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.6 }}>
            <MessageIcon size={40} />
          </motion.div>
        </motion.div>
        
        <motion.h1 
          className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500"
          variants={welcomeVariants}
          initial="hidden"
          animate="visible"
        >
          {welcomeText.split('').map((char, index) => (
            <motion.span key={index} variants={letterVariants}>
              {char}
            </motion.span>
          ))}
        </motion.h1>
        
        <motion.p
          className="text-lg text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          有什么我能帮助您的吗？请随时开始我们的对话！
        </motion.p>
        
        <motion.button
          className="bg-white text-pink-500 font-medium py-2 px-6 rounded-full mx-auto"
          whileHover={{ scale: 1.05, backgroundColor: "#f9f9f9" }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          开始聊天
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
