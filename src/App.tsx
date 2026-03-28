import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  MapPin, 
  Image as ImageIcon, 
  MessageSquare, 
  FileText, 
  Video, 
  RefreshCw, 
  ChevronRight, 
  Loader2,
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Settings2,
  Plus,
  Moon,
  Sun,
  History as HistoryIcon,
  LogOut,
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  generateCharacters, 
  generateLocations, 
  generateImagePrompt, 
  generateTopics, 
  generateScript, 
  generateVideoScenes,
  generateCharacterAngles,
  generateImage,
  generateVideo
} from './services/geminiService';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

type Step = 'characters' | 'locations' | 'imagePrompt' | 'topics' | 'script' | 'scenes';

const COUNTRIES = [
  "Sri Lanka", "India", "Japan", "China", "South Korea", "Thailand", "Vietnam", 
  "United States", "United Kingdom", "Canada", "France", "Germany", "Italy", "Spain", 
  "Brazil", "Mexico", "Egypt", "Nigeria", "South Africa", "Australia", "New Zealand",
  "Russia", "Turkey", "Iran", "Saudi Arabia", "Israel", "Norway", "Sweden", "Switzerland",
  "Netherlands", "Belgium", "Austria", "Greece", "Portugal", "Ireland", "Poland", "Ukraine"
];

const LANGUAGES = [
  "Sinhala", "Tamil", "English", "Hindi", "Japanese", "Mandarin", "Korean", 
  "Thai", "Vietnamese", "French", "German", "Italian", "Spanish", 
  "Portuguese", "Arabic", "Hebrew", "Russian", "Turkish"
];

const CopyButton = ({ text, label = "Copy Prompt", className = "" }: { text: string, label?: string, className?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-4 py-2 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all text-[10px] font-bold uppercase tracking-widest bg-white/80 backdrop-blur-sm shadow-sm ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-green-600" /> Copied
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" /> {label}
        </>
      )}
    </button>
  );
};

const COMMON_ROLES = [
  "Farmer", "Fisherman", "Teacher", "Carpenter", "Doctor", "Engineer", 
  "Artist", "Musician", "Chef", "Athlete", "Scientist", "Pilot", 
  "Soldier", "Police Officer", "Firefighter", "Lawyer", "Business Owner", 
  "Student", "Retired", "Unemployed", "Craftsman", "Healer", "Monk", "Ranger",
  "Journalist", "Writer", "Architect", "Designer", "Programmer", "Nurse", "Pharmacist",
  "Dentist", "Vet", "Psychologist", "Social Worker", "Librarian", "Historian",
  "Archeologist", "Geologist", "Biologist", "Physicist", "Chemist", "Astronomer",
  "Mathematician", "Philosopher", "Politician", "Diplomat", "Judge", "Priest",
  "Imam", "Rabbi", "Guru", "Shaman", "Hunter", "Gatherer", "Nomad", "Blacksmith",
  "Weaver", "Potter", "Tailor", "Shoemaker", "Baker", "Butcher", "Brewer", "Winemaker"
];

