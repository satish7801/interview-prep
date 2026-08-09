"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getTrackColor } from "@/data/tracks";
import { useManifest, usePart } from "@/hooks/useContent";
import { useProgress } from "@/context/ProgressContext";
import { formatInline } from "@/lib/format";
import CodeBlock from "./CodeBlock";
import ContentStatus from "./ContentStatus";
import FlashcardGrid from "./FlashcardGrid";
import VizBlock from "./VizBlock";
import AudioExplainer from "./AudioExplainer";

interface CodeSection {
  title: string;
  code: string;
}

function renderGeminiResponse(text: string) {
  if (!text) return null;
  const sections = text.split("\n\n").filter(s => s.trim().length > 0);
  
  return sections.map((sec, idx) => {
    const trimmed = sec.trim();
    if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
      const lines = trimmed.split("\n");
      const code = lines.slice(1, -1).join("\n");
      return (
        <div key={idx} style={{ margin: "12px 0" }}>
          <CodeBlock code={code} />
        </div>
      );
    }
    
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items = trimmed.split("\n").map(line => line.replace(/^[-*]\s+/, ""));
      return (
        <ul key={idx} className="gemini-list" style={{ paddingLeft: "20px", margin: "8px 0", listStyleType: "disc" }}>
          {items.map((item, i) => (
            <li key={i} style={{ marginBottom: "4px", fontSize: "13.5px", color: "#f4fbf7" }}>{formatInline(item)}</li>
          ))}
        </ul>
      );
    }
    
    return (
      <p key={idx} className="gemini-para" style={{ fontSize: "13.5px", lineHeight: "1.6", margin: "8px 0", color: "#f4fbf7", fontFamily: "Courier New, monospace" }}>
        {formatInline(trimmed)}
      </p>
    );
  });
}

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
    const cleanCode = sec.code.toLowerCase();
    
    // 1. Backtick terms (e.g. `COUNT(*)`) inside the title or the code body
    if (backticks.some(bt => 
      cleanTitle.includes(bt) || bt.includes(cleanTitle) || cleanCode.includes(bt)
    )) return true;
    
    // 2. Bold terms in the title or the code body
    if (boldTerms.some(bt => 
      cleanTitle.includes(bt) || bt.includes(cleanTitle) || cleanCode.includes(bt)
    )) return true;
    
    // 3. Match SQL keywords/concepts in both the point and the section (title or code body)
    const keywords = [
      "join", "apply", "exists", "isnull", "coalesce", "nullif", "try_convert", "try_cast", 
      "rollup", "cube", "grouping", "string_agg", "having", "group by", "where", "window", 
      "rank", "partition", "cte", "lead", "lag", "index", "statistics", "tempdb", "lock", 
      "transaction", "isolation", "count", "sum", "avg", "min", "max"
    ];
    
    for (const kw of keywords) {
      if (cleanPt.includes(kw) && (cleanTitle.includes(kw) || cleanCode.includes(kw))) {
        return true;
      }
    }
    
    // 4. Word-based matching with the title
    const words = cleanTitle.split(/\s+/).filter(w => w.length > 3);
    const matches = words.filter(w => cleanPt.includes(w));
    if (matches.length >= 2) return true;
    
    return false;
  });
}

type Props = {
  trackId: string;
  dayN: number;
};

