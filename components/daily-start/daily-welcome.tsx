import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { SunIcon, MoonIcon, CloudIcon } from "lucide-react";

interface DailyWelcomeProps {
  onStart: () => void;
}

export function DailyWelcome({ onStart }: DailyWelcomeProps) {
  const [quote, setQuote] = useState("");
  const [author, setAuthor] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState("");
  const [weatherIcon, setWeatherIcon] = useState<React.ReactNode>(null);

  useEffect(() => {
    // 获取每日名言
    fetchDailyQuote();
    
    // 更新时间
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    // 设置问候语和图标
    updateGreeting(new Date());
    
    return () => clearInterval(timer);
  }, []);

  // 重新计算问候语
  useEffect(() => {
    updateGreeting(currentTime);
  }, [currentTime]);

  // 获取每日名言
  async function fetchDailyQuote() {
    try {
      // 这里可以接入真实的API，现在使用静态数据演示
      const quotes = [
        { text: "种一棵树最好的时间是十年前，其次是现在。", author: "中国谚语" },
        { text: "不要等待机会，而要创造机会。", author: "林肯" },
        { text: "今天做的最好的自己，明天才能成为更好的自己。", author: "佚名" },
        { text: "每一个不曾起舞的日子，都是对生命的辜负。", author: "尼采" },
        { text: "善用时间的人，永远找得到充裕的时间。", author: "歌德" }
      ];
      
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      setQuote(randomQuote.text);
      setAuthor(randomQuote.author);
    } catch (error) {
      console.error('获取每日名言失败:', error);
      setQuote("新的一天，新的开始。");
      setAuthor("ME");
    }
  }

  // 根据时间更新问候语和图标
  function updateGreeting(date: Date) {
    const hour = date.getHours();
    
    if (hour >= 5 && hour < 12) {
      setGreeting("早上好");
      setWeatherIcon(<SunIcon className="h-8 w-8 text-yellow-500" />);
    } else if (hour >= 12 && hour < 18) {
      setGreeting("下午好");
      setWeatherIcon(<CloudIcon className="h-8 w-8 text-blue-500" />);
    } else {
      setGreeting("晚上好");
      setWeatherIcon(<MoonIcon className="h-8 w-8 text-indigo-500" />);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="bg-card border rounded-xl shadow-lg p-8 md:p-12 max-w-4xl w-full text-center"
      >
        <div className="flex justify-center mb-6">
          {weatherIcon}
        </div>
        
        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl md:text-5xl font-bold mb-4"
        >
          {greeting}
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xl text-muted-foreground mb-6"
        >
          今天是 {format(currentTime, "PPPP", { locale: zhCN })}
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mb-8 p-6 bg-secondary/30 rounded-lg"
        >
          <p className="text-lg italic mb-2">"{quote}"</p>
          <p className="text-sm text-muted-foreground">— {author}</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <Button 
            onClick={onStart} 
            size="lg"
            className="px-8 py-6 text-lg font-semibold"
          >
            开始今天的旅程
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
