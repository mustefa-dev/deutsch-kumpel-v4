import { useState } from 'react';

export default function ScenarioSelector({ onStart }: { onStart: (scenarioPrompt: string) => void }) {
  const [customScenario, setCustomScenario] = useState('');

  const predefinedScenarios = [
    { title: '☕️ Cafe in Berlin', prompt: 'Pretend you are a barista at a trendy cafe in Kreuzberg, Berlin. I am ordering coffee and cake. Speak only German. Keep it realistic.' },
    { title: '🛂 Passport Control', prompt: 'Pretend you are a strict German border police officer in Frankfurt. Ask me why I am visiting, where I am staying, and how long. Speak only German.' },
    { title: '💼 Job Interview', prompt: 'Pretend you are interviewing me for a Software Engineering role at a German tech company. Ask me about my experience and technical skills in German.' }
  ];

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto space-y-8 mt-12 px-6">
      <h2 className="text-3xl font-bold text-white text-center">Choose a Scenario</h2>
      
      <div className="w-full space-y-4">
        {predefinedScenarios.map((s, idx) => (
          <button 
            key={idx}
            onClick={() => onStart(s.prompt)}
            className="w-full text-left p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all"
          >
            <h3 className="text-xl font-semibold text-white">{s.title}</h3>
            <p className="text-white/50 text-sm mt-1 truncate">{s.prompt}</p>
          </button>
        ))}
      </div>

      <div className="w-full h-px bg-white/10 my-4"></div>

      <div className="w-full space-y-4">
        <h3 className="text-lg font-medium text-white/80">Or create your own:</h3>
        <textarea 
          value={customScenario}
          onChange={(e) => setCustomScenario(e.target.value)}
          placeholder="E.g., I want to practice buying train tickets to Munich..."
          className="w-full p-4 bg-black/50 border border-white/20 rounded-2xl text-white placeholder-white/30 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-32"
        />
        <button 
          onClick={() => customScenario.trim() && onStart(`Play this custom roleplay scenario: \${customScenario}. Keep responses short for voice.`)}
          disabled={!customScenario.trim()}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white font-semibold rounded-full transition-all"
        >
          Start Custom Scenario
        </button>
      </div>
    </div>
  );
}