export default function App() {
  const [step, setStep] = useState<Step>('characters');
  const [loading, setLoading] = useState(false);
  
  // Auth State
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // History State
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        fetchHistory(u.uid);
      } else {
        setHistory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchHistory = async (uid: string) => {
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'generations'),
        where('uid', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(docs);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setStep('characters');
    setShowHistory(false);
  };

  const saveGeneration = async (data: any) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'generations'), {
        ...data,
        uid: user.uid,
        createdAt: new Date().toISOString()
      });
      fetchHistory(user.uid);
    } catch (error) {
      console.error("Error saving generation:", error);
    }
  };

  const [characters, setCharacters] = useState<{name: string, role: string, country: string, language: string}[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<{name: string, role: string, country: string, language: string} | null>(null);
  
  // Manual Input State
  const [manualAge, setManualAge] = useState<string>('65');
  const [manualGender, setManualGender] = useState<string>('Male');
  const [manualRole, setManualRole] = useState<string>('');
  const [manualCountry, setManualCountry] = useState<string>('Sri Lanka');
  const [manualLanguage, setManualLanguage] = useState<string>('Sinhala');
  const [showManual, setShowManual] = useState(false);
  
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  
  const [imagePrompt, setImagePrompt] = useState<any>(null);
  const [characterAngles, setCharacterAngles] = useState<{angle: string, prompt: string, imageUrl?: string}[]>([]);
  const [loadingAngles, setLoadingAngles] = useState(false);
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null);
  const [generatingMainImage, setGeneratingMainImage] = useState(false);
  
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        try {
          const has = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(has);
        } catch (e) {
          console.error("Error checking API key:", e);
        }
      }
    };
    checkKey();
  }, []);

  const handleOpenSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleGenerateMainImage = async () => {
    if (!imagePrompt?.prompt) return;
    setGeneratingMainImage(true);
    try {
      const url = await generateImage(imagePrompt.prompt);
      setMainImageUrl(url);
    } catch (error) {
      console.error(error);
    } finally {
      setGeneratingMainImage(false);
    }
  };

  const handleGenerateAngleImage = async (idx: number) => {
    const angle = characterAngles[idx];
    if (!angle || angle.imageUrl) return;
    
    const newAngles = [...characterAngles];
    newAngles[idx] = { ...angle, loading: true } as any;
    setCharacterAngles(newAngles);

    try {
      const url = await generateImage(angle.prompt);
      newAngles[idx] = { ...angle, imageUrl: url, loading: false } as any;
      setCharacterAngles(newAngles);
    } catch (error) {
      console.error(error);
      newAngles[idx] = { ...angle, loading: false } as any;
      setCharacterAngles(newAngles);
    }
  };

  const handleGenerateSceneVideo = async (idx: number) => {
    if (!hasApiKey) {
      await handleOpenSelectKey();
      return;
    }

    const scene = scenes[idx];
    if (!scene || scene.videoUrl) return;

    const newScenes = [...scenes];
    newScenes[idx] = { ...scene, generatingVideo: true };
    setScenes(newScenes);

    try {
      const url = await generateVideo(scene.imagePrompt || scene.characterDescription);
      newScenes[idx] = { ...scene, videoUrl: url, generatingVideo: false };
      setScenes(newScenes);
    } catch (error) {
      console.error(error);
      newScenes[idx] = { ...scene, generatingVideo: false };
      setScenes(newScenes);
    }
  };
  
  const [topics, setTopics] = useState<{title: string, description: string}[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  
  const [script, setScript] = useState<{native: string, english: string} | null>(null);
  const [scenes, setScenes] = useState<any[]>([]);

  useEffect(() => {
    if (step === 'characters' && characters.length === 0 && !loading) {
      handleGenerateCharacters();
    }
  }, [step, characters.length]);

  const handleGenerateCharacters = async () => {
    setLoading(true);
    try {
      const data = await generateCharacters();
      setCharacters(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCharacter = async (char: {name: string, role: string, country: string, language: string}) => {
    setSelectedCharacter(char);
    setMainImageUrl(null);
    setCharacterAngles([]);
    setImagePrompt(null);
    setLoading(true);
    try {
      const data = await generateLocations(`${char.name}, ${char.role}`);
      setLocations(data);
      setStep('locations');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRole) return;
    
    const char = {
      name: `${manualAge} year old ${manualGender} ${manualRole}`,
      role: "Custom Manual Character",
      country: manualCountry,
      language: manualLanguage
    };
    handleSelectCharacter(char);
  };

  const handleSelectLocation = async (loc: string) => {
    setSelectedLocation(loc);
    setMainImageUrl(null);
    setCharacterAngles([]);
    setLoading(true);
    try {
      const data = await generateImagePrompt(
        `${selectedCharacter?.name}, ${selectedCharacter?.role}`, 
        loc,
        selectedCharacter?.country || 'United States'
      );
      setImagePrompt(data);
      setStep('imagePrompt');
      
      // Generate angles in background
      setLoadingAngles(true);
      const angles = await generateCharacterAngles(data.prompt);
      setCharacterAngles(angles);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingAngles(false);
    }
  };

  const handleProceedToTopics = async () => {
    setLoading(true);
    try {
      const data = await generateTopics(
        imagePrompt.prompt,
        selectedCharacter?.country || 'United States',
        selectedCharacter?.language || 'English'
      );
      setTopics(data);
      setStep('topics');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTopic = async (topic: any) => {
    setSelectedTopic(topic);
    setScenes([]);
    setLoading(true);
    try {
      const data = await generateScript(
        imagePrompt.prompt, 
        topic.title,
        selectedCharacter?.country || 'United States',
        selectedCharacter?.language || 'English'
      );
      setScript(data);
      setStep('script');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateScenes = async () => {
    if (!script) return;
    setLoading(true);
    setScenes([]);
    try {
      const data = await generateVideoScenes(
        imagePrompt.prompt, 
        script.native,
        selectedCharacter?.country || 'United States',
        selectedCharacter?.language || 'English'
      );
      setScenes(data);
      setStep('scenes');
      
      // Save to history
      if (user) {
        saveGeneration({
          character: selectedCharacter,
          location: selectedLocation,
          imagePrompt,
          script,
          scenes: data
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('characters');
    setCharacters([]);
    setSelectedCharacter(null);
    setManualAge('65');
    setManualGender('Male');
    setManualRole('');
    setManualCountry('Sri Lanka');
    setManualLanguage('Sinhala');
    setLocations([]);
    setSelectedLocation(null);
    setImagePrompt(null);
    setTopics([]);
    setSelectedTopic(null);
    setScript(null);
    setScenes([]);
  };

  const handleDownload = () => {
    const content = `CINEMATIC LIFE STORY GENERATOR BY THAMODA - PRODUCTION BREAKDOWN\n\n` +
      `CHARACTER: ${selectedCharacter?.name} (${selectedCharacter?.role})\n` +
      `LOCATION: ${selectedLocation}\n\n` +
      `IMAGE PROMPT:\n${imagePrompt?.prompt}\n\n` +
      `NEGATIVE PROMPT:\n${imagePrompt?.negative_prompt}\n\n` +
      `NATIVE SCRIPT (${selectedCharacter?.language}):\n${script?.native}\n\n` +
      `ENGLISH TRANSLATION:\n${script?.english}\n\n` +
      `SCENES:\n` +
      scenes.map((s, i) => `SCENE 0${i+1}\nSCRIPT: ${s.scriptLine}\nPROMPT: ${s.characterDescription}\nCAMERA: ${s.camera}\nENVIRONMENT: ${s.environment}`).join('\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-breakdown-${selectedCharacter?.name?.toLowerCase().replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadFromHistory = (item: any) => {
    setSelectedCharacter(item.character);
    setSelectedLocation(item.location);
    setImagePrompt(item.imagePrompt);
    setScript(item.script);
    setScenes(item.scenes);
    setStep('scenes');
    setShowHistory(false);
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] transition-colors duration-500">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#141414]/[0.02] rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#141414]/[0.03] rounded-full blur-[100px]"></div>
        <div className="absolute inset-0 opacity-[0.02]" 
             style={{ backgroundImage: 'radial-gradient(#141414 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      </div>

      {/* Header */}
      <header className="border-b border-[#141414]/10 p-6 flex justify-between items-center sticky top-0 bg-[#E4E3E0]/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.5 }}
            className="w-12 h-12 bg-[#141414] text-[#E4E3E0] flex items-center justify-center rounded-full shadow-lg"
          >
            <Sparkles className="w-6 h-6" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">Cinematic Life Story</h1>
            <p className="text-[9px] font-mono opacity-50 uppercase tracking-[0.3em] mt-1">By Thamoda • Narrative Engine v2.0</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button 
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 px-4 py-2.5 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all text-[10px] font-bold uppercase tracking-widest"
              >
                <HistoryIcon className="w-3.5 h-3.5" />
                History
              </button>
              <button 
                onClick={handleLogout}
                className="p-2.5 border border-[#141414] hover:bg-red-600 hover:text-white transition-all"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsLoginMode(true)}
              className="flex items-center gap-2 px-4 py-2.5 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all text-[10px] font-bold uppercase tracking-widest"
            >
              <LogIn className="w-3.5 h-3.5" />
              Login
            </button>
          )}

          <button 
            onClick={reset}
            className="group flex items-center gap-2 px-5 py-2.5 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all text-[10px] font-bold uppercase tracking-widest"
          >
            <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
            Restart
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 lg:p-16 relative z-10">
        {/* Auth Overlay */}
        {!user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#E4E3E0]/90 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md p-10 border border-[#141414] bg-white shadow-2xl space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black uppercase tracking-tighter">{isLoginMode ? 'Welcome Back' : 'Create Account'}</h2>
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-40">Access your cinematic history</p>
              </div>

              <form onSubmit={handleAuth} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest opacity-40">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                    <input 
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-[#141414]/5 border border-[#141414]/10 focus:border-[#141414] outline-none text-sm font-bold tracking-tight text-[#141414]"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest opacity-40">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-4 bg-[#141414]/5 border border-[#141414]/10 focus:border-[#141414] outline-none text-sm font-bold tracking-tight text-[#141414]"
                      placeholder="••••••••"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 hover:opacity-100 transition-opacity"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authError && (
                  <p className="text-[10px] font-mono text-red-600 uppercase tracking-widest bg-red-50 p-3 border border-red-200">
                    {authError}
                  </p>
                )}

                <button 
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-4 bg-[#141414] text-[#E4E3E0] text-[10px] font-bold uppercase tracking-widest hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isLoginMode ? <LogIn className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
                  {isLoginMode ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <div className="text-center pt-4">
                <button 
                  onClick={() => setIsLoginMode(!isLoginMode)}
                  className="text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                >
                  {isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* History Overlay */}
        <AnimatePresence>
          {showHistory && (
            <div className="fixed inset-0 z-50 flex items-center justify-end p-6 bg-[#141414]/40 backdrop-blur-sm">
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-full max-w-xl h-full bg-[#E4E3E0] border-l border-[#141414] shadow-2xl flex flex-col"
              >
                <div className="p-8 border-b border-[#141414]/10 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <HistoryIcon className="w-5 h-5" />
                    <h2 className="text-xl font-black uppercase tracking-tighter">Generation History</h2>
                  </div>
                  <button 
                    onClick={() => setShowHistory(false)}
                    className="p-2 hover:bg-[#141414]/5 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                  {loadingHistory ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-[10px] font-mono uppercase tracking-widest">Retrieving records...</span>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-20 opacity-40">
                      <p className="text-[10px] font-mono uppercase tracking-widest">No generations found</p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        className="group p-6 border border-[#141414]/10 bg-white/40 hover:bg-[#141414] hover:text-[#E4E3E0] transition-all cursor-pointer space-y-4"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-mono uppercase tracking-widest opacity-50 group-hover:opacity-100">
                            {new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString()}
                          </span>
                          <ChevronRight className="w-4 h-4 opacity-20 group-hover:opacity-100" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-tight">{item.character.name}</h3>
                          <p className="text-[10px] font-mono opacity-50 group-hover:opacity-100 uppercase tracking-widest mt-1">{item.location}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Progress Navigation */}
        <nav className="mb-20 flex items-center justify-between border-b border-[#141414]/10 pb-8 overflow-x-auto gap-8 no-scrollbar">
          {(['characters', 'locations', 'imagePrompt', 'topics', 'script', 'scenes'] as Step[]).map((s, idx) => {
            const isActive = step === s;
            const steps = ['characters', 'locations', 'imagePrompt', 'topics', 'script', 'scenes'] as Step[];
            const isPast = steps.indexOf(step) > idx;
            
            return (
              <div key={s} className="flex items-center gap-4 shrink-0">
                <button 
                  onClick={() => isPast && setStep(s)}
                  disabled={!isPast}
                  className={`flex flex-col gap-1 transition-all duration-500 text-left ${isActive ? 'opacity-100 translate-y-0' : (isPast ? 'opacity-60 hover:opacity-100' : 'opacity-20 translate-y-1')}`}
                >
                  <span className="font-mono text-[9px] font-bold tracking-widest">STEP 0{idx + 1}</span>
                  <span className={`text-xs font-black uppercase tracking-[0.2em] ${isActive ? 'text-[#141414]' : 'text-[#141414]/40'}`}>
                    {s.replace(/([A-Z])/g, ' $1')}
                  </span>
                  {isActive && <motion.div layoutId="activeStep" className="h-0.5 bg-[#141414] mt-1" />}
                </button>
                {idx < 5 && <ChevronRight className="w-3 h-3 opacity-10" />}
              </div>
            );
          })}
        </nav>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-12">
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="w-32 h-32 border-t-2 border-b-2 border-[#141414] rounded-full opacity-20"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin opacity-40" />
              </div>
            </div>
            <div className="text-center space-y-4">
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="font-serif italic text-4xl opacity-80 tracking-tight"
              >
                Gathering the threads of a lifetime...
              </motion.p>
              <p className="text-[10px] font-mono uppercase tracking-[0.5em] opacity-40">AI Engine Processing • High Fidelity Mode</p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 'characters' && (
                <div className="space-y-16">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-[#141414]/10 pb-12">
                    <div className="space-y-4">
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2"
                      >
                        <span className="px-2 py-1 bg-[#141414] text-[#E4E3E0] text-[9px] font-mono font-bold uppercase tracking-widest">Phase 01</span>
                        <span className="text-[10px] font-mono uppercase tracking-widest opacity-40">Character Creation</span>
                      </motion.div>
                      <motion.h2 
                        initial={{ scale: 1.5, y: 50, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="font-serif italic text-9xl leading-[0.8] tracking-tighter"
                      >
                        The <br/>Identity
                      </motion.h2>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={handleGenerateCharacters}
                        disabled={loading}
                        className="p-3 border border-[#141414] bg-white/50 hover:bg-[#141414] hover:text-[#E4E3E0] transition-all disabled:opacity-50"
                        title="Refresh Samples"
                      >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      </button>
                      <button 
                        onClick={() => setShowManual(!showManual)}
                        className={`px-6 py-3 border border-[#141414] text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${showManual ? 'bg-[#141414] text-[#E4E3E0]' : 'bg-white/50 hover:bg-white'}`}
                      >
                        {showManual ? <RefreshCw className="w-3 h-3" /> : <Settings2 className="w-3 h-3" />}
                        {showManual ? 'Show Samples' : 'Manual Input'}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {showManual ? (
                      <motion.div
                        key="manual"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="max-w-2xl mx-auto"
                      >
                        <form onSubmit={handleManualSubmit} className="p-12 border border-[#141414] bg-white/40 backdrop-blur-md shadow-[20px_20px_0px_0px_rgba(20,20,20,0.05)] space-y-10">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-3">
                              <label className="text-[10px] font-mono uppercase tracking-widest opacity-60">Gender</label>
                              <select 
                                value={manualGender}
                                onChange={(e) => setManualGender(e.target.value)}
                                className="w-full p-4 bg-white/50 border border-[#141414]/10 focus:border-[#141414] outline-none text-sm font-bold uppercase tracking-widest text-[#141414]"
                              >
                                <option>Male</option>
                                <option>Female</option>
                                <option>Non-Binary</option>
                                <option>Other</option>
                              </select>
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-mono uppercase tracking-widest opacity-60">Age</label>
                              <input 
                                type="number"
                                value={manualAge}
                                onChange={(e) => setManualAge(e.target.value)}
                                className="w-full p-4 bg-white/50 border border-[#141414]/10 focus:border-[#141414] outline-none text-sm font-bold text-[#141414]"
                                placeholder="Enter age..."
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-3">
                              <label className="text-[10px] font-mono uppercase tracking-widest opacity-60">Country / Culture</label>
                              <select 
                                value={manualCountry}
                                onChange={(e) => setManualCountry(e.target.value)}
                                className="w-full p-4 bg-white/50 border border-[#141414]/10 focus:border-[#141414] outline-none text-sm font-bold uppercase tracking-widest text-[#141414]"
                              >
                                {COUNTRIES.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-mono uppercase tracking-widest opacity-60">Script Language</label>
                              <select 
                                value={manualLanguage}
                                onChange={(e) => setManualLanguage(e.target.value)}
                                className="w-full p-4 bg-white/50 border border-[#141414]/10 focus:border-[#141414] outline-none text-sm font-bold uppercase tracking-widest text-[#141414]"
                              >
                                {LANGUAGES.map(l => (
                                  <option key={l} value={l}>{l}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[10px] font-mono uppercase tracking-widest opacity-60">Job Role / Profession</label>
                            <div className="flex flex-col gap-4">
                              <select 
                                onChange={(e) => setManualRole(e.target.value)}
                                className="w-full p-4 bg-white/50 border border-[#141414]/10 focus:border-[#141414] outline-none text-sm font-bold uppercase tracking-widest text-[#141414]"
                              >
                                <option value="">Select a role...</option>
                                {COMMON_ROLES.map(role => (
                                  <option key={role} value={role}>{role}</option>
                                ))}
                              </select>
                              <div className="flex items-center gap-4">
                                <div className="h-px flex-1 bg-[#141414]/10"></div>
                                <span className="text-[9px] font-mono uppercase opacity-30">OR MANUAL INPUT</span>
                                <div className="h-px flex-1 bg-[#141414]/10"></div>
                              </div>
                              <input 
                                type="text"
                                value={manualRole}
                                onChange={(e) => setManualRole(e.target.value)}
                                className="w-full p-4 bg-white/50 border border-[#141414]/10 focus:border-[#141414] outline-none text-sm font-bold text-[#141414]"
                                placeholder="Type a custom role..."
                              />
                            </div>
                          </div>

                          <button 
                            type="submit"
                            disabled={!manualRole}
                            className="w-full py-6 bg-[#141414] text-[#E4E3E0] text-xs font-black uppercase tracking-[0.3em] hover:bg-[#141414]/90 transition-all disabled:opacity-20 flex items-center justify-center gap-3"
                          >
                            Generate Story Arc <ChevronRight className="w-4 h-4" />
                          </button>
                        </form>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="samples"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                      >
                        {characters.map((char, i) => (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ scale: 1.02, y: -4 }}
                            onClick={() => handleSelectCharacter(char)}
                            className="group relative flex flex-col p-10 border border-[#141414] bg-white/40 backdrop-blur-md text-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all text-left shadow-[10px_10px_0px_0px_rgba(20,20,20,0.05)] hover:shadow-[20px_20px_0px_0px_rgba(20,20,20,0.1)]"
                          >
                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                              <User className="w-24 h-24 -mr-4 -mt-4" />
                            </div>
                            <span className="font-mono text-[10px] opacity-40 mb-8 border-b border-current/10 pb-2 w-fit">0{i + 1}</span>
                            <h3 className="text-2xl font-black uppercase tracking-tighter mb-3 leading-none group-hover:tracking-normal transition-all duration-500">{char.name}</h3>
                            <p className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-40 group-hover:opacity-80">{char.role}</p>
                            <div className="mt-10 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                              Select Role <ChevronRight className="w-3 h-3" />
                            </div>
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {step === 'locations' && (
                <div className="space-y-16">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-[#141414]/10 pb-12">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setStep('characters')}
                          className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                        >
                          <ArrowLeft className="w-3 h-3" /> Back
                        </button>
                        <span className="px-2 py-1 bg-[#141414] text-[#E4E3E0] text-[9px] font-mono font-bold uppercase tracking-widest">Phase 02</span>
                        <span className="text-[10px] font-mono uppercase tracking-widest opacity-40">{selectedCharacter?.name}</span>
                      </div>
                      <motion.h2 
                        initial={{ scale: 1.5, y: 50, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="font-serif italic text-9xl leading-[0.8] tracking-tighter"
                      >
                        The <br/>Setting
                      </motion.h2>
                    </div>
                    <div className="max-w-xs text-right hidden md:block">
                      <p className="text-sm opacity-50 leading-relaxed font-mono uppercase tracking-widest">Where does this story unfold? Choose a location that reflects their lived truth.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {locations.map((loc, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.03 }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        onClick={() => handleSelectLocation(loc)}
                        className="group p-6 border border-[#141414]/10 bg-white/40 backdrop-blur-sm hover:bg-[#141414] hover:text-[#E4E3E0] transition-all text-center flex flex-col items-center justify-center gap-4 aspect-square shadow-sm hover:shadow-xl"
                      >
                        <MapPin className="w-5 h-5 opacity-20 group-hover:opacity-100 transition-opacity" />
                        <h3 className="text-xs font-black uppercase tracking-widest leading-tight">{loc}</h3>
                        <div className="w-4 h-px bg-current opacity-20 group-hover:w-8 transition-all"></div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {step === 'imagePrompt' && imagePrompt && (
                <div className="space-y-16">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-[#141414]/10 pb-12">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setStep('locations')}
                          className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                        >
                          <ArrowLeft className="w-3 h-3" /> Back
                        </button>
                        <span className="px-2 py-1 bg-[#141414] text-[#E4E3E0] text-[9px] font-mono font-bold uppercase tracking-widest">Visual Blueprint</span>
                        <span className="text-[10px] font-mono uppercase tracking-widest opacity-40">{selectedLocation}</span>
                      </div>
                      <motion.h2 
                        initial={{ scale: 1.5, y: 50, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="font-serif italic text-9xl leading-[0.8] tracking-tighter"
                      >
                        Character <br/>Portrait
                      </motion.h2>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <button 
                        onClick={handleProceedToTopics}
                        className="bg-[#141414] text-[#E4E3E0] px-10 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 hover:shadow-2xl transition-all hover:-translate-y-1"
                      >
                        Generate Narrative <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-8 space-y-12">
                      <div className="p-12 border border-[#141414] bg-white shadow-xl relative group overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-[#141414]/5"></div>
                        <div className="absolute top-8 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={handleGenerateMainImage}
                            disabled={generatingMainImage}
                            className="flex items-center gap-2 px-4 py-2 border border-[#141414] bg-[#141414] text-[#E4E3E0] hover:bg-white hover:text-[#141414] transition-all text-[10px] font-bold uppercase tracking-widest shadow-sm disabled:opacity-50"
                          >
                            {generatingMainImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            Generate Image
                          </button>
                          <CopyButton text={imagePrompt.prompt} />
                        </div>
                        <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] opacity-30 mb-10 border-b border-[#141414]/10 pb-4">Master Image Prompt</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <p className="text-3xl leading-relaxed font-serif text-[#141414]/90 selection:bg-yellow-200">{imagePrompt.prompt}</p>
                          {mainImageUrl && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="aspect-square border border-[#141414] bg-[#141414]/5 overflow-hidden"
                            >
                              <img src={mainImageUrl} alt="Generated Portrait" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </motion.div>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-12 border border-[#141414] bg-[#141414]/5 relative group overflow-hidden">
                        <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <CopyButton text={imagePrompt.negative_prompt} label="Copy Negative" />
                        </div>
                        <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] opacity-30 mb-8">Negative Constraints</h3>
                        <p className="text-base opacity-60 leading-relaxed font-mono">{imagePrompt.negative_prompt}</p>
                      </div>

                      {/* Character Reference Sheet */}
                      <div className="space-y-8">
                        <div className="flex items-center justify-between border-b border-[#141414]/10 pb-4">
                          <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] opacity-40">Character Reference Sheet (Different Angles)</h3>
                          {loadingAngles && <Loader2 className="w-4 h-4 animate-spin opacity-40" />}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {characterAngles.map((angle, idx) => (
                            <div key={idx} className="p-8 border border-[#141414]/10 bg-white/40 backdrop-blur-sm space-y-4 group relative">
                              <div className="flex justify-between items-start">
                                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 bg-[#141414] text-[#E4E3E0]">{angle.angle}</span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleGenerateAngleImage(idx)}
                                    disabled={(angle as any).loading || angle.imageUrl}
                                    className="flex items-center gap-2 px-2 py-1 border border-[#141414] bg-[#141414] text-[#E4E3E0] hover:bg-white hover:text-[#141414] transition-all text-[9px] font-bold uppercase tracking-widest shadow-sm disabled:opacity-50"
                                  >
                                    {(angle as any).loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                                    {angle.imageUrl ? "Generated" : "Generate"}
                                  </button>
                                  <CopyButton text={angle.prompt} label="Copy Angle" className="!py-1 !px-2" />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 gap-4">
                                {angle.imageUrl && (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="aspect-video border border-[#141414]/10 bg-[#141414]/5 overflow-hidden"
                                  >
                                    <img src={angle.imageUrl} alt={angle.angle} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  </motion.div>
                                )}
                                <p className="text-xs leading-relaxed opacity-60 font-mono line-clamp-4 group-hover:line-clamp-none transition-all">{angle.prompt}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-4 space-y-12">
                      <div className="p-10 border border-[#141414] bg-white shadow-xl space-y-8">
                        <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] opacity-40 mb-6">Character Profile</h3>
                        <div className="space-y-6">
                          <div className="flex flex-col gap-1 border-b border-[#141414]/10 pb-4">
                            <span className="text-[9px] uppercase tracking-widest opacity-40">Identity</span>
                            <span className="text-lg font-black uppercase tracking-tighter">{selectedCharacter?.name}</span>
                          </div>
                          <div className="flex flex-col gap-1 border-b border-[#141414]/10 pb-4">
                            <span className="text-[9px] uppercase tracking-widest opacity-40">Origin & Language</span>
                            <span className="text-sm font-mono uppercase tracking-widest opacity-60">{selectedCharacter?.country} • {selectedCharacter?.language}</span>
                          </div>
                          <div className="flex flex-col gap-1 border-b border-[#141414]/10 pb-4">
                            <span className="text-[9px] uppercase tracking-widest opacity-40">Atmosphere</span>
                            <span className="text-sm font-mono uppercase tracking-widest opacity-60">{selectedCharacter?.role}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-10 border border-[#141414] bg-[#141414] text-[#E4E3E0] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.05] -mr-12 -mt-12">
                          <RefreshCw className="w-full h-full animate-spin-slow" />
                        </div>
                        <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] opacity-40 mb-10">Technical Specs</h3>
                        <div className="space-y-6">
                          {imagePrompt.settings && Object.entries(imagePrompt.settings).map(([key, value]) => (
                            <div key={key} className="flex flex-col gap-1.5 border-b border-white/10 pb-4 group/item">
                              <span className="text-[9px] uppercase tracking-[0.3em] opacity-40 group-hover/item:opacity-80 transition-opacity">{key.replace(/_/g, ' ')}</span>
                              <span className="text-sm font-mono font-bold tracking-tight">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 'topics' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                  <div className="lg:col-span-5 space-y-8">
                    <motion.div
                      initial={{ scale: 1.5, y: 50, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <button 
                          onClick={() => setStep('imagePrompt')}
                          className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                        >
                          <ArrowLeft className="w-3 h-3" /> Back
                        </button>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] opacity-40">Phase 04</span>
                      </div>
                      <h2 className="font-serif italic text-9xl leading-[0.8] tracking-tighter">Life <br/>Stories</h2>
                    </motion.div>
                    <p className="text-lg opacity-70 leading-relaxed font-serif italic max-w-sm">What does {selectedCharacter?.name} want to tell the world? Select a topic that resonates with their lived truth.</p>
                    <div className="pt-12">
                      <div className="h-px w-32 bg-[#141414]"></div>
                    </div>
                  </div>
                  <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {topics.map((topic, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ scale: 1.02, y: -4 }}
                        onClick={() => handleSelectTopic(topic)}
                        className="group p-10 border border-[#141414] bg-white/60 hover:bg-[#141414] hover:text-[#E4E3E0] transition-all text-left flex flex-col gap-6 relative overflow-hidden shadow-sm hover:shadow-2xl"
                      >
                        <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                          <MessageSquare className="w-32 h-32" />
                        </div>
                        <span className="font-mono text-[10px] opacity-40 mb-2 border-b border-current/10 pb-2 w-fit">0{i + 1}</span>
                        <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">{topic.title}</h3>
                        <p className="text-sm opacity-60 group-hover:opacity-80 font-serif italic leading-relaxed">{topic.description}</p>
                        <div className="mt-4 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                          Write Script <ChevronRight className="w-3 h-3" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {step === 'script' && script && (
                <div className="max-w-5xl mx-auto space-y-16">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-[#141414]/10 pb-12">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setStep('topics')}
                          className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                        >
                          <ArrowLeft className="w-3 h-3" /> Back
                        </button>
                        <span className="px-2 py-1 bg-[#141414] text-[#E4E3E0] text-[9px] font-mono font-bold uppercase tracking-widest">Final Script</span>
                        <span className="text-[10px] font-mono uppercase tracking-widest opacity-40">{selectedTopic?.title}</span>
                      </div>
                      <motion.h2 
                        initial={{ scale: 1.5, y: 50, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="font-serif italic text-9xl leading-[0.8] tracking-tighter"
                      >
                        The <br/>Monologue
                      </motion.h2>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <button 
                        onClick={handleGenerateScenes}
                        className="bg-[#141414] text-[#E4E3E0] px-10 py-4 text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 hover:shadow-2xl transition-all hover:-translate-y-1"
                      >
                        Build Video Scenes <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-12">
                    {/* Native Script */}
                    <div className="p-12 md:p-20 border border-[#141414] bg-white shadow-[30px_30px_0px_0px_rgba(20,20,20,0.05)] relative group overflow-hidden">
                      <div className="absolute top-0 right-0 w-48 h-48 opacity-[0.02] -mr-16 -mt-16">
                        <FileText className="w-full h-full" />
                      </div>
                      <div className="absolute top-10 right-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <CopyButton text={script.native} label={`Copy ${selectedCharacter?.language}`} />
                      </div>
                      <div className="space-y-12">
                        <div className="flex justify-between items-start border-b border-[#141414]/10 pb-6">
                          <div className="space-y-1">
                            <p className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-40">Native Script</p>
                            <p className="text-xl font-black uppercase tracking-tighter leading-none">{selectedCharacter?.language}</p>
                          </div>
                        </div>
                        
                        <div className="font-serif text-4xl md:text-5xl leading-[1.2] tracking-tight text-[#141414] italic relative px-8">
                          <span className="absolute -left-4 -top-8 text-[12rem] opacity-[0.03] font-serif pointer-events-none">"</span>
                          {script.native}
                          <span className="absolute -right-4 bottom-[-4rem] text-[12rem] opacity-[0.03] font-serif pointer-events-none">"</span>
                        </div>
                      </div>
                    </div>

                    {/* English Translation */}
                    <div className="p-12 md:p-20 border border-[#141414] bg-[#141414]/5 shadow-[30px_30px_0px_0px_rgba(20,20,20,0.02)] relative group overflow-hidden">
                      <div className="absolute top-10 right-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <CopyButton text={script.english} label="Copy English" />
                      </div>
                      <div className="space-y-12">
                        <div className="flex justify-between items-start border-b border-[#141414]/10 pb-6">
                          <div className="space-y-1">
                            <p className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-40">Translation</p>
                            <p className="text-xl font-black uppercase tracking-tighter leading-none">English</p>
                          </div>
                        </div>
                        
                        <div className="font-serif text-2xl md:text-3xl leading-[1.4] tracking-tight text-[#141414]/70 italic relative px-8">
                          {script.english}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-12 border-t border-[#141414]/10 flex justify-between items-center">
                    <div className="flex gap-12">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-mono opacity-40 uppercase tracking-[0.3em]">Estimated Duration</span>
                        <span className="text-sm font-bold font-mono tracking-tight">~60.0s</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-mono opacity-40 uppercase tracking-[0.3em]">Speech Cadence</span>
                        <span className="text-sm font-bold font-mono tracking-tight">Deliberate / Rhythmic</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[9px] font-mono opacity-40 uppercase tracking-[0.3em]">Lexical Density</span>
                      <span className="text-sm font-bold font-mono tracking-tight">{script.native.split(' ').length} Tokens</span>
                    </div>
                  </div>
                </div>
              )}

              {step === 'scenes' && (
                <div className="space-y-20">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-[#141414]/10 pb-12">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setStep('script')}
                          className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                        >
                          <ArrowLeft className="w-3 h-3" /> Back
                        </button>
                        <span className="px-2 py-1 bg-[#141414] text-[#E4E3E0] text-[9px] font-mono font-bold uppercase tracking-widest">Production Guide</span>
                        <span className="text-[10px] font-mono uppercase tracking-widest opacity-40">Google Veo / Flow Optimized</span>
                      </div>
                      <h2 className="font-serif italic text-7xl leading-[0.85] tracking-tighter">Scene <br/>Breakdown</h2>
                    </div>
                      <div className="flex flex-wrap gap-4">
                        <button 
                          onClick={handleDownload}
                          className="px-6 py-3 border border-[#141414] text-[10px] font-bold uppercase tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-all flex items-center gap-2"
                        >
                          <FileText className="w-3.5 h-3.5" /> Download Breakdown
                        </button>
                        <CopyButton 
                          label="Copy All Scenes"
                          text={scenes.map((s, i) => `SCENE 0${i+1}\nSCRIPT: ${s.scriptLine}\nPROMPT: ${s.imagePrompt || s.characterDescription}\nCAMERA: ${s.camera}\nENVIRONMENT: ${s.environment}`).join('\n\n---\n\n')} 
                        />
                      </div>
                  </div>

                  <div className="space-y-32">
                    {scenes.map((scene, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-16 group"
                      >
                        <div className="lg:col-span-3">
                          <div className="sticky top-32 space-y-10">
                            <div className="flex items-center gap-5">
                              <span className="w-16 h-16 bg-[#141414] text-[#E4E3E0] flex items-center justify-center text-3xl font-black shadow-[10px_10px_0px_0px_rgba(20,20,20,0.1)]">
                                {i + 1}
                              </span>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] opacity-40">Sequence</span>
                                <span className="text-sm font-black uppercase tracking-[0.2em]">Scene 0{i + 1}</span>
                              </div>
                            </div>
                            <div className="space-y-8 border-l-2 border-[#141414] pl-8 py-2">
                              <div className="space-y-1.5">
                                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 block">Timing</span>
                                <span className="text-sm font-bold font-mono">{scene.estimatedDuration} Seconds</span>
                              </div>
                              <div className="space-y-1.5">
                                <span className="text-[9px] font-bold uppercase tracking-widest opacity-40 block">Camera</span>
                                <span className="text-sm font-bold font-mono uppercase tracking-tighter">{scene.camera}</span>
                              </div>
                            </div>
                            <div className="pt-4">
                              <CopyButton 
                                label="Copy Prompt"
                                text={`SCENE ${i+1}\nSCRIPT: ${scene.scriptLine}\nPROMPT: ${scene.imagePrompt || scene.characterDescription}\nENVIRONMENT: ${scene.environment}`} 
                              />
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-9 space-y-12">
                          <div className="p-16 bg-white/60 backdrop-blur-xl border border-[#141414]/5 shadow-[30px_30px_0px_0px_rgba(20,20,20,0.02)] relative overflow-hidden group/card">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#141414]/10 group-hover/card:bg-[#141414] transition-colors"></div>
                            <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.5em] opacity-30 mb-10">Dialogue / Voiceover</h4>
                            <p className="text-4xl font-serif italic leading-relaxed tracking-tight text-[#141414] selection:bg-[#141414] selection:text-[#E4E3E0]">"{scene.scriptLine}"</p>
                          </div>

                          {scene.imagePrompt && (
                            <div className="p-12 bg-[#141414] text-[#E4E3E0] relative group/prompt overflow-hidden">
                              <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover/prompt:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleGenerateSceneVideo(i)}
                                  disabled={scene.generatingVideo || scene.videoUrl}
                                  className="flex items-center gap-2 px-4 py-2 border border-white/20 bg-white/10 text-white hover:bg-white hover:text-[#141414] transition-all text-[10px] font-bold uppercase tracking-widest shadow-sm disabled:opacity-50"
                                >
                                  {scene.generatingVideo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                                  {scene.videoUrl ? "Video Ready" : "Generate Video"}
                                </button>
                                <CopyButton text={scene.imagePrompt} label="Copy Scene Prompt" className="!bg-white/10 !border-white/20 !text-white" />
                              </div>
                              <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.5em] opacity-30 mb-8">Scene Image Prompt</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <p className="text-lg font-mono leading-relaxed opacity-80">{scene.imagePrompt}</p>
                                {scene.videoUrl && (
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="aspect-video border border-white/20 bg-white/5 overflow-hidden"
                                  >
                                    <video src={scene.videoUrl} controls className="w-full h-full object-cover" />
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-8">
                              <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] opacity-40 border-b border-[#141414]/10 pb-3">Visual Direction</h4>
                              <div className="space-y-6">
                                <div className="space-y-3">
                                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Character State</span>
                                  <p className="text-base leading-relaxed font-serif italic opacity-80">{scene.characterDescription}</p>
                                </div>
                                <div className="p-6 bg-white/40 backdrop-blur-sm border border-[#141414]/5">
                                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Micro-Expression</span>
                                  <p className="text-sm leading-relaxed opacity-70 italic">{scene.expressionMicroMovement?.eyes} — {scene.expressionMicroMovement?.overall}</p>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-8">
                              <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.4em] opacity-40 border-b border-[#141414]/10 pb-3">Atmosphere</h4>
                              <div className="space-y-6">
                                <div className="space-y-3">
                                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">Environment</span>
                                  <p className="text-base leading-relaxed font-serif italic opacity-80">{scene.environment}</p>
                                </div>
                                <div className="p-8 bg-[#141414] text-[#E4E3E0] shadow-xl space-y-6 relative overflow-hidden">
                                  <div className="absolute top-0 right-0 w-24 h-24 opacity-[0.05] -mr-8 -mt-8">
                                    <Sparkles className="w-full h-full" />
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Voice Delivery</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-[11px] font-mono">
                                    <div className="flex flex-col gap-1">
                                      <span className="opacity-40 uppercase text-[8px]">Pace</span> 
                                      <span className="font-bold uppercase tracking-tighter border-b border-white/10 pb-1">{scene.voiceDirection?.pace}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className="opacity-40 uppercase text-[8px]">Texture</span> 
                                      <span className="font-bold uppercase tracking-tighter border-b border-white/10 pb-1">{scene.voiceDirection?.texture}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className="opacity-40 uppercase text-[8px]">Tone</span> 
                                      <span className="font-bold uppercase tracking-tighter border-b border-white/10 pb-1">{scene.voiceDirection?.tone}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className="opacity-40 uppercase text-[8px]">Delivery</span> 
                                      <span className="font-bold uppercase tracking-tighter border-b border-white/10 pb-1">{scene.voiceDirection?.delivery}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Final Footer */}
      <footer className="mt-40 border-t border-[#141414] p-20 bg-[#141414] text-[#E4E3E0]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-3xl font-black uppercase tracking-tighter">Cinematic Life Story Generator by Thamoda</h2>
            <p className="text-xs opacity-40 max-w-xs leading-relaxed">A specialized engine for generating high-fidelity character narratives and production-ready prompts.</p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-4">
            <div className="flex gap-6">
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-30">v2.1.0 Stable</span>
              <span className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-30">Gemini 3.1 Pro</span>
            </div>
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-20">© 2026 • Built by Thamoda</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
