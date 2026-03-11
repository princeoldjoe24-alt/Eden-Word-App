import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, AgeGroup, SpiritualMaturity, Denomination } from '../types';
import { cn } from '../lib/utils';
import { ArrowRight, Check, Sparkles, Loader2, Volume2, VolumeX } from 'lucide-react';
import { COUNTRIES, LANGUAGES } from '../data/constants';
import { suggestKingdomGoals, generateSpeech } from '../services/gemini';
import { useEffect } from 'react';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    name: '',
    ageGroup: 'adult',
    maturity: 'growing',
    denomination: 'Non-Denominational',
    lifeStage: 'career',
    country: 'Nigeria',
    language: 'English',
    kingdomGoals: [],
    onboarded: true,
    stars: 0
  });
  const [suggestedGoals, setSuggestedGoals] = useState<string[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const handleListen = async (text: string) => {
    if (isSpeaking) {
      audio?.pause();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    try {
      const base64Audio = await generateSpeech(text);
      if (base64Audio) {
        const audioBlob = await fetch(`data:audio/wav;base64,${base64Audio}`).then(res => res.blob());
        const audioUrl = URL.createObjectURL(audioBlob);
        const newAudio = new Audio(audioUrl);
        setAudio(newAudio);
        newAudio.play();
        newAudio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
      }
    } catch (err) {
      console.error("Error playing audio:", err);
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        setAudio(null);
      }
    };
  }, [audio]);

  const next = () => {
    if (step === 5) { // After denomination, suggest goals
      setLoadingGoals(true);
      suggestKingdomGoals(profile)
        .then(setSuggestedGoals)
        .finally(() => setLoadingGoals(false));
    }
    setStep(s => s + 1);
  };
  const back = () => setStep(s => Math.max(0, s - 1));

  const steps = [
    {
      title: "Welcome to Eden Word",
      description: "Let's personalize your spiritual journey.",
      content: (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-white uppercase tracking-wider">What is your name?</label>
          <input
            type="text"
            className="w-full bg-transparent border-b-2 border-white/10 focus:border-eden-gold outline-none py-2 text-2xl font-serif text-white"
            placeholder="Enter your name"
            value={profile.name}
            onChange={e => setProfile({ ...profile, name: e.target.value })}
          />
        </div>
      )
    },
    {
      title: "Country of Residence",
      description: "Where are you serving the Kingdom?",
      content: (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-white uppercase tracking-wider">Your Country</label>
          <select
            className="w-full bg-transparent border-b-2 border-white/10 focus:border-eden-gold outline-none py-2 text-2xl font-serif appearance-none text-white"
            value={profile.country}
            onChange={e => setProfile({ ...profile, country: e.target.value })}
          >
            {COUNTRIES.map(c => (
              <option key={c} value={c} className="text-base text-eden-dark bg-eden-dark">{c}</option>
            ))}
          </select>
        </div>
      )
    },
    {
      title: "Preferred Language",
      description: "In which language would you like to study?",
      content: (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-white uppercase tracking-wider">Your Language</label>
          <select
            className="w-full bg-transparent border-b-2 border-white/10 focus:border-eden-gold outline-none py-2 text-2xl font-serif appearance-none text-white"
            value={profile.language}
            onChange={e => setProfile({ ...profile, language: e.target.value })}
          >
            {LANGUAGES.map(l => (
              <option key={l} value={l} className="text-base text-eden-dark bg-eden-dark">{l}</option>
            ))}
          </select>
        </div>
      )
    },
    {
      title: "Your Season",
      description: "Tell us about your current life stage.",
      content: (
        <div className="grid grid-cols-2 gap-3">
          {(['teen', 'young-adult', 'adult', 'church-elder'] as AgeGroup[]).map(age => (
            <button
              key={age}
              onClick={() => setProfile({ ...profile, ageGroup: age })}
              className={cn(
                "p-4 rounded-xl border transition-all text-left",
                profile.ageGroup === age ? "bg-eden-leaf text-white border-eden-leaf" : "bg-white/5 border-white/10 hover:border-eden-gold/30 text-white/60"
              )}
            >
              <span className="capitalize">{age.replace('-', ' ')}</span>
            </button>
          ))}
        </div>
      )
    },
    {
      title: "Spiritual Maturity",
      description: "Where are you in your walk with Christ?",
      content: (
        <div className="space-y-3">
          {(['new', 'growing', 'mature'] as SpiritualMaturity[]).map(m => (
            <button
              key={m}
              onClick={() => setProfile({ ...profile, maturity: m })}
              className={cn(
                "w-full p-4 rounded-xl border transition-all text-left flex justify-between items-center",
                profile.maturity === m ? "bg-eden-leaf text-white border-eden-leaf" : "bg-white/5 border-white/10 hover:border-eden-gold/30 text-white/60"
              )}
            >
              <span className="capitalize">{m} Believer</span>
              {profile.maturity === m && <Check size={18} />}
            </button>
          ))}
        </div>
      )
    },
    {
      title: "Denominational Context",
      description: "This helps us tailor examples and language.",
      content: (
        <div className="grid grid-cols-1 gap-2">
          {(['Pentecostal', 'Orthodox', 'Catholic', 'Protestant', 'Non-Denominational'] as Denomination[]).map(d => (
            <button
              key={d}
              onClick={() => setProfile({ ...profile, denomination: d })}
              className={cn(
                "p-3 rounded-lg border transition-all text-left",
                profile.denomination === d ? "bg-eden-leaf text-white border-eden-leaf" : "bg-white/5 border-white/10 hover:border-eden-gold/30 text-white/60"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      )
    },
    {
      title: "Your Kingdom Goals",
      description: "AI-suggested goals for your spiritual growth.",
      content: (
        <div className="space-y-3">
          {loadingGoals ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="animate-spin text-eden-gold" size={32} />
              <p className="text-eden-leaf/60 text-sm italic">Gemini is reflecting on your profile...</p>
            </div>
          ) : (
            <>
              {suggestedGoals.map(goal => (
                <button
                  key={goal}
                  onClick={() => {
                    const current = profile.kingdomGoals || [];
                    if (current.includes(goal)) {
                      setProfile({ ...profile, kingdomGoals: current.filter(g => g !== goal) });
                    } else {
                      setProfile({ ...profile, kingdomGoals: [...current, goal] });
                    }
                  }}
                  className={cn(
                    "w-full p-4 rounded-xl border transition-all text-left flex justify-between items-center",
                    profile.kingdomGoals?.includes(goal) ? "bg-eden-leaf text-white border-eden-leaf" : "bg-white/5 border-white/10 hover:border-eden-gold/30 text-white/60"
                  )}
                >
                  <span className="text-sm">{goal}</span>
                  {profile.kingdomGoals?.includes(goal) && <Check size={16} />}
                </button>
              ))}
              <div className="pt-4 flex items-center gap-2 text-[10px] uppercase tracking-widest text-eden-gold font-bold">
                <Sparkles size={12} />
                <span>Personalized by Gemini</span>
              </div>
            </>
          )}
        </div>
      )
    }
  ];

  const currentStep = steps[step];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-eden-dark">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={step}
            className="relative"
          >
            <h1 className="text-4xl font-serif mb-2 text-white">{currentStep.title}</h1>
            <p className="text-eden-leaf/60">{currentStep.description}</p>
            {step === 0 && (
              <button 
                onClick={() => handleListen(`${currentStep.title}. ${currentStep.description}`)}
                className={cn(
                  "absolute -right-12 top-0 p-2 rounded-full transition-all",
                  isSpeaking ? "bg-eden-gold text-white animate-pulse" : "text-eden-leaf/40 hover:text-eden-gold"
                )}
              >
                {isSpeaking ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            )}
          </motion.div>
        </div>

        <div className="mt-8 min-h-[200px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentStep.content}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex justify-between items-center pt-8">
          {step > 0 && (
            <button onClick={back} className="text-eden-leaf font-medium">Back</button>
          )}
          <div className="flex-1" />
          <button
            onClick={step === steps.length - 1 ? () => onComplete(profile as UserProfile) : next}
            disabled={step === 0 && !profile.name}
            className="bg-eden-leaf text-white px-8 py-3 rounded-full flex items-center gap-2 hover:bg-eden-gold transition-colors disabled:opacity-50 shadow-lg shadow-eden-leaf/20"
          >
            {step === steps.length - 1 ? "Start Journey" : "Continue"}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
