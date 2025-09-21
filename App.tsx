
import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { type Message } from './types';
import { SYSTEM_INSTRUCTION } from './constants';
import Header from './components/Header';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setChat(null);
    setError(null);
  }, []);

  const sendMessage = useCallback(async (input: string) => {
    if (!input.trim()) return;

    const newUserMessage: Message = { role: 'user', content: input };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API_KEY environment variable not set.");
      }
      const ai = new GoogleGenAI({ apiKey });

      let currentChat = chat;
      if (!currentChat) {
        const newChat = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          },
        });
        setChat(newChat);
        currentChat = newChat;
      }

      const stream = await currentChat.sendMessageStream({ message: input });
      
      let modelResponse = '';
      setMessages((prev) => [...prev, { role: 'model', content: '' }]);

      for await (const chunk of stream) {
        const chunkText = chunk.text;
        modelResponse += chunkText;
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = modelResponse;
          return newMessages;
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      console.error("Error sending message:", errorMessage);
      setError(`Sorry, something went wrong. Please check your setup and try again. Error: ${errorMessage}`);
      setMessages(prev => [...prev, { role: 'model', content: `Sorry, an error occurred: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [chat]);

  return (
    <div className="flex flex-col h-screen bg-gray-800 text-white">
      <Header onNewChat={handleNewChat} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatWindow messages={messages} isLoading={isLoading} onPromptClick={sendMessage} />
        <div className="p-4 bg-gray-900 border-t border-gray-700">
          {error && <p className="text-red-400 text-center text-sm mb-2">{error}</p>}
          <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
};

export default App;
