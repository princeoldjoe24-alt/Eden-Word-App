import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, MessageSquare, Heart, Share2, MoreHorizontal, Sparkles, Search, Volume2, VolumeX } from 'lucide-react';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';
import { generateSpeech } from '../services/gemini';
import { useEffect } from 'react';

interface Post {
  id: string;
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  content: string;
  likes: number;
  comments: number;
  timestamp: string;
  tags: string[];
}

const MOCK_POSTS: Post[] = [
  {
    id: '1',
    author: {
      name: 'Pastor David',
      avatar: 'https://picsum.photos/seed/pastor/100/100',
      role: 'Spiritual Mentor'
    },
    content: 'The grace of our Lord Jesus Christ be with you all. Today we reflect on the power of intercessory prayer. Who are you standing in the gap for today?',
    likes: 24,
    comments: 12,
    timestamp: '2h ago',
    tags: ['Grace', 'Prayer', 'Community']
  },
  {
    id: '2',
    author: {
      name: 'Sister Sarah',
      avatar: 'https://picsum.photos/seed/sarah/100/100',
      role: 'Bible Study Leader'
    },
    content: 'Just finished the "Kingdom Purpose" track. It truly opened my eyes to how my career can be a ministry. Highly recommend it to all young professionals!',
    likes: 45,
    comments: 8,
    timestamp: '5h ago',
    tags: ['Purpose', 'Career', 'Ministry']
  },
  {
    id: '3',
    author: {
      name: 'Brother John',
      avatar: 'https://picsum.photos/seed/john/100/100',
      role: 'Member'
    },
    content: 'Praise report! My neighbor finally agreed to come to church with me this Sunday. Please pray for their heart to be open to the Word.',
    likes: 89,
    comments: 34,
    timestamp: '1d ago',
    tags: ['Praise', 'Evangelism']
  }
];

interface CommunityHubProps {
  profile: UserProfile;
}

export default function CommunityHub({ profile }: CommunityHubProps) {
  const [activeTab, setActiveTab] = useState<'feed' | 'members' | 'groups'>('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const handleListen = async (text: string, id: string) => {
    if (isSpeaking === id) {
      audio?.pause();
      setIsSpeaking(null);
      return;
    }

    setIsSpeaking(id);
    try {
      const base64Audio = await generateSpeech(text.replace(/[*#]/g, ''));
      if (base64Audio) {
        const audioBlob = await fetch(`data:audio/wav;base64,${base64Audio}`).then(res => res.blob());
        const audioUrl = URL.createObjectURL(audioBlob);
        const newAudio = new Audio(audioUrl);
        setAudio(newAudio);
        newAudio.play();
        newAudio.onended = () => {
          setIsSpeaking(null);
          URL.revokeObjectURL(audioUrl);
        };
      }
    } catch (err) {
      console.error("Error playing audio:", err);
      setIsSpeaking(null);
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

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-5xl font-serif text-white">Community Hub</h1>
          <p className="text-eden-leaf/60 font-serif italic">Connect with the {profile.denomination} family.</p>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
          {(['feed', 'members', 'groups'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                activeTab === tab ? "bg-eden-leaf text-white shadow-lg" : "text-white/40 hover:text-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Create Post */}
          <div className="glass p-6 rounded-3xl space-y-4 border-eden-gold/10">
            <div className="flex gap-4">
              <img 
                src={`https://ui-avatars.com/api/?name=${profile.name}&background=8BC34A&color=fff`} 
                alt={profile.name}
                className="w-12 h-12 rounded-full border-2 border-eden-leaf/20"
                referrerPolicy="no-referrer"
              />
              <textarea 
                placeholder="Share a word of encouragement..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-white/20 resize-none py-2"
                rows={2}
              />
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-white/5">
              <div className="flex gap-4">
                <button className="text-white/40 hover:text-eden-leaf transition-colors"><Sparkles size={20} /></button>
                <button className="text-white/40 hover:text-eden-leaf transition-colors"><Heart size={20} /></button>
              </div>
              <button className="bg-eden-leaf text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-eden-gold transition-colors shadow-lg shadow-eden-leaf/20">
                Post
              </button>
            </div>
          </div>

          {/* Feed */}
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {MOCK_POSTS.map((post, idx) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass p-8 rounded-3xl space-y-6 hover:border-eden-leaf/30 transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <img 
                        src={post.author.avatar} 
                        alt={post.author.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white/10"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h4 className="text-white font-serif text-lg">{post.author.name}</h4>
                        <p className="text-[10px] uppercase tracking-widest text-eden-leaf/60 font-bold">{post.author.role}</p>
                      </div>
                    </div>
                    <button className="text-white/20 hover:text-white transition-colors"><MoreHorizontal size={20} /></button>
                  </div>

                  <p className="text-white/80 leading-relaxed font-serif text-lg">
                    {post.content}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-[10px] uppercase tracking-widest font-bold text-eden-gold bg-eden-gold/10 px-3 py-1 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-6 border-t border-white/5">
                    <div className="flex gap-6">
                      <button className="flex items-center gap-2 text-white/40 hover:text-red-500 transition-colors">
                        <Heart size={18} />
                        <span className="text-xs font-bold">{post.likes}</span>
                      </button>
                      <button className="flex items-center gap-2 text-white/40 hover:text-eden-leaf transition-colors">
                        <MessageSquare size={18} />
                        <span className="text-xs font-bold">{post.comments}</span>
                      </button>
                      <button 
                        onClick={() => handleListen(post.content, post.id)}
                        className={cn(
                          "flex items-center gap-2 transition-colors",
                          isSpeaking === post.id ? "text-eden-gold animate-pulse" : "text-white/40 hover:text-eden-gold"
                        )}
                      >
                        {isSpeaking === post.id ? <VolumeX size={18} /> : <Volume2 size={18} />}
                      </button>
                    </div>
                    <button className="text-white/40 hover:text-white transition-colors">
                      <Share2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="glass p-6 rounded-3xl space-y-4">
            <h5 className="text-xs uppercase tracking-widest font-bold text-white/40">Search Community</h5>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input 
                type="text" 
                placeholder="Find members or groups..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-eden-leaf outline-none"
              />
            </div>
          </div>

          <div className="glass p-6 rounded-3xl space-y-6">
            <h5 className="text-xs uppercase tracking-widest font-bold text-white/40">Active Groups</h5>
            <div className="space-y-4">
              {[
                { name: 'Prayer Warriors', members: 124, icon: <Heart size={16} /> },
                { name: 'Bible Scholars', members: 89, icon: <MessageSquare size={16} /> },
                { name: 'Youth Ministry', members: 210, icon: <Users size={16} /> }
              ].map(group => (
                <button key={group.name} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all text-left">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-eden-leaf/10 text-eden-leaf">
                      {group.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{group.name}</p>
                      <p className="text-[10px] text-white/40">{group.members} members</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-white/20" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronRight({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
