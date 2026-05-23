import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { sendPrompt } from '../api/aiApi';
import { useAuth } from '../context/AuthContext';
import { IoIosSend } from "react-icons/io";
import { FaComments } from "react-icons/fa";
import aiStyles from '../styles/ai.module.scss';
import { LuBotMessageSquare } from "react-icons/lu";
import { MdOutlineQuestionAnswer } from "react-icons/md";
import { IoIosChatbubbles } from "react-icons/io";
import { BsMicFill, BsMicMuteFill, BsVolumeMuteFill, BsVolumeUpFill } from "react-icons/bs";
import { CiMicrophoneOn } from "react-icons/ci";
import { GoBlocked } from "react-icons/go";

const VITE_API_URL = import.meta.env.VITE_API_URL;

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;
const synth = window.speechSynthesis || null;

const MIC_PERMISSION = {
  UNKNOWN: 'unknown',
  GRANTED: 'granted',
  DENIED:  'denied',
  ASKING:  'asking',
};

const PRIORITY_VOICES = [
  'Google US English',
  'Google UK English Female',
  'Google UK English Male',
  'Microsoft Aria Online (Natural) - English (United States)',
  'Microsoft Jenny Online (Natural) - English (United States)',
  'Microsoft Guy Online (Natural) - English (United States)',
  'Microsoft Sonia Online (Natural) - English (United Kingdom)',
  'Microsoft Libby Online (Natural) - English (United Kingdom)',
  'Microsoft Ryan Online (Natural) - English (United Kingdom)',
  'Microsoft Neerja Online (Natural) - English (India)',
  'Microsoft Aria - English (United States)',
  'Microsoft Jenny - English (United States)',
  'Microsoft Guy - English (United States)',
  'Samantha',
  'Karen',
  'Moira',
  'Tessa',
  'Veena',
  'Chrome OS US English',
];

const PRIORITY_KEYWORDS = [
  'Google US English', 'Google UK English',
  'Aria Online', 'Jenny Online', 'Guy Online',
  'Sonia Online', 'Libby Online', 'Ryan Online',
  'Aria', 'Jenny', 'Microsoft Guy',
  'Samantha', 'Karen', 'Moira', 'Tessa',
];

const pickBestVoice = () => {
  if (!synth) return null;
  const available = synth.getVoices();
  if (!available.length) return null;

  for (const name of PRIORITY_VOICES) {
    const match = available.find(v => v.name === name);
    if (match) return match;
  }

  for (const kw of PRIORITY_KEYWORDS) {
    const match = available.find(v => v.name.includes(kw) && v.lang.startsWith('en'));
    if (match) return match;
  }

  return (
    available.find(v => v.lang.startsWith('en') && v.localService) ||
    available.find(v => v.lang.startsWith('en')) ||
    available[0] ||
    null
  );
};

