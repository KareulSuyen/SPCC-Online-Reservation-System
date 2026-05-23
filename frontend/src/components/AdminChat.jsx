import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import styles from '../styles/adminchat.module.scss';

const AdminChat = () => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatSubject, setNewChatSubject] = useState('');
  const messagesEndRef = useRef(null);
  const pollingInterval = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const getAuthHeader = () => {
    const token = localStorage.getItem('access_token');
    return { Authorization: `Bearer ${token}` };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChats = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/core/support/my_chats/`,
        { headers: getAuthHeader() }
      );
      setChats(response.data);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/core/support/${chatId}/`,
        { headers: getAuthHeader() }
      );
      setMessages(response.data.messages || []);
      setSelectedChat(response.data);
      
      await axios.post(
        `${API_URL}/api/core/support/${chatId}/mark_as_read/`,
        {},
        { headers: getAuthHeader() }
      );
      
      fetchChats();
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedChat) return;

    try {
      setLoading(true);
      const response = await axios.post(
        `${API_URL}/api/core/support/${selectedChat.id}/send_message/`,
        { message: newMessage },
        { headers: getAuthHeader() }
      );
      
      setMessages([...messages, response.data]);
      setNewMessage('');
      fetchChats();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createNewChat = async (e) => {
    e.preventDefault();
    
    if (!newChatSubject.trim()) {
      alert('Please enter a subject for your support request');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        `${API_URL}/api/core/support/`,
        {
          subject: newChatSubject
        },
        { headers: getAuthHeader() }
      );
      
      setShowNewChatModal(false);
      setNewChatSubject('');
      fetchChats();
      fetchMessages(response.data.id);
    } catch (error) {
      console.error('Error creating chat:', error);
      if (error.response?.data?.error) {
        alert(error.response.data.error);
      } else {
        alert('Failed to create support request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
    
    pollingInterval.current = setInterval(() => {
      if (selectedChat) {
        fetchMessages(selectedChat.id);
      }
      fetchChats();
    }, 5000);

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [selectedChat]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }
    
    if (diff < 86400000) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      });
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      open: '#17a2b8',
      in_progress: '#ffc107',
      resolved: '#28a745',
      closed: '#6c757d'
    };
    return colors[status] || '#6c757d';
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatSidebar}>
        <div className={styles.sidebarHeader}>
          <h2>Support</h2>
          <button 
            className={styles.newChatBtn}
            onClick={() => setShowNewChatModal(true)}
          >
            + New Request
          </button>
        </div>
        
        <div className={styles.chatList}>
          {chats.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No support requests yet</p>
              <button onClick={() => setShowNewChatModal(true)}>
                Create your first request
              </button>
            </div>
          ) : (
            chats.map(chat => (
              <div
                key={chat.id}
                className={`${styles.chatItem} ${
                  selectedChat?.id === chat.id ? styles.active : ''
                }`}
                onClick={() => fetchMessages(chat.id)}
              >
                <div className={styles.chatItemHeader}>
                  <span className={styles.chatSubject}>{chat.subject}</span>
                  {chat.unread_count_for_user > 0 && (
                    <span className={styles.unreadBadge}>
                      {chat.unread_count_for_user}
                    </span>
                  )}
                </div>
                <div className={styles.chatItemMeta}>
                  <span 
                    className={styles.statusBadge}
                    style={{ backgroundColor: getStatusColor(chat.status) }}
                  >
                    {chat.status.replace('_', ' ')}
                  </span>
                  <span className={styles.timestamp}>
                    {formatTime(chat.last_message_at)}
                  </span>
                </div>
                {chat.last_message && (
                  <p className={styles.lastMessage}>
                    {chat.last_message.message}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.chatMain}>
        {selectedChat ? (
          <>
            <div className={styles.chatHeader}>
              <div>
                <h3>{selectedChat.subject}</h3>
                <p className={styles.chatInfo}>
                  <span 
                    className={styles.statusBadge}
                    style={{ backgroundColor: getStatusColor(selectedChat.status) }}
                  >
                    {selectedChat.status.replace('_', ' ')}
                  </span>
                  {selectedChat.assigned_admin_name && (
                    <span className={styles.assignedAdmin}>
                      Assigned to: {selectedChat.assigned_admin_name}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className={styles.messagesContainer}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`${styles.message} ${
                    message.is_admin ? styles.adminMessage : styles.userMessage
                  }`}
                >
                  <div className={styles.messageHeader}>
                    <span className={styles.senderName}>
                      {message.sender_name}
                    </span>
                    <span className={styles.messageTime}>
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                  <div className={styles.messageContent}>
                    {message.message}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form className={styles.messageForm} onSubmit={sendMessage}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={loading || selectedChat.status === 'closed'}
              />
              <button 
                type="submit" 
                disabled={loading || !newMessage.trim() || selectedChat.status === 'closed'}
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            </form>
          </>
        ) : (
          <div className={styles.noChat}>
            <h3>Welcome to Support</h3>
            <p>Select a chat or create a new support request</p>
          </div>
        )}
      </div>

      {showNewChatModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>New Support Request</h3>
            <form onSubmit={createNewChat}>
              <div className={styles.formGroup}>
                <label>Subject *</label>
                <input
                  type="text"
                  value={newChatSubject}
                  onChange={(e) => setNewChatSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  required
                />
              </div>
              
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => setShowNewChatModal(false)}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className={styles.submitBtn}
                >
                  {loading ? 'Creating...' : 'Create Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChat;

