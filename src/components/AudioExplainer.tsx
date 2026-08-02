"use client";

import { useEffect, useRef, useState } from "react";
import { PartContent } from "@/data/types";

type AudioExplainerProps = {
  day: PartContent;
  trackName: string;
};

type SpeechSegment = {
  id: string;
  label: string;
  text: string;
  displayText?: string;
  pauseAfterMs: number; // pause length reflecting complexity
};

const isLikelyFemale = (name: string): boolean => {
  const lowercaseName = name.toLowerCase();
  const femaleKeywords = [
    "samantha", "zira", "google us english", "microsoft zira", "victoria", 
    "hazel", "susan", "karen", "moira", "tessa", "veena", "fiona", 
    "serena", "amelia", "stephanie", "zoe", "natasha", "luciana", 
    "kyoko", "tingting", "sin-ji", "mei-jia", "yuki", "siri"
  ];
  return femaleKeywords.some(keyword => lowercaseName.includes(keyword)) || lowercaseName.includes("female");
};

const getCoachName = (voiceName: string): string => {
  if (!voiceName) return "Sophia";
  const lower = voiceName.toLowerCase();
  if (lower.includes("rishi")) return "Rishi";
  if (lower.includes("raveena")) return "Raveena";
  if (lower.includes("veena")) return "Veena";
  if (lower.includes("heera")) return "Heera";
  if (lower.includes("neerja")) return "Neerja";
  if (lower.includes("samantha")) return "Samantha";
  if (lower.includes("zira")) return "Zira";
  if (lower.includes("siri")) return "Siri";
  if (lower.includes("daniel")) return "Daniel";
  if (lower.includes("karen")) return "Karen";
  if (lower.includes("moira")) return "Moira";
  
  // Clean up and extract first word
  const cleaned = voiceName.replace(/Microsoft|Google|Apple|Natural|Online|Desktop|\([^)]*\)|-|_/gi, "").trim();
  const firstWord = cleaned.split(/\s+/)[0];
  return firstWord || "Sophia";
};

interface CodeSection {
  title: string;
  code: string;
}