const Ai = () => {
  const { user } = useAuth();
  const [open, setOpen]               = useState(false);
  const [prompt, setPrompt]           = useState('');
  const [history, setHistory]         = useState([]);
  const [isLoading, setIsLoading]     = useState(false);
  const [showQuickQuestions, setShowQuickQuestions] = useState(false);
  const [products, setProducts]       = useState([]);
  const [categories, setCategories]   = useState([]);

  const [isListening, setIsListening]             = useState(false);
  const [voiceSupported]                          = useState(!!SpeechRecognition && !!navigator.mediaDevices);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [micPermission, setMicPermission]         = useState(MIC_PERMISSION.UNKNOWN);
  const recognitionRef = useRef(null);
  const micStreamRef   = useRef(null);

  const [ttsSupported]                            = useState(!!synth);
  const [isSpeaking, setIsSpeaking]               = useState(false);
  const [speakingMsgIndex, setSpeakingMsgIndex]   = useState(null);

  const historyRef    = useRef(history);
  const handleChatRef = useRef(null);
  useEffect(() => { historyRef.current = history; }, [history]);

  const chatEndRef = useRef(null);
  const inputRef   = useRef(null);

  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: 'microphone' }).then((result) => {
      if (result.state === 'granted') setMicPermission(MIC_PERMISSION.GRANTED);
      if (result.state === 'denied')  setMicPermission(MIC_PERMISSION.DENIED);
      result.onchange = () => {
        if (result.state === 'granted') setMicPermission(MIC_PERMISSION.GRANTED);
        if (result.state === 'denied')  setMicPermission(MIC_PERMISSION.DENIED);
        if (result.state === 'prompt')  setMicPermission(MIC_PERMISSION.UNKNOWN);
      };
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [p, c] = await Promise.all([
          axios.get(`${VITE_API_URL}/api/core/items/`),
          axios.get(`${VITE_API_URL}/api/core/categories/`),
        ]);
        setProducts(p.data);
        setCategories(c.data);
      } catch (e) { console.error('Failed to fetch product data:', e); }
    };
    fetch();
  }, []);

  const speakText = useCallback((text, msgIndex = null) => {
    if (!synth) return;
    synth.cancel();

    const clean = text
      .replace(/#{1,6}\s/g, '')
      .replace(/[*_~`]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/₱/g, 'PHP ')
      .replace(/(\d+)x/g, '$1 times ')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ', ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (!clean) return;

    const utt = new SpeechSynthesisUtterance(clean);
    utt.rate   = 0.95;
    utt.pitch  = 1.0;
    utt.volume = 1.0;

    utt.onstart = () => {
      setIsSpeaking(true);
      if (msgIndex !== null) setSpeakingMsgIndex(msgIndex);
    };
    utt.onend = () => {
      setIsSpeaking(false);
      setSpeakingMsgIndex(null);
    };
    utt.onerror = (e) => {
      if (e.error !== 'interrupted') {
        setIsSpeaking(false);
        setSpeakingMsgIndex(null);
      }
    };

    const applyAndSpeak = () => {
      const voice = pickBestVoice();
      if (voice) utt.voice = voice;
      synth.speak(utt);
    };

    if (synth.getVoices().length > 0) {
      applyAndSpeak();
    } else {
      synth.onvoiceschanged = () => {
        synth.onvoiceschanged = null;
        applyAndSpeak();
      };
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (synth) synth.cancel();
    setIsSpeaking(false);
    setSpeakingMsgIndex(null);
  }, []);

  const releaseMicStream = useCallback(() => {
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    releaseMicStream();
    setIsListening(false);
    setInterimTranscript('');
  }, [releaseMicStream]);

  const getProductContext = useCallback(() => {
    if (!products.length) return '';
    const pl = products.map(p => {
      const cat = categories.find(c => c.id === p.category)?.name || 'Uncategorized';
      let info = `- ${p.name} (Category: ${cat})`;
      if (p.has_sizes && p.sizes?.length > 0) {
        info += ` - Available sizes: ${p.sizes.filter(s => s.is_available).map(s => `${s.size}: ₱${parseFloat(s.price).toFixed(2)} (Stock: ${s.stock_quantity})`).join(', ')}`;
      } else if (!p.has_sizes) {
        info += ` - Price: ₱${parseFloat(p.price).toFixed(2)}, Stock: ${p.stock_quantity}`;
      }
      return info;
    }).join('\n');
    const cl = categories.map(c => `- ${c.name}: ${products.filter(p => p.category === c.id).length} item(s)`).join('\n');
    return `\n\nAVAILABLE PRODUCTS:\n${pl}\n\nCATEGORIES:\n${cl}`;
  }, [products, categories]);

  const handleChat = useCallback(async (messageToSend, wasVoice = false) => {
    if (!messageToSend?.trim()) return;

    const instructions   = import.meta.env.INSTRUCTIONS;
    const rules          = import.meta.env.RULES;
    const currentHistory = historyRef.current;
    const userName       = user?.first_name || 'User';

    setIsLoading(true);
    setShowQuickQuestions(false);
    setPrompt('');

    const systemContext = currentHistory.length === 0
      ? `${instructions} ${userName}, ${rules}${getProductContext()}\n\nYou have access to our complete product catalog above. When users ask about products, prices, availability, or categories, provide specific information from this list. Always mention prices in Philippine Pesos (₱) and be helpful in guiding users to make reservations.`
      : '';

    const fullPrompt = systemContext
      + currentHistory.map(m => m.sender === 'user' ? `${userName}: ${m.text}` : `AI: ${m.text}`).join('\n')
      + `\n${userName}: ${messageToSend}\nAI:`;

    try {
      const res      = await sendPrompt(fullPrompt);
      const botReply = res.response || "I couldn't generate a response. Please try again.";
      const newHistory = [
        ...currentHistory,
        { sender: 'user', text: messageToSend, wasVoice },
        { sender: 'ai',   text: botReply },
      ];
      setHistory(newHistory);
      if (wasVoice && ttsSupported) {
        setTimeout(() => speakText(botReply, newHistory.length - 1), 350);
      }
    } catch (err) {
      let msg = 'Error talking to AI.';
      if (err.response)     msg = err.response.data?.error || `HTTP ${err.response.status}`;
      else if (err.request) msg = 'No response from server.';
      else                  msg = err.message;
      setHistory(prev => [
        ...prev,
        { sender: 'user', text: messageToSend, wasVoice },
        { sender: 'ai',   text: msg },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [user, getProductContext, ttsSupported, speakText]);

  useEffect(() => { handleChatRef.current = handleChat; }, [handleChat]);

  const startListening = useCallback(async () => {
    if (!SpeechRecognition) return;
    stopSpeaking();

    if (micPermission !== MIC_PERMISSION.GRANTED) {
      setMicPermission(MIC_PERMISSION.ASKING);
      try {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicPermission(MIC_PERMISSION.GRANTED);
      } catch {
        setMicPermission(MIC_PERMISSION.DENIED);
        return;
      }
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current      = recognition;
    recognition.continuous      = false;
    recognition.interimResults  = true;
    recognition.lang            = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => { setIsListening(true); setInterimTranscript(''); };

    recognition.onresult = (event) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        event.results[i].isFinal ? (final += t) : (interim += t);
      }
      if (interim) setInterimTranscript(interim);
      if (final.trim()) {
        setInterimTranscript('');
        setIsListening(false);
        releaseMicStream();
        recognitionRef.current?.stop();
        handleChatRef.current(final.trim(), true);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setInterimTranscript('');
      releaseMicStream();
      if (event.error === 'not-allowed') setMicPermission(MIC_PERMISSION.DENIED);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      releaseMicStream();
    };

    try {
      recognition.start();
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setIsListening(false);
      releaseMicStream();
    }
  }, [micPermission, stopSpeaking, releaseMicStream]);

  const toggleVoice = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    if (!open) {
      stopSpeaking();
      recognitionRef.current?.stop();
      releaseMicStream();
      setIsListening(false);
      setInterimTranscript('');
    }
  }, [open, stopSpeaking, releaseMicStream]);

  const quickQuestions = [
    "What products are available?",
    "How do I make a reservation?",
    "What are the different categories?",
    "Can I pay online?",
    "How do I contact support?",
  ];

  const handleTypedSend = useCallback(() => {
    if (!prompt.trim() || isLoading) return;
    const msg = prompt.trim();
    setPrompt('');
    handleChat(msg, false);
  }, [prompt, isLoading, handleChat]);

  const handleQuickQuestion = (q) => handleChat(q, false);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTypedSend();
    }
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);
  useEffect(() => { if (open && inputRef.current && !isLoading) inputRef.current.focus(); }, [open, isLoading, history]);

  const getUserFirstName = () => user?.first_name || 'there';

  return (
    <>
      {!open && (
        <div onClick={() => setOpen(true)} className={aiStyles.floatingButton}>
          <IoIosChatbubbles />
        </div>
      )}

      {open && (
        <div className={aiStyles.chatbox}>

          <div className={aiStyles.chatboxHeader}>
            <div className={aiStyles.chatboxTitle}>
              <div className={aiStyles.aiIcon}><LuBotMessageSquare size={20} /></div>
              <div>
                <div className={aiStyles.aiName}>PanthersAI</div>
                <div className={aiStyles.aiStatus}>
                  {micPermission === MIC_PERMISSION.ASKING ? 'Waiting for permission...'
                    : isListening ? 'Listening...'
                    : isSpeaking  ? 'Speaking...'
                    : isLoading   ? 'Thinking...'
                    : 'Online'}
                </div>
              </div>
            </div>
            {isSpeaking && (
              <button onClick={stopSpeaking} className={aiStyles.stopSpeakingBtn} title="Stop speaking">
                <BsVolumeMuteFill size={14} /><span>Stop</span>
              </button>
            )}
            <button onClick={() => setOpen(false)} className={aiStyles.closeButton}>✕</button>
          </div>

          {micPermission === MIC_PERMISSION.ASKING && (
            <div className={aiStyles.permissionBanner}>
              <span><CiMicrophoneOn /></span>
              <span>Please allow microphone access in the browser prompt</span>
            </div>
          )}
          {micPermission === MIC_PERMISSION.DENIED && (
            <div className={aiStyles.permissionDeniedBanner}>
              <span><GoBlocked size={15} /></span>
              <span>Microphone blocked or no microphone detected.</span>
            </div>
          )}

          {isListening && (
            <div className={aiStyles.voiceModeBanner}>
              <div className={aiStyles.voiceWave}><span/><span/><span/><span/><span/></div>
              <span>Listening — speak now, I'll send automatically</span>
              <div className={aiStyles.voiceWave}><span/><span/><span/><span/><span/></div>
            </div>
          )}

          {isSpeaking && (
            <div className={aiStyles.speakingModeBanner}>
              <div className={aiStyles.speakingDots}><span/><span/><span/></div>
              <span>AI is speaking</span>
            </div>
          )}

          <div className={aiStyles.chatboxBody}>
            {history.length === 0 && (
              <div className={aiStyles.welcomeSection}>
                <div className={aiStyles.welcomeIcon}><FaComments size={48} /></div>
                <h3 className={aiStyles.welcomeTitle}>Welcome, {getUserFirstName()}!</h3>
                <p className={aiStyles.welcomeText}>
                  Type a message or use your voice. When you speak, I'll send and speak back automatically.
                </p>
                {voiceSupported && (
                  <div className={aiStyles.voiceHint}>
                    <BsMicFill size={12} />
                    <span>Tap to speak, AI speaks back</span>
                  </div>
                )}
                <div className={aiStyles.quickQuestions}>
                  <div className={aiStyles.quickQuestionsTitle}>
                    <MdOutlineQuestionAnswer size={16} color="darkgray" />
                    <span>Quick Questions</span>
                  </div>
                  {quickQuestions.map((q, i) => (
                    <button key={i} onClick={() => handleQuickQuestion(q)} className={aiStyles.questionButton} disabled={isLoading}>{q}</button>
                  ))}
                </div>
              </div>
            )}

            {history.map((msg, index) => (
              <div key={index} className={`${aiStyles.messageWrapper} ${msg.sender === 'user' ? aiStyles.userMessage : aiStyles.aiMessage}`}>
                {msg.sender === 'ai' && (
                  <div className={aiStyles.messageAvatar}><LuBotMessageSquare size={16} /></div>
                )}
                <div className={aiStyles.messageBubbleWrapper}>
                  <div className={`${aiStyles.messageBubble} ${speakingMsgIndex === index ? aiStyles.messageBubbleSpeaking : ''}`}>
                    {msg.text}
                  </div>
                  {msg.sender === 'ai' && ttsSupported && (
                    <button
                      className={`${aiStyles.bubbleSpeakerBtn} ${speakingMsgIndex === index ? aiStyles.bubbleSpeakerActive : ''}`}
                      onClick={() => speakingMsgIndex === index ? stopSpeaking() : speakText(msg.text, index)}
                      title={speakingMsgIndex === index ? 'Stop' : 'Read aloud'}
                    >
                      {speakingMsgIndex === index ? <BsVolumeMuteFill size={11} /> : <BsVolumeUpFill size={11} />}
                    </button>
                  )}
                  {msg.sender === 'user' && msg.wasVoice && (
                    <span className={aiStyles.voiceBadge} title="Sent via voice">🎙️</span>
                  )}
                </div>
              </div>
            ))}

            {history.length > 0 && showQuickQuestions && (
              <div className={aiStyles.quickQuestionsInline}>
                <div className={aiStyles.quickQuestionsTitle}>
                  <MdOutlineQuestionAnswer size={16} color="darkgray" /><span>Quick Questions</span>
                </div>
                {quickQuestions.map((q, i) => (
                  <button key={i} onClick={() => handleQuickQuestion(q)} className={aiStyles.questionButton} disabled={isLoading}>{q}</button>
                ))}
              </div>
            )}

            {isLoading && history.length > 0 && (
              <div className={`${aiStyles.messageWrapper} ${aiStyles.aiMessage}`}>
                <div className={aiStyles.messageAvatar}><LuBotMessageSquare size={16} /></div>
                <div className={aiStyles.messageBubble}>
                  <div className={aiStyles.typingIndicator}><span/><span/><span/></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className={aiStyles.chatboxFooter}>
            {history.length > 0 && (
              <button onClick={() => setShowQuickQuestions(!showQuickQuestions)} className={aiStyles.quickQuestionsToggle} disabled={isLoading}>
                <MdOutlineQuestionAnswer size={16} className={aiStyles.question} />
                <span>{showQuickQuestions ? 'Hide' : 'Show'} Quick Questions</span>
              </button>
            )}

            {isListening && interimTranscript && (
              <div className={aiStyles.interimTranscript}>
                <span>{interimTranscript}</span>
              </div>
            )}

            {isListening ? (
              <div className={aiStyles.listeningRow}>
                <div className={aiStyles.listeningPill}>
                  <div className={aiStyles.voiceWaveSmall}>
                    <span/><span/><span/><span/><span/>
                  </div>
                  <span>Listening...</span>
                </div>
                <button
                  onClick={stopListening}
                  className={aiStyles.cancelVoiceBtn}
                  title="Cancel voice input"
                >
                  <BsMicMuteFill size={16} />
                  <span>Cancel</span>
                </button>
              </div>
            ) : (
              <div className={`${aiStyles.inputContainer} ${isSpeaking ? aiStyles.inputContainerSpeaking : ''}`}>
                <input
                  ref={inputRef}
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    micPermission === MIC_PERMISSION.ASKING ? 'Waiting for mic permission...'
                    : isLoading  ? 'AI is thinking...'
                    : isSpeaking ? 'AI is speaking...'
                    : 'Ask me anything...'
                  }
                  disabled={isLoading || isSpeaking}
                  onKeyDown={handleKeyDown}
                  className={aiStyles.chatInput}
                />

                {voiceSupported && (
                  <button
                    onClick={toggleVoice}
                    disabled={isLoading || isSpeaking || micPermission === MIC_PERMISSION.ASKING}
                    className={`${aiStyles.voiceButton} ${micPermission === MIC_PERMISSION.DENIED ? aiStyles.voiceButtonDenied : ''}`}
                    title={
                      micPermission === MIC_PERMISSION.DENIED  ? 'Microphone blocked — click unlock in address bar'
                      : micPermission === MIC_PERMISSION.ASKING ? 'Waiting for permission...'
                      : 'Speak your message — sends & AI replies with audio'
                    }
                  >
                    {micPermission === MIC_PERMISSION.ASKING
                      ? <div className={aiStyles.micSpinner} />
                      : <BsMicFill size={16} />
                    }
                  </button>
                )}

                <button
                  onClick={handleTypedSend}
                  disabled={isLoading || !prompt.trim() || isSpeaking}
                  className={aiStyles.sendButton}
                >
                  {isLoading ? <div className={aiStyles.buttonSpinner} /> : <IoIosSend size={20} />}
                </button>
              </div>
            )}

            <div className={aiStyles.footerHint}>
              {micPermission === MIC_PERMISSION.DENIED
                ? <span className={aiStyles.footerDenied}>Mic blocked — check browser settings</span>
                : voiceSupported
                ? <>Voice auto-sends &amp; AI speaks back &nbsp;·&nbsp; Powered by <span>PanthersAI</span></>
                : <>Press Enter to send &nbsp;· Powered by <span>PanthersAI</span></>
              }
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Ai;
