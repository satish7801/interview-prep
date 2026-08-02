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

  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const segmentsRef = useRef<SpeechSegment[]>([]);
  const isPlayingRef = useRef(false);
  const rateRef = useRef(1);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

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
      let filtered = allVoices.filter(v => v.lang.toLowerCase().includes("en"));
      if (filtered.length === 0) {
        filtered = allVoices;
      }
      
      // Sort: female voices first, then others
      filtered = [...filtered].sort((a, b) => {
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
          const firstFemale = filtered.find(v => isLikelyFemale(v.name));
          const defaultVoice = firstFemale || filtered[0];
          setSelectedVoiceName(defaultVoice.name);
          selectedVoiceRef.current = defaultVoice;
        }
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
      stopSpeech();
    };
  }, []);

  // Build narration script with smart complexity pauses
  function buildSegments(): SpeechSegment[] {
    const list: SpeechSegment[] = [];

    // Title
    list.push({
      id: "intro",
      label: "Intro & Overview",
      text: `Welcome to Day ${day.n} of ${trackName}. Today's topic is: ${day.title}.`,
      pauseAfterMs: 1200,
    });

    // Explanation
    if (day.exp) {
      list.push({
        id: "explanation",
        label: "Core Explanation",
        text: day.exp,
        pauseAfterMs: 1800,
      });
    }

    // Key concepts (higher complexity -> 1.5s pause per point)
    if (day.pts && day.pts.length > 0) {
      day.pts.forEach((pt, i) => {
        list.push({
          id: `concept-${i}`,
          label: `Key Concept ${i + 1}`,
          text: `Point ${i + 1}: ${pt}`,
          pauseAfterMs: 1600,
        });
      });
    }

    // Code example (highest complexity -> 2.5s pause)
    if (day.code) {
      list.push({
        id: "code",
        label: "Code Example",
        text: "Here is the key code snippet to remember. Pay attention to the logic.",
        pauseAfterMs: 1200,
      });
      // Break code into logical chunks for better reading
      const codeLines = day.code.trim().split("\n").filter((l) => l.trim().length > 0);
      const codeText = codeLines.slice(0, 8).join(". ");
      list.push({
        id: "code-body",
        label: "Code Breakdown",
        text: codeText,
        pauseAfterMs: 2500,
      });
    }

    // Interview Playbook STAR story & opening script
    if (day.interviewPlaybook) {
      if (day.interviewPlaybook.openingScript) {
        list.push({
          id: "opening-script",
          label: "30-Sec Pitch",
          text: `Here is your 30-second interview opening script: ${day.interviewPlaybook.openingScript}`,
          pauseAfterMs: 2000,
        });
      }
      if (day.interviewPlaybook.incidentStory) {
        list.push({
          id: "incident-story",
          label: "Production Incident Story",
          text: `Real world scenario: ${day.interviewPlaybook.incidentStory}`,
          pauseAfterMs: 2000,
        });
      }
    }

    // Outro
    list.push({
      id: "outro",
      label: "Lesson Complete",
      text: `That completes Day ${day.n}. Review your flashcards and take notes when you're ready!`,
      pauseAfterMs: 1000,
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
  }

  function speakSegment(index: number, segments: SpeechSegment[]) {
    if (!isPlayingRef.current || index >= segments.length) {
      stopSpeech();
      return;
    }

    setCurrentSegmentIdx(index);
    const seg = segments[index];
    setCurrentSegLabel(seg.label);
    setCurrentSegText(seg.text);

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

    utterance.onend = () => {
      if (!isPlayingRef.current) return;
      // Pause based on segment complexity before next item
      const delay = Math.round(seg.pauseAfterMs / rateRef.current);
      timeoutRef.current = setTimeout(() => {
        speakSegment(index + 1, segments);
      }, delay);
    };

    utterance.onerror = (e) => {
      console.error("Speech error:", e);
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

  if (!supported) return null;

  return (
    <div className="audio-explainer-card">
      <div className="audio-explainer-header">
        <div className="audio-explainer-title">
          <span className="audio-icon">🎙️</span>
          <div>
            <h3>Lazy Mode: Daily Video-Style Explainer</h3>
            <p className="audio-subtitle">
              Sit back and listen. Includes smart pauses for code & complex concepts.
            </p>
          </div>
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
        <div className="audio-status">
          <span className="pulse-dot"></span>
          <span className="status-label">Narrating ({currentSegLabel}):</span>
          <span className="status-text">{currentSegText}</span>
        </div>
      )}
    </div>
  );
}
