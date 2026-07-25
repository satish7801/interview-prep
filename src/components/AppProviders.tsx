"use client";

import { ProgressProvider, useProgress } from "@/context/ProgressContext";
import QuizModal from "./QuizModal";
import SiteHeader from "./SiteHeader";

function QuizHost() {
  const p = useProgress();
  return (
    <QuizModal
      open={p.quizOpen}
      mode={p.quizMode}
      items={p.quizItems}
      index={p.quizIndex}
      revealed={p.quizRevealed}
      weakCount={p.weakCount}
      totalQA={p.totalQA}
      paths={p.paths}
      loading={p.quizLoading}
      error={p.quizError}
      onClose={p.closeQuiz}
      onStart={p.startQuiz}
      onReveal={() => p.setQuizRevealed(true)}
      onGotIt={() => {
        if (p.currentQuiz) p.markWeak(p.currentQuiz, false);
        p.nextQuiz();
      }}
      onStillLearning={() => {
        if (p.currentQuiz) p.markWeak(p.currentQuiz, true);
        p.nextQuiz();
      }}
      onNext={p.nextQuiz}
    />
  );
}

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProgressProvider>
      <div className="app-root">
        <SiteHeader />
        <div className="app-main">{children}</div>
        <QuizHost />
      </div>
    </ProgressProvider>
  );
}