export default function DayContent({ trackId, dayN }: Props) {
  const {
    data: manifest,
    loading: manifestLoading,
    error: manifestError,
  } = useManifest(trackId);
  const { data: day, loading: partLoading, error: partError } = usePart(
    trackId,
    dayN,
  );
  const { isDayDone, toggleDayDone, getNote, setNote, hydrated } = useProgress();

  const [apiKey, setApiKey] = useState<string>("");
  const [inputIdx, setInputIdx] = useState<number | null>(null);
  const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({});
  const [geminiReplies, setGeminiReplies] = useState<Record<number, string>>({});
  const [isSpeakingGemini, setIsSpeakingGemini] = useState<Record<number, boolean>>({});

  const [overallReply, setOverallReply] = useState<string>("");
  const [overallLoading, setOverallLoading] = useState<boolean>(false);
  const [isSpeakingOverall, setIsSpeakingOverall] = useState<boolean>(false);
  const [showOverallInput, setShowOverallInput] = useState<boolean>(false);
  const [isExplainingAll, setIsExplainingAll] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setApiKey(process.env.NEXT_PUBLIC_GEMINI_API_KEY || localStorage.getItem("gemini_api_key") || "");
    }
  }, []);

  // Reset replies when track or day changes
  useEffect(() => {
    setGeminiReplies({});
    setLoadingMap({});
    setIsSpeakingGemini({});
    setOverallReply("");
    setOverallLoading(false);
    setIsSpeakingOverall(false);
    setInputIdx(null);
    setShowOverallInput(false);
  }, [trackId, dayN]);

  // Handler to explain all points sequentially
  const handleExplainAllPoints = async () => {
    const activeKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || localStorage.getItem("gemini_api_key") || apiKey;
    if (!activeKey) {
      setInputIdx(0);
      return;
    }
    if (!day || !day.pts) return;

    setIsExplainingAll(true);
    for (let i = 0; i < day.pts.length; i++) {
      if (geminiReplies[i]) continue;
      await handleAskGemini(i, day.pts[i], "explain");
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    setIsExplainingAll(false);
  };

  // Auto explain all on mount/load if API key is present
  useEffect(() => {
    let active = true;
    const activeKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || localStorage.getItem("gemini_api_key") || apiKey;
    if (activeKey && day && day.pts) {
      const pts = day.pts;
      const run = async () => {
        setIsExplainingAll(true);
        for (let i = 0; i < pts.length; i++) {
          if (!active) break;
          if (geminiReplies[i]) continue;
          await handleAskGemini(i, pts[i], "explain");
          await new Promise(resolve => setTimeout(resolve, 400));
        }
        if (active) setIsExplainingAll(false);
      };
      run();
    }
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, apiKey]);

  const handleSaveLocalKey = (key: string) => {
    localStorage.setItem("gemini_api_key", key);
    setApiKey(key);
    setInputIdx(null);
    setShowOverallInput(false);
  };

  const handleAskGemini = async (index: number, conceptText: string, mode: "explain" | "example") => {
    const activeKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || localStorage.getItem("gemini_api_key") || apiKey;
    if (!activeKey) {
      setInputIdx(index);
      return;
    }

    setLoadingMap(prev => ({ ...prev, [index]: true }));
    try {
      let promptText = "";
      if (mode === "explain") {
        promptText = `You are a friendly and expert SQL coach. Please explain the SQL concept: "${conceptText}" in simple terms so it is fully understandable for beginners. Explain it conceptually like you are drawing diagrams on a blackboard. Do not write queries here. Output in clean Markdown.`;
      } else {
        promptText = `You are a friendly and expert SQL coach. Please provide a clear, beginner-friendly SQL query example illustrating the concept: "${conceptText}". Use simple tables. Explain step-by-step how the query works. Output in clean Markdown.`;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: promptText
                  }
                ]
              }
            ]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";
      setGeminiReplies(prev => ({ ...prev, [index]: reply }));
    } catch (err) {
      console.error(err);
      setGeminiReplies(prev => ({ ...prev, [index]: `Failed to get explanation: ${err instanceof Error ? err.message : 'Unknown error'}` }));
    } finally {
      setLoadingMap(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleAskGeminiOverall = async (mode: "explain" | "example") => {
    if (!day) return;
    const activeKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || localStorage.getItem("gemini_api_key") || apiKey;
    if (!activeKey) {
      setShowOverallInput(true);
      return;
    }

    setOverallLoading(true);
    try {
      let promptText = "";
      if (mode === "explain") {
        promptText = `You are a friendly and expert SQL coach. Please give me a detailed, simplified overview of today's lesson: "${day.title}". The context is: "${day.exp || ''}". Explain the concepts conceptually like you are teaching a classroom using a blackboard. Output in clean Markdown.`;
      } else {
        promptText = `You are a friendly and expert SQL coach. Please provide a comprehensive SQL script example representing the core of today's lesson: "${day.title}". Include comments and explain the queries clearly. Output in clean Markdown.`;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: promptText
                  }
                ]
              }
            ]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";
      setOverallReply(reply);
    } catch (err) {
      console.error(err);
      setOverallReply(`Failed to get explanation: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setOverallLoading(false);
    }
  };

  const speakGeminiReply = (index: number, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    
    const synth = window.speechSynthesis;
    
    if (isSpeakingGemini[index]) {
      synth.cancel();
      setIsSpeakingGemini(prev => ({ ...prev, [index]: false }));
      return;
    }
    
    synth.cancel();
    const cleanText = text
      .replace(/```[\s\S]*?```/g, "Code example shown on blackboard.")
      .replace(/[*#`_-]/g, "");
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = synth.getVoices();
    const defaultVoice = voices.find(v => v.lang.toLowerCase().includes("en-in")) 
      || voices.find(v => v.lang.toLowerCase().includes("en"));
    if (defaultVoice) utterance.voice = defaultVoice;
    
    utterance.onend = () => {
      setIsSpeakingGemini(prev => ({ ...prev, [index]: false }));
    };
    
    utterance.onerror = () => {
      setIsSpeakingGemini(prev => ({ ...prev, [index]: false }));
    };
    
    setIsSpeakingGemini(prev => ({ ...prev, [index]: true }));
    synth.speak(utterance);
  };

  const speakOverallReply = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    
    const synth = window.speechSynthesis;
    
    if (isSpeakingOverall) {
      synth.cancel();
      setIsSpeakingOverall(false);
      return;
    }
    
    synth.cancel();
    const cleanText = text
      .replace(/```[\s\S]*?```/g, "Code example shown on blackboard.")
      .replace(/[*#`_-]/g, "");
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = synth.getVoices();
    const defaultVoice = voices.find(v => v.lang.toLowerCase().includes("en-in")) 
      || voices.find(v => v.lang.toLowerCase().includes("en"));
    if (defaultVoice) utterance.voice = defaultVoice;
    
    utterance.onend = () => {
      setIsSpeakingOverall(false);
    };
    
    utterance.onerror = () => {
      setIsSpeakingOverall(false);
    };
    
    setIsSpeakingOverall(true);
    synth.speak(utterance);
  };

  const loading = !hydrated || manifestLoading || partLoading;
  const error = manifestError || partError;

  if (loading || error || !manifest || !day) {
    return (
      <ContentStatus loading={loading} error={error} label="lesson" />
    );
  }

  const color = getTrackColor(manifest.color);
  const done = isDayDone(trackId, dayN);
  const idx = manifest.parts.findIndex((p) => p.n === dayN);
  const prevDay = idx > 0 ? manifest.parts[idx - 1].n : undefined;
  const nextDay =
    idx >= 0 && idx < manifest.parts.length - 1
      ? manifest.parts[idx + 1].n
      : undefined;

  return (
    <article className="day-page" style={{ ["--tc" as string]: color }}>
      <nav className="crumbs">
        <Link href="/">Paths</Link>
        <span>/</span>
        <Link href={`/paths/${trackId}`}>{manifest.name}</Link>
        <span>/</span>
        <span>Day {day.n}</span>
      </nav>

      <header className="day-page-hero">
        <div className="day-page-hero-row">
          <span className="day-badge">Day {day.n}</span>
          <button
            type="button"
            className={`done-toggle${done ? " on" : ""}`}
            onClick={() => toggleDayDone(trackId, day.n)}
          >
            {done ? "Completed" : "Mark complete"}
          </button>
        </div>
        <h1>{day.title}</h1>
        {day.exp && <p className="lede">{formatInline(day.exp)}</p>}
      </header>

      <AudioExplainer day={day} trackName={manifest.name} />

      {/* Gemini AI Topic Assistant Card */}
      <div className="overall-gemini-card">
        <div className="overall-gemini-header">
          <div className="overall-gemini-title">
            <span className="gemini-icon">✨</span>
            <div>
              <h3>AI Topic Assistant</h3>
              <p className="gemini-subtitle">
                Ask Gemini to explain the entire day&apos;s topic or generate a comprehensive SQL script.
              </p>
            </div>
          </div>
          <div className="overall-gemini-actions">
            <button
              type="button"
              className="gemini-btn"
              onClick={() => handleAskGeminiOverall("explain")}
              disabled={overallLoading}
            >
              📖 Simplify Whole Topic
            </button>
            <button
              type="button"
              className="gemini-btn"
              onClick={() => handleAskGeminiOverall("example")}
              disabled={overallLoading}
            >
              💡 Overall SQL Example
            </button>
            {overallReply && (
              <button
                type="button"
                className={`gemini-speak-btn ${isSpeakingOverall ? "active" : ""}`}
                onClick={() => speakOverallReply(overallReply)}
              >
                {isSpeakingOverall ? "⏸ Stop Voice" : "🔊 Listen"}
              </button>
            )}
          </div>
        </div>

        {showOverallInput && !apiKey && (
          <div className="gemini-key-input-box" style={{ marginTop: "14px" }}>
            <p className="gemini-input-tip">
              Provide a Google Gemini API Key. It will be stored locally in your browser.
            </p>
            <div className="gemini-input-row">
              <input
                type="password"
                placeholder="AIzaSy..."
                className="gemini-key-input"
                id="overall-key-input"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveLocalKey((e.target as HTMLInputElement).value);
                  }
                }}
              />
              <button
                type="button"
                className="gemini-save-btn"
                onClick={() => {
                  const val = (document.getElementById("overall-key-input") as HTMLInputElement)?.value;
                  if (val) handleSaveLocalKey(val);
                }}
              >
                Save
              </button>
            </div>
            <a
              href="https://aistudio.google.com/"
              target="_blank"
              rel="noreferrer"
              className="gemini-link"
            >
              Get a free API key from Google AI Studio →
            </a>
          </div>
        )}

        {overallReply && (
          <div className="gemini-blackboard-box" style={{ marginTop: "16px" }}>
            <div className="blackboard-header">
              <span className="blackboard-chalk-icon">✨</span>
              <span className="blackboard-title">AI Blackboard — Topic Masterclass</span>
            </div>
            <div className="blackboard-text">
              {renderGeminiResponse(overallReply)}
            </div>
          </div>
        )}
      </div>

      {(day.pts?.length ?? 0) > 0 && (
        <section className="content-section">
          <div className="section-header-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 className="section-label" style={{ marginBottom: 0 }}>Key concepts & SQL examples</h2>
            <button
              type="button"
              className="gemini-btn"
              onClick={handleExplainAllPoints}
              disabled={isExplainingAll}
            >
              {isExplainingAll ? "✨ Explaining all..." : "📖 Explain all points"}
            </button>
          </div>
          <div className="concept-detail-list">
            {day.pts!.map((pt, i) => {
              const matchedSecs = day.code ? findMatchingCodeSection(pt, parseCodeBlocks(day.code)) : [];
              const isSpeaking = !!isSpeakingGemini[i];
              const isLoading = !!loadingMap[i];
              const replyText = geminiReplies[i];
              const showInput = inputIdx === i;

              return (
                <div key={i} className="concept-detail-card">
                  <div className="concept-detail-header">
                    <span className="concept-number">0{i + 1}</span>
                    <p className="concept-text">{formatInline(pt)}</p>
                  </div>
                  {matchedSecs.length > 0 && (
                    <div className="concept-examples">
                      {matchedSecs.map((sec, sidx) => (
                        <div key={sidx} className="concept-example-item">
                          <span className="example-title">💡 Example: {sec.title}</span>
                          <CodeBlock code={sec.code} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Gemini AI Actions */}
                  <div className="gemini-action-section">
                    <button
                      type="button"
                      className="gemini-btn"
                      onClick={() => handleAskGemini(i, pt, "explain")}
                      disabled={isLoading}
                    >
                      📖 Explain this point
                    </button>
                    <button
                      type="button"
                      className="gemini-btn"
                      onClick={() => handleAskGemini(i, pt, "example")}
                      disabled={isLoading}
                    >
                      💡 Give query example
                    </button>
                    {replyText && (
                      <button
                        type="button"
                        className={`gemini-speak-btn ${isSpeaking ? "active" : ""}`}
                        onClick={() => speakGeminiReply(i, replyText)}
                      >
                        {isSpeaking ? "⏸ Stop Voice" : "🔊 Listen"}
                      </button>
                    )}
                  </div>

                  {showInput && !apiKey && (
                    <div className="gemini-key-input-box">
                      <p className="gemini-input-tip">
                        Provide a Google Gemini API Key. It will be stored locally in your browser.
                      </p>
                      <div className="gemini-input-row">
                        <input
                          type="password"
                          placeholder="AIzaSy..."
                          className="gemini-key-input"
                          id={`key-input-${i}`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveLocalKey((e.target as HTMLInputElement).value);
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="gemini-save-btn"
                          onClick={() => {
                            const val = (document.getElementById(`key-input-${i}`) as HTMLInputElement)?.value;
                            if (val) handleSaveLocalKey(val);
                          }}
                        >
                          Save
                        </button>
                      </div>
                      <a
                        href="https://aistudio.google.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="gemini-link"
                      >
                        Get a free API key from Google AI Studio →
                      </a>
                    </div>
                  )}

                  {replyText && (
                    <div className="gemini-blackboard-box">
                      <div className="blackboard-header">
                        <span className="blackboard-chalk-icon">✨</span>
                        <span className="blackboard-title">Gemini AI Blackboard Explanation</span>
                      </div>
                      <div className="blackboard-text">
                        {renderGeminiResponse(replyText)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {day.code && (
        <section className="content-section">
          <h2 className="section-label">Complete Practice Script</h2>
          <CodeBlock code={day.code} />
        </section>
      )}

      {(day.viz?.length ?? 0) > 0 && (
        <section className="content-section">
          <h2 className="section-label">Visualization</h2>
          <div className="viz-stack">
            {day.viz!.map((v, i) => (
              <VizBlock key={i} viz={v} />
            ))}
          </div>
        </section>
      )}

      {day.interviewPlaybook && (
        <section className="content-section interview-playbook-section">
          <h2 className="section-label">Interview Playbook</h2>
          <div className="playbook-box p-4 rounded-lg bg-card border border-border space-y-4">
            <div>
              <h3 className="font-semibold text-primary mb-1">🎙️ 30-Second Opening Script</h3>
              <p className="text-sm text-foreground/90 italic">&ldquo;{day.interviewPlaybook.openingScript}&rdquo;</p>
            </div>
            <div>
              <h3 className="font-semibold text-primary mb-1">🔥 Real Production Incident (STAR Story)</h3>
              <p className="text-sm text-foreground/90">{formatInline(day.interviewPlaybook.incidentStory)}</p>
            </div>
            {(day.interviewPlaybook.whiteboardSteps?.length ?? 0) > 0 && (
              <div>
                <h3 className="font-semibold text-primary mb-1">📐 Whiteboard Execution Flow</h3>
                <ol className="list-decimal list-inside text-sm space-y-1 text-foreground/90">
                  {day.interviewPlaybook.whiteboardSteps.map((step, idx) => (
                    <li key={idx}>{formatInline(step)}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </section>
      )}

      {(day.qa?.length ?? 0) > 0 && (
        <section className="content-section">
          <h2 className="section-label">Interview flashcards</h2>
          <FlashcardGrid items={day.qa!} />
        </section>
      )}

      {(day.pr?.length ?? 0) > 0 && (
        <section className="content-section">
          <h2 className="section-label">Practice</h2>
          <div className="chip-row">
            {day.pr!.map((p) => (
              <span className="chip" key={p}>
                {p}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="content-section">
        <h2 className="section-label">My notes</h2>
        <textarea
          className="notes"
          placeholder="Notes auto-save into your progress JSON…"
          value={getNote(trackId, day.n)}
          onChange={(e) => setNote(trackId, day.n, e.target.value)}
        />
      </section>

      <footer className="day-nav">
        {prevDay ? (
          <Link className="btn" href={`/paths/${trackId}/days/${prevDay}`}>
            ← Day {prevDay}
          </Link>
        ) : (
          <span />
        )}
        <Link className="btn btn-ghost" href={`/paths/${trackId}`}>
          All days
        </Link>
        {nextDay ? (
          <Link
            className="btn btn-primary"
            href={`/paths/${trackId}/days/${nextDay}`}
            onClick={() => {
              if (!done) toggleDayDone(trackId, day.n);
            }}
          >
            Day {nextDay} →
          </Link>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (!done) toggleDayDone(trackId, day.n);
            }}
          >
            {done ? "Path day complete" : "Mark complete"}
          </button>
        )}
      </footer>
    </article>
  );
}
