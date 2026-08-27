'use client';

import { useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signOut } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getOrCreateLearnerProfile, updateCefrLevel, getRecentErrors, getLearningVocabulary, LearnerProfile } from '../lib/learnerService';
import { useGeminiLive } from '../hooks/useGeminiLive';
import SRSReview from '../components/SRSReview';
import ScenarioSelector from '../components/ScenarioSelector';
import ProgressDashboard from '../components/ProgressDashboard';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [learnerProfile, setLearnerProfile] = useState<LearnerProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [view, setView] = useState<'chat' | 'review' | 'scenarios' | 'progress'>('chat');
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const { connect, disconnect, isConnected, isSpeaking, transcript, interrupt } = useGeminiLive(systemPrompt);

  const assemblePrompt = async (currentUser: User, profile: LearnerProfile, customScenarioStr: string | null = null) => {
    const recentErrors = await getRecentErrors(currentUser.uid);
    const recentVocab = await getLearningVocabulary(currentUser.uid);
    
    const recentErrorsText = recentErrors?.length 
      ? `\nRECENT LEARNER WEAKNESSES TO TEST:\n` + recentErrors.map((e: any) => `- Used "${e.incorrectForm}" instead of "${e.correctForm}" (Concept: ${e.concept})`).join('\n')
      : '';
    const targetVocabText = recentVocab?.length
      ? `\nTARGET VOCABULARY TO RECYCLE:\n` + recentVocab.map((v: any) => `- ${v.word} (${v.translation})`).join('\n')
      : '';

    const scenarioText = customScenarioStr 
      ? `\nACTIVE ROLEPLAY SCENARIO:\n${customScenarioStr}\nIMPORTANT: You must stay in this character!\n`
      : `\nCORE PERSONALITY & TONE:\n- You are a witty, expressive German friend hanging out at a Berlin cafe.\n- You use authentic German conversational fillers.\n`;

    setSystemPrompt(`You are an AI German Tutor/Companion.

USER CONTEXT:
- Target Level: ${profile.cefrLevel} (A1: simple vocabulary; B1: idiomatic conversational German; C1: fast, native slang & nuanced debate).
- User Profile: Native Arabic speaker, fluent in English.
${recentErrorsText}${targetVocabText}
${scenarioText}
CONVERSATION MECHANICS:
1. NEVER end with a bland question like "What about you?".
2. BANTER: If the user says something unusual, react with emotion.
3. RECASTING: If the user makes a grammar error, weave the corrected phrase into your reply in **bold**.
4. Keep turns SHORT for voice interface (1-2 sentences).`);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profile = await getOrCreateLearnerProfile(currentUser.uid, currentUser.email || '');
        setLearnerProfile(profile);
        await assemblePrompt(currentUser, profile, activeScenario);
      } else {
        setLearnerProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [activeScenario]);

  const handleStartScenario = async (scenarioText: string) => {
    setActiveScenario(scenarioText);
    if (user && learnerProfile) {
      await assemblePrompt(user, learnerProfile, scenarioText);
    }
    setView('chat');
  };

  const handleLevelChange = async (newLevel: string) => {
    if (!learnerProfile) return;
    setLearnerProfile({ ...learnerProfile, cefrLevel: newLevel });
    await updateCefrLevel(learnerProfile.uid, newLevel);
    if (user) await assemblePrompt(user, learnerProfile, activeScenario);
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-black text-white">Laden...</div>;

  if (!user) {
    return (
      <div className="flex flex-col h-screen bg-black text-white font-sans items-center justify-center space-y-8">
        <h1 className="font-bold text-4xl tracking-tight">ISSEN<span className="text-blue-500">_Tutor</span></h1>
        <p className="text-gray-400 max-w-md text-center text-lg">Sign in to start your real-time voice journey.</p>
        <button onClick={handleLogin} className="px-8 py-3 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition">Sign in with Google</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
      <header className="px-6 py-4 flex justify-between items-center z-10 bg-gradient-to-b from-black to-transparent">
        <div className="flex items-center space-x-4">
          <h1 className="font-bold text-xl tracking-tight text-white/90">ISSEN<span className="text-blue-500">_Tutor</span></h1>
          {user.photoURL && <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-white/20" />}
          <button onClick={() => signOut(auth)} className="text-xs text-white/50 hover:text-white hidden md:block">Sign Out</button>
        </div>
        
        <div className="flex space-x-1 md:space-x-2 bg-white/5 rounded-full p-1 overflow-x-auto hide-scrollbar">
          <button onClick={() => setView('chat')} className={`px-4 py-1 rounded-full text-sm font-medium transition-all ${view === 'chat' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}>Live</button>
          <button onClick={() => setView('scenarios')} className={`px-4 py-1 rounded-full text-sm font-medium transition-all ${view === 'scenarios' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}>Scenarios</button>
          <button onClick={() => setView('review')} className={`px-4 py-1 rounded-full text-sm font-medium transition-all ${view === 'review' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}>Review</button>
          <button onClick={() => setView('progress')} className={`px-4 py-1 rounded-full text-sm font-medium transition-all ${view === 'progress' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}>Progress</button>
        </div>

        <select 
          value={learnerProfile?.cefrLevel || 'A1'} 
          onChange={(e) => handleLevelChange(e.target.value)}
          className="bg-white/10 text-white/80 border-none rounded-full px-4 py-1.5 text-sm font-medium backdrop-blur-md cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 appearance-none hidden md:block"
        >
          <option value="A1" className="bg-gray-900">Level: A1</option>
          <option value="A2" className="bg-gray-900">Level: A2</option>
          <option value="B1" className="bg-gray-900">Level: B1</option>
          <option value="C1" className="bg-gray-900">Level: C1</option>
        </select>
      </header>

      {view === 'review' ? (
        <SRSReview uid={user.uid} onBack={() => setView('chat')} />
      ) : view === 'progress' && learnerProfile ? (
        <ProgressDashboard uid={user.uid} profile={learnerProfile} />
      ) : view === 'scenarios' ? (
        <ScenarioSelector onStart={handleStartScenario} />
      ) : (
        <>
          <main className="flex-1 flex flex-col items-center justify-center px-6 space-y-8">
            <div className="text-center space-y-2">
               <p className="text-white/50 text-sm">{isConnected ? 'Verbunden (Live)' : 'Bereit'}</p>
               {activeScenario && <p className="text-blue-400 text-xs mt-2 px-4 py-1 bg-blue-900/30 rounded-full">Roleplay Active</p>}
            </div>
          </main>

          <div className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/90 to-transparent pt-20 pb-16 flex flex-col items-center">
            
            <div className="mb-12 text-white text-xl text-center max-w-lg px-4 h-24 overflow-hidden flex items-end justify-center">
              <p className="leading-relaxed drop-shadow-md">{transcript}</p>
            </div>

            <div className="flex items-center justify-center space-x-6 w-full px-8">
              
              <button 
                onClick={interrupt}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isSpeaking ? 'bg-white/20 text-white hover:bg-white/30' : 'opacity-0 pointer-events-none'}`}
                title="Barge-in (Interrupt)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                </svg>
              </button>

              <button
                onClick={isConnected ? disconnect : connect}
                className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                  isConnected 
                    ? isSpeaking ? 'bg-purple-600 scale-105 shadow-purple-600/50' : 'bg-red-500 scale-110 shadow-red-500/50'
                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                }`}
              >
                {isConnected && (
                  <div className={`absolute inset-0 rounded-full border-2 ${isSpeaking ? 'border-purple-400 animate-pulse' : 'border-red-400 animate-ping'} opacity-75`}></div>
                )}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </button>

              <div className="w-12 h-12"></div>
            </div>
          </div>
        </>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}
