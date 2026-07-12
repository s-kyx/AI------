import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

function answerForQuestion(question, selection, customText) {
  if (!selection) return null;
  if (selection.kind === 'custom') {
    const text = customText.trim();
    if (!text) return null;
    return {
      question_id: question.id,
      question: question.text,
      evidence: question.evidence,
      answer: text,
    };
  }

  return {
    question_id: question.id,
    question: question.text,
    evidence: question.evidence,
    answer: selection.value,
  };
}

export default function ClarificationPanel({ session, loading, onContinue, onStop }) {
  const { questions = [], questionCount = 0 } = session;
  const [selections, setSelections] = useState({});
  const [customTexts, setCustomTexts] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    setSelections({});
    setCustomTexts({});
    setCurrentQuestionIndex(0);
  }, [questions]);

  const currentAnswers = useMemo(
    () =>
      questions
        .map((question) => answerForQuestion(question, selections[question.id], customTexts[question.id] || ''))
        .filter(Boolean),
    [customTexts, questions, selections],
  );
  const activeQuestion = questions[currentQuestionIndex];
  const activeSelection = activeQuestion ? selections[activeQuestion.id] : null;
  const activeAnswer = activeQuestion
    ? answerForQuestion(activeQuestion, activeSelection, customTexts[activeQuestion.id] || '')
    : null;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const chooseOption = (questionId, option) => {
    setSelections((current) => ({ ...current, [questionId]: { kind: 'option', value: option } }));
  };

  const chooseCustom = (questionId) => {
    setSelections((current) => ({ ...current, [questionId]: { kind: 'custom' } }));
  };

  const advance = () => {
    if (!activeAnswer) return;
    if (isLastQuestion) {
      onContinue(currentAnswers);
      return;
    }
    setCurrentQuestionIndex((current) => current + 1);
  };

  return (
    <section className="clarification-panel" aria-label="补充几个关键信息">
      <div className="clarification-heading">
        <div>
          <p>我想先确认一点点</p>
        </div>
      </div>

      <div className="clarification-questions">
        {activeQuestion ? (
          (() => {
            const isCustom = activeSelection?.kind === 'custom';
            return (
              <fieldset className="clarification-question" key={`${activeQuestion.id}-${questionCount}-${currentQuestionIndex}`} disabled={loading}>
              <legend>
                <span>关于「{activeQuestion.evidence}」</span>
                {activeQuestion.text}
              </legend>
              <div className="clarification-options">
                {activeQuestion.options.map((option) => (
                  <button
                    className={`clarification-option${activeSelection?.kind === 'option' && activeSelection.value === option ? ' is-selected' : ''}`}
                    type="button"
                    key={option}
                    aria-pressed={activeSelection?.kind === 'option' && activeSelection.value === option}
                    onClick={() => chooseOption(activeQuestion.id, option)}
                  >
                    {option}
                  </button>
                ))}
                <button
                  className={`clarification-option${activeSelection?.kind === 'option' && activeSelection.value === '我不确定' ? ' is-selected' : ''}`}
                  type="button"
                  aria-pressed={activeSelection?.kind === 'option' && activeSelection.value === '我不确定'}
                  onClick={() => chooseOption(activeQuestion.id, '我不确定')}
                >
                  我不确定
                </button>
                <button
                  className={`clarification-option clarification-option-custom${isCustom ? ' is-selected' : ''}`}
                  type="button"
                  aria-pressed={isCustom}
                  onClick={() => chooseCustom(activeQuestion.id)}
                >
                  补充一下我的情况
                </button>
              </div>
              {isCustom ? (
                <textarea
                  className="clarification-input"
                  value={customTexts[activeQuestion.id] || ''}
                  onChange={(event) =>
                    setCustomTexts((current) => ({ ...current, [activeQuestion.id]: event.target.value }))
                  }
                  placeholder="只补充和这个问题有关的情况"
                  rows={2}
                />
              ) : null}
            </fieldset>
            );
          })()
        ) : null}
      </div>

      <div className="clarification-actions">
        <div className="clarification-main-actions">
          <button className="clarification-stop" type="button" onClick={() => onStop(currentAnswers)} disabled={loading}>
            按已有信息安排
          </button>
          <button className="clarification-continue" type="button" onClick={advance} disabled={!activeAnswer || loading}>
            {loading ? <Loader2 className="spin" size={17} /> : null}
            {loading ? '正在理解' : isLastQuestion ? '继续' : '下一题'}
          </button>
        </div>
      </div>
    </section>
  );
}
