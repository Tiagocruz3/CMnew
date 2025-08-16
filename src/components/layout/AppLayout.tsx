import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import RTWChatbot from '../ai/RTWChatbot';
import { useAuthStore } from '../../store/authStore';

const AppLayout = () => {
  const { isAuthenticated } = useAuthStore();
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50/50 backdrop-blur-xl">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0 h-full">
        <Header />
        <main className="flex-1 min-h-0 h-full overflow-y-auto p-6 flex flex-col">
          <div className="container mx-auto max-w-7xl min-h-0 h-full flex flex-col">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* RTW AI Chatbot */}
      <RTWChatbot 
        isOpen={isChatbotOpen} 
        onToggle={() => setIsChatbotOpen(!isChatbotOpen)} 
      />
    </div>
  );
};

export default AppLayout;