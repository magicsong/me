import { auth } from '@/lib/auth';
import { getChatsByUserId } from '@/lib/db/queries';
import { myProvider } from '@/lib/ai/providers';
import { isProductionEnvironment } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 获取URL参数
    const { searchParams } = new URL(request.url);
    const count = searchParams.get('count') ? parseInt(searchParams.get('count')!) : 4;
    
    // 获取用户最近的聊天记录
    const recentChats = await getChatsByUserId({
      userId: session.user.id,
      limit: 5, // 获取最近的5个聊天
    });

    let suggestions = [];
    
    // 如果有聊天记录，生成基于历史的个性化问题
    let personalizedCount = Math.min(count, 2); // 最多生成2个个性化问题
    let funCount = count - personalizedCount; // 剩下的生成有趣问题
    
    if (recentChats && recentChats.length > 0) {
      // 提取聊天内容摘要
      const chatSummaries = recentChats.map(chat => chat.title).join(', ');
      
      // 使用AI生成个性化问题建议
      const model = myProvider.languageModel('chat-model');
      const response = await model.invoke(
        `基于用户最近讨论的这些主题: ${chatSummaries}，生成${personalizedCount}个相关的后续问题。以JSON数组格式返回，每个问题包含title(简短主题，3-4个字)和label(具体问题，简短)属性。`,
        {
          temperature: 0.7,
        }
      );
      
      try {
        const jsonStart = response.indexOf('[');
        const jsonEnd = response.lastIndexOf(']') + 1;
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const jsonStr = response.substring(jsonStart, jsonEnd);
          suggestions = JSON.parse(jsonStr);
        }
      } catch (error) {
        console.error('Failed to parse AI personalized suggestions', error);
        suggestions = [];
        // 如果个性化问题生成失败，增加有趣问题的数量
        funCount = count;
      }
    } else {
      // 如果没有历史记录，全部生成有趣问题
      funCount = count;
    }
    
    // 使用AI生成随机有趣的问题
    if (funCount > 0) {
      const funModel = myProvider.languageModel('chat-model');
      const funResponse = await funModel.invoke(
        `生成${funCount}个有趣、创新、启发思考的问题，可以涵盖科技、文化、艺术、历史等多个领域。以JSON数组格式返回，每个问题包含title(简短主题，3-4个字)和label(具体问题，简短)属性。确保问题既有趣又有启发性，能激发用户思考。`,
        {
          temperature: 0.9, // 提高随机性以获得更有创意的问题
        }
      );
      
      try {
        const jsonStart = funResponse.indexOf('[');
        const jsonEnd = funResponse.lastIndexOf(']') + 1;
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const jsonStr = funResponse.substring(jsonStart, jsonEnd);
          const funSuggestions = JSON.parse(jsonStr);
          suggestions = [...suggestions, ...funSuggestions];
        }
      } catch (error) {
        console.error('Failed to parse AI fun suggestions', error);
        // 如果生成失败，提供一些基本的后备问题
        if (suggestions.length === 0) {
          suggestions = [
            {
              title: "AI前沿",
              label: "最新的AI技术发展",
              action: "介绍一下人工智能领域最新的技术发展和突破"
            },
            {
              title: "编程挑战",
              label: "有趣的算法题",
              action: "给我出一道有趣的算法编程题，并提供解题思路"
            }
          ];
        }
      }
    }

    // 确保每个建议都有action属性
    const allSuggestions = suggestions.map(item => ({
      ...item,
      action: item.action || `${item.title} ${item.label}`
    }));

    // 保证不超过请求的数量
    const limitedSuggestions = allSuggestions.slice(0, count);

    return new Response(JSON.stringify(limitedSuggestions), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return new Response('Failed to generate suggestions', { status: 500 });
  }
}