function parseCodeBlocks(codeText: string): CodeSection[] {
  if (!codeText) return [];
  const lines = codeText.split("\n");
  const sections: CodeSection[] = [];
  let currentTitle = "";
  let currentCodeLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const isComment = trimmed.startsWith("--") || trimmed.startsWith("//") || (trimmed.startsWith("#") && !trimmed.startsWith("#!"));
    
    if (isComment && (trimmed.includes(":") || trimmed.toLowerCase().includes("trap") || trimmed.toLowerCase().includes("fix") || trimmed.toLowerCase().includes("basics") || trimmed.toLowerCase().includes("alternative") || trimmed.toLowerCase().includes("vs") || trimmed.toLowerCase().includes("example") || trimmed.toLowerCase().includes("safe") || trimmed.length > 10)) {
      if (currentCodeLines.length > 0 || currentTitle) {
        sections.push({
          title: currentTitle || "Example",
          code: currentCodeLines.join("\n").trim()
        });
        currentCodeLines = [];
      }
      currentTitle = trimmed.replace(/^(--|\/\/|#)\s*/, "").trim();
    } else {
      currentCodeLines.push(line);
    }
  }

  if (currentCodeLines.length > 0 || currentTitle) {
    sections.push({
      title: currentTitle || "Example",
      code: currentCodeLines.join("\n").trim()
    });
  }

  return sections;
}

function findMatchingCodeSection(pt: string, sections: CodeSection[]): CodeSection[] {
  const cleanPt = pt.toLowerCase();
  const backticks = [...pt.matchAll(/`([^`]+)`/g)].map(m => m[1].toLowerCase());
  const boldTerms = [...pt.matchAll(/\*\*([^*]+)\*\*/g)].map(m => m[1].toLowerCase());
  
  return sections.filter(sec => {
    const cleanTitle = sec.title.toLowerCase();
    
    if (backticks.some(bt => cleanTitle.includes(bt) || bt.includes(cleanTitle))) return true;
    if (boldTerms.some(bt => cleanTitle.includes(bt) || bt.includes(cleanTitle))) return true;
    
    const keywords = ["join", "apply", "exists", "isnull", "coalesce", "nullif", "try_convert", "try_cast", "rollup", "cube", "grouping", "string_agg", "having", "group by", "where", "window", "rank", "partition", "cte", "lead", "lag", "index", "statistics", "tempdb", "lock", "transaction", "isolation"];
    
    for (const kw of keywords) {
      if (cleanPt.includes(kw) && cleanTitle.includes(kw)) {
        return true;
      }
    }
    
    const words = cleanTitle.split(/\s+/).filter(w => w.length > 3);
    const matches = words.filter(w => cleanPt.includes(w));
    return matches.length >= 2;
  });
}

function makeSqlNarrationReady(codeText: string): string {
  let cleanCode = codeText.replace(/--.*$/gm, "").trim();
  
  cleanCode = cleanCode
    .replace(/SELECT\s+/gi, "Select ")
    .replace(/FROM\s+/gi, " from ")
    .replace(/LEFT\s+JOIN\s+/gi, " left join ")
    .replace(/INNER\s+JOIN\s+/gi, " inner join ")
    .replace(/RIGHT\s+JOIN\s+/gi, " right join ")
    .replace(/FULL\s+OUTER\s+JOIN\s+/gi, " full outer join ")
    .replace(/CROSS\s+JOIN\s+/gi, " cross join ")
    .replace(/CROSS\s+APPLY\s+/gi, " cross apply ")
    .replace(/OUTER\s+APPLY\s+/gi, " outer apply ")
    .replace(/ON\s+/gi, " on ")
    .replace(/WHERE\s+/gi, " where ")
    .replace(/AND\s+/gi, " and ")
    .replace(/OR\s+/gi, " or ")
    .replace(/GROUP\s+BY\s+/gi, " group by ")
    .replace(/ORDER\s+BY\s+/gi, " order by ")
    .replace(/HAVING\s+/gi, " having ")
    .replace(/AS\s+/gi, " as ")
    .replace(/NULL/g, " null ")
    .replace(/!=/g, " is not equal to ")
    .replace(/=/g, " equals ")
    .replace(/\*/g, " all columns ")
    .replace(/o\./g, "orders dot ")
    .replace(/c\./g, "customers dot ")
    .replace(/e\./g, "employees dot ")
    .replace(/m\./g, "manager dot ")
    .replace(/d\./g, "department dot ")
    .replace(/\n/g, ". ");
    
  return cleanCode;
}

export default function AudioExplainer({ day, trackName }: AudioExplainerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSegmentIdx, setCurrentSegmentIdx] = useState<number>(-1);
  const [rate, setRate] = useState<number>(1);
  const [supported, setSupported] = useState<boolean>(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [currentSegLabel, setCurrentSegLabel] = useState<string>("");
  const [currentSegText, setCurrentSegText] = useState<string>("");
  const [displayedText, setDisplayedText] = useState<string>("");

  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const segmentsRef = useRef<SpeechSegment[]>([]);
  const isPlayingRef = useRef(false);
  const rateRef = useRef(1);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const blackboardRef = useRef<HTMLDivElement | null>(null);

  const coachName = getCoachName(selectedVoiceName);

  useEffect(() => {
    if (blackboardRef.current) {
      blackboardRef.current.scrollTop = blackboardRef.current.scrollHeight;
    }
  }, [displayedText]);



  // Build narration script with smart complexity pauses
  function buildSegments(): SpeechSegment[] {
    const list: SpeechSegment[] = [];

    // 1. Intro
    list.push({
      id: "intro",
      label: "Intro & Overview",
      text: `Hello, I'm ${coachName}, your AI instructor. Welcome to Day ${day.n} of ${trackName}. Today's topic is: ${day.title}. Let's write some examples on the blackboard and analyze them together.`,
      pauseAfterMs: 1600,
    });

    // 2. Core Explanation
    if (day.exp) {
      list.push({
        id: "explanation",
        label: "Core Explanation",
        text: `First, let's cover the main context: ${day.exp}`,
        pauseAfterMs: 2000,
      });
    }

    // 3. Key Concepts with detailed explanations and SQL query breakdown
    if (day.pts && day.pts.length > 0) {
      const codeSections = day.code ? parseCodeBlocks(day.code) : [];
      day.pts.forEach((pt, i) => {
        const matchedSecs = day.code ? findMatchingCodeSection(pt, codeSections) : [];
        
        let spokenText = `Point ${i + 1}: ${pt}. `;
        let visualText = `Point ${i + 1}:\n${pt}\n`;
        
        if (matchedSecs.length > 0) {
          spokenText += `Let's write the query example on the blackboard. `;
          visualText += `\nLet's write the query example on the blackboard:\n`;
          
          matchedSecs.forEach(sec => {
            spokenText += `For ${sec.title}, the SQL syntax is: ${makeSqlNarrationReady(sec.code)}. `;
            visualText += `\n-- ${sec.title}\n${sec.code}\n`;
          });
        }
        
        list.push({
          id: `concept-${i}`,
          label: `Concept ${i + 1}`,
          text: spokenText,
          displayText: visualText,
          pauseAfterMs: 2600, // longer pause for blackboard writing/reading
        });
      });
    }

    // 4. Playbook Scripts
    if (day.interviewPlaybook) {
      if (day.interviewPlaybook.openingScript) {
        list.push({
          id: "opening-script",
          label: "Interview Pitch",
          text: `If this question comes up in an interview, here is a 30-second opening script you can use: ${day.interviewPlaybook.openingScript}`,
          pauseAfterMs: 2200,
        });
      }
      if (day.interviewPlaybook.incidentStory) {
        list.push({
          id: "incident-story",
          label: "Incident STAR Story",
          text: `Here is a real production incident scenario: ${day.interviewPlaybook.incidentStory}`,
          pauseAfterMs: 2200,
        });
      }
    }

    // 5. Outro
    list.push({
      id: "outro",
      label: "Lesson Wrap-Up",
      text: `That completes our detailed blackboard session for Day ${day.n}. Make sure to review your flashcards and jot down notes. I'll see you in the next lesson!`,
      pauseAfterMs: 1500,
    });

    return list;
  }

  function stopSpeech() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSegmentIdx(-1);
    setCurrentSegLabel("");
    setCurrentSegText("");
    setDisplayedText("");
  }

  function speakSegment(index: number, segments: SpeechSegment[]) {
    if (!isPlayingRef.current || index >= segments.length) {
      stopSpeech();
      return;
    }

    setCurrentSegmentIdx(index);
    const seg = segments[index];
    setCurrentSegLabel(seg.label);
    setCurrentSegText(seg.displayText || seg.text);
    setDisplayedText(""); // Start with empty blackboard for writing effect

    const synth = window.speechSynthesis;
    synth.cancel(); // ensure clean queue

    const utterance = new SpeechSynthesisUtterance(seg.text);
    utterance.rate = rateRef.current;
    utterance.pitch = 1.0;

    // Pick selected voice or fallback to default English voice
    if (selectedVoiceRef.current) {
      utterance.voice = selectedVoiceRef.current;
    } else {
      const allVoices = synth.getVoices();
      const enVoice = allVoices.find((v) => v.lang.startsWith("en") && v.localService) || allVoices.find((v) => v.lang.startsWith("en"));
      if (enVoice) utterance.voice = enVoice;
    }

    // Word boundary mapping for dynamic blackboard chalk-writing animation
    utterance.onboundary = (event) => {
      if (event.name === "word") {
        const charIndex = event.charIndex;
        const totalLength = seg.text.length || 1;
        const ratio = Math.min(charIndex / totalLength, 1);
        
        const displaySource = seg.displayText || seg.text;
        const targetLen = Math.min(Math.floor(ratio * displaySource.length), displaySource.length);
        
        const nextSpace = displaySource.indexOf(" ", targetLen);
        const currentProgress = nextSpace !== -1 ? displaySource.substring(0, nextSpace) : displaySource;
        setDisplayedText(currentProgress);
      }
    };

    utterance.onend = () => {
      setDisplayedText(seg.displayText || seg.text); // ensure full text is written at the end
      if (!isPlayingRef.current) return;
      // Pause based on segment complexity before next item
      const delay = Math.round(seg.pauseAfterMs / rateRef.current);
      timeoutRef.current = setTimeout(() => {
        speakSegment(index + 1, segments);
      }, delay);
    };

    utterance.onerror = (e) => {
      console.error("Speech error:", e);
      setDisplayedText(seg.displayText || seg.text);
      if (isPlayingRef.current && index + 1 < segments.length) {
        speakSegment(index + 1, segments);
      } else {
        stopSpeech();
      }
    };

    activeUtteranceRef.current = utterance;
    synth.speak(utterance);
  }

  const handlePlay = () => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      isPlayingRef.current = true;
      return;
    }

    stopSpeech();
    const segs = buildSegments();
    segmentsRef.current = segs;
    isPlayingRef.current = true;
    setIsPlaying(true);
    setIsPaused(false);
    speakSegment(0, segs);
  };

  const handlePause = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
      isPlayingRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  };

  const handleSpeedChange = (newRate: number) => {
    setRate(newRate);
    rateRef.current = newRate;
    // If currently playing, restart segment at new rate
    if (isPlaying && currentSegmentIdx >= 0 && segmentsRef.current.length > 0) {
      window.speechSynthesis.cancel();
      speakSegment(currentSegmentIdx, segmentsRef.current);
    }
  };

  const handleVoiceChange = (voiceName: string) => {
    setSelectedVoiceName(voiceName);
    const voice = voices.find((v) => v.name === voiceName) || null;
    selectedVoiceRef.current = voice;
    // If currently playing, restart segment at new voice
    if (isPlaying && currentSegmentIdx >= 0 && segmentsRef.current.length > 0) {
      window.speechSynthesis.cancel();
      speakSegment(currentSegmentIdx, segmentsRef.current);
    }
  };

  // Sync refs
  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setTimeout(() => setSupported(false), 0);
      return;
    }

    const updateVoices = () => {
      const synth = window.speechSynthesis;
      if (!synth) return;
      const allVoices = synth.getVoices();
      
      // Filter for Indian English voices specifically
      let filtered = allVoices.filter(v => {
        const lang = v.lang.toLowerCase();
        const name = v.name.toLowerCase();
        return lang.includes("en-in") || name.includes("india") || name.includes("indian");
      });
      
      if (filtered.length === 0) {
        filtered = allVoices.filter(v => v.lang.toLowerCase().includes("en"));
      }
      if (filtered.length === 0) {
        filtered = allVoices;
      }
      
      // Sort: Indian English first, then female voices, then others
      filtered = [...filtered].sort((a, b) => {
        const aLang = a.lang.toLowerCase();
        const bLang = b.lang.toLowerCase();
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        const aIndian = aLang.includes("en-in") || aName.includes("india") || aName.includes("indian");
        const bIndian = bLang.includes("en-in") || bName.includes("india") || bName.includes("indian");
        
        if (aIndian && !bIndian) return -1;
        if (!aIndian && bIndian) return 1;
        
        const aFemale = isLikelyFemale(a.name);
        const bFemale = isLikelyFemale(b.name);
        if (aFemale && !bFemale) return -1;
        if (!aFemale && bFemale) return 1;
        
        return a.name.localeCompare(b.name);
      });

      setVoices(filtered);
      
      if (filtered.length > 0) {
        const active = selectedVoiceRef.current;
        const stillExists = active ? filtered.some(v => v.name === active.name) : false;
        if (!stillExists) {
          const defaultVoice = filtered[0];
          setSelectedVoiceName(defaultVoice.name);
          selectedVoiceRef.current = defaultVoice;
        }
      }
    };

    updateVoices();
    window.speechSynthesis.addEventListener("voiceschanged", updateVoices);

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
      }
      stopSpeech();
    };
  }, []);

  if (!supported) return null;

  let coachStatus = `${coachName} is idle`;
  let isWriting = false;
  if (isPlaying) {
    if (currentSegLabel.toLowerCase().includes("concept") || currentSegLabel.toLowerCase().includes("pitch") || currentSegLabel.toLowerCase().includes("story")) {
      coachStatus = `${coachName} is writing on the blackboard...`;
      isWriting = true;
    } else {
      coachStatus = `${coachName} is explaining...`;
    }
  } else if (isPaused) {
    coachStatus = `${coachName} is paused`;
  }

  return (
    <div className="audio-explainer-card">
      <div className="audio-explainer-layout">
        
        {/* AI Character Panel */}
        <div className="ai-coach-panel">
          <div className={`avatar-container ${isPlaying ? "speaking" : ""} ${isWriting ? "writing" : ""}`}>
            <img src="/ai-avatar.png" alt={`${coachName} - AI Coach`} className="ai-avatar-img" />
            <div className="mouth-overlay"></div>
            <div className="pulse-ring"></div>
            {isPlaying && (
              <div className="voice-waves">
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
              </div>
            )}
          </div>
          <div className="ai-coach-info">
            <h4 className="coach-name">{coachName}</h4>
            <span className="coach-title">AI {trackName} Instructor</span>
            <div className="coach-status">
              <span className={`status-dot ${isPlaying ? "active" : isPaused ? "paused" : ""}`}></span>
              <span className="status-lbl">{coachStatus}</span>
            </div>
          </div>
        </div>

        {/* Controls & Speech Content */}
        <div className="audio-explainer-content">
          <div className="audio-explainer-header">
            <div>
              <h3>Daily Video-Style Explainer</h3>
              <p className="audio-subtitle">
                Listen to {coachName} explain concepts and walk through query examples.
              </p>
            </div>

            <div className="audio-controls">
              {!isPlaying && !isPaused ? (
                <button type="button" className="audio-btn btn-primary" onClick={handlePlay}>
                  ▶ Play Explainer
                </button>
              ) : isPlaying ? (
                <button type="button" className="audio-btn btn-pause" onClick={handlePause}>
                  ⏸ Pause
                </button>
              ) : (
                <button type="button" className="audio-btn btn-primary" onClick={handlePlay}>
                  ▶ Resume
                </button>
              )}

              {(isPlaying || isPaused) && (
                <button type="button" className="audio-btn btn-stop" onClick={stopSpeech}>
                  ⏹ Stop
                </button>
              )}

              <div className="speed-selector">
                <span className="speed-label">Speed:</span>
                {[0.8, 1, 1.25, 1.5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`speed-btn ${rate === s ? "active" : ""}`}
                    onClick={() => handleSpeedChange(s)}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {voices.length > 0 && (
                <div className="voice-selector">
                  <span className="voice-label">Voice:</span>
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => handleVoiceChange(e.target.value)}
                    className="voice-select"
                  >
                    {voices.map((v) => {
                      const isFemale = isLikelyFemale(v.name);
                      return (
                        <option key={v.name} value={v.name}>
                          {isFemale ? "👩 " : "👨 "} {v.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>
          </div>

          {currentSegmentIdx >= 0 && (isPlaying || isPaused) && (
            <div className="blackboard-box" ref={blackboardRef}>
              <div className="blackboard-header">
                <span className="blackboard-chalk-icon">📝</span>
                <span className="blackboard-title">Blackboard — Narrating ({currentSegLabel})</span>
              </div>
              <p className="blackboard-text">
                {displayedText || currentSegText}
                {isPlaying && <span className="chalk-cursor">|</span>}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
