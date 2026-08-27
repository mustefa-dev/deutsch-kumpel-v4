import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VocabularyItem } from '../lib/learnerService';

export default function SRSReview({ uid, onBack }: { uid: string, onBack: () => void }) {
  const [cards, setCards] = useState<(VocabularyItem & { id: string })[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCards = async () => {
      const q = query(
        collection(db, `learners/\${uid}/vocabulary`),
        where('state', 'in', ['EXPOSED', 'LEARNING'])
      );
      const snapshot = await getDocs(q);
      const fetchedCards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setCards(fetchedCards);
      setLoading(false);
    };
    fetchCards();
  }, [uid]);

  const handleGrade = async (grade: 'Again' | 'Hard' | 'Good' | 'Easy') => {
    const card = cards[currentIndex];
    
    // Simplified SRS logic
    let newState = card.state;
    if (grade === 'Easy' || grade === 'Good') {
      newState = card.state === 'EXPOSED' ? 'LEARNING' : 'MASTERED';
    }

    await updateDoc(doc(db, `learners/\${uid}/vocabulary`, card.id), {
      state: newState,
      lastReview: Date.now()
    });

    setShowAnswer(false);
    setCurrentIndex(prev => prev + 1);
  };

  if (loading) return <div className="text-white/50 animate-pulse">Lade Karten...</div>;

  if (currentIndex >= cards.length) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 text-center">
        <h2 className="text-3xl font-bold text-white">Geschafft! 🎉</h2>
        <p className="text-white/70">You have no more words to review right now.</p>
        <button onClick={onBack} className="px-6 py-2 bg-blue-600 text-white rounded-full">Back to Conversation</button>
      </div>
    );
  }

  const card = cards[currentIndex];

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto space-y-8 mt-12">
      <div className="flex justify-between w-full px-4 text-white/50 text-sm">
        <span>Karten: {currentIndex + 1} / {cards.length}</span>
        <button onClick={onBack} className="hover:text-white">Zurück</button>
      </div>

      <div 
        className="w-full bg-gray-900 border border-white/10 rounded-2xl p-8 min-h-[300px] flex flex-col items-center justify-center cursor-pointer shadow-xl transition-all"
        onClick={() => !showAnswer && setShowAnswer(true)}
      >
        <h2 className="text-4xl font-bold text-white mb-4 text-center">{card.word}</h2>
        
        {showAnswer ? (
          <div className="flex flex-col items-center space-y-6 animate-fade-in">
            <div className="w-12 h-1 bg-white/10 rounded-full"></div>
            <p className="text-2xl text-blue-400 font-semibold">{card.translation}</p>
            {card.context && (
              <p className="text-white/60 text-center italic text-sm">"{card.context}"</p>
            )}
          </div>
        ) : (
          <p className="text-white/30 text-sm mt-8 animate-pulse">Tap to reveal</p>
        )}
      </div>

      {showAnswer && (
        <div className="grid grid-cols-4 gap-2 w-full">
          <button onClick={() => handleGrade('Again')} className="py-3 bg-red-900/50 hover:bg-red-900 text-red-200 rounded-xl text-sm font-medium">Again</button>
          <button onClick={() => handleGrade('Hard')} className="py-3 bg-orange-900/50 hover:bg-orange-900 text-orange-200 rounded-xl text-sm font-medium">Hard</button>
          <button onClick={() => handleGrade('Good')} className="py-3 bg-green-900/50 hover:bg-green-900 text-green-200 rounded-xl text-sm font-medium">Good</button>
          <button onClick={() => handleGrade('Easy')} className="py-3 bg-blue-900/50 hover:bg-blue-900 text-blue-200 rounded-xl text-sm font-medium">Easy</button>
        </div>
      )}
    </div>
  );
}
