import { useState, useEffect } from 'react';
import { collection, query, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LearnerProfile } from '../lib/learnerService';

export default function ProgressDashboard({ uid, profile }: { uid: string, profile: LearnerProfile }) {
  const [vocabStats, setVocabStats] = useState({ total: 0, mastered: 0, learning: 0 });
  const [errorStats, setErrorStats] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      // Get vocab counts
      const vocabSnap = await getDocs(collection(db, `learners/\${uid}/vocabulary`));
      let mastered = 0, learning = 0, total = 0;
      
      vocabSnap.forEach(doc => {
        total++;
        const state = doc.data().state;
        if (state === 'MASTERED') mastered++;
        else learning++;
      });
      
      // Get errors count
      const errorsCount = await getCountFromServer(collection(db, `learners/\${uid}/errors`));

      setVocabStats({ total, mastered, learning });
      setErrorStats({ total: errorsCount.data().count });
      setLoading(false);
    };
    fetchStats();
  }, [uid]);

  if (loading) return <div className="text-white/50 animate-pulse mt-12 text-center">Analysiere Daten...</div>;

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto space-y-8 mt-12 px-6 pb-24">
      <h2 className="text-3xl font-bold text-white text-center">Dein Fortschritt</h2>
      
      <div className="grid grid-cols-2 gap-4 w-full">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center">
          <span className="text-sm text-white/50 mb-1">Niveau</span>
          <span className="text-4xl font-bold text-blue-400">{profile.cefrLevel}</span>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center">
          <span className="text-sm text-white/50 mb-1">Sitzungen</span>
          <span className="text-4xl font-bold text-white">{profile.sessionCount || 0}</span>
        </div>
      </div>

      <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
        <h3 className="text-xl font-semibold text-white">Vokabeln (Vocabulary)</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-white/70">Wird gelernt (Learning)</span>
              <span className="text-white font-mono">{vocabStats.learning}</span>
            </div>
            <div className="w-full bg-black/50 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `\${vocabStats.total ? (vocabStats.learning / vocabStats.total) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-white/70">Gemeistert (Mastered)</span>
              <span className="text-green-400 font-mono">{vocabStats.mastered}</span>
            </div>
            <div className="w-full bg-black/50 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `\${vocabStats.total ? (vocabStats.mastered / vocabStats.total) * 100 : 0}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-white">Grammatik-Fehler</h3>
          <p className="text-sm text-white/50">Gefunden & analysiert</p>
        </div>
        <div className="text-3xl font-bold text-red-400">
          {errorStats.total}
        </div>
      </div>
    </div>
  );
}
