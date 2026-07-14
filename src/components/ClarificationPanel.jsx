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
  const { questions = [], questionCount = 0, analysisMode = 'standard' } = session;
  const isDeepMode = analysisMode === 'deep';
  const [selections, setSelections] = useState({});
  const [customTexts, setCustomTexts] = useState({});

  useEffect(() => {
    setSelections({});
    setCustomTexts({});
  }, [questions]);

  const currentAnswers = useMemo(
    () =>
      questions
        .map((question) => answerForQuestion(question, selections[question.id], customTexts[question.id] || ''))
        .filter(Boolean),
    [customTexts, questions, selections],
  );
  const chooseOption = (questionId, option) => {
    setSelections((current) => ({ ...current, [questionId]: { kind: 'option', value: option } }));
  };

  const chooseCustom = (questionId) => {
    setSelections((current) => ({ ...current, [questionId]: { kind: 'custom' } }));
  };

  return (
    <section className="clarification-panel" aria-label="补充几个关键信息">
      <div className="clarification-heading">
        <div>
          <p>{isDeepMode ? '为了更贴合你的情况' : '我想确认几件关键小事'}</p>
          <small>
            {isDeepMode
              ? `一次回答这 ${questions.length} 个问题，提交后 AI 会深入整理并直接给出安排。`
              : '一次选完，提交后就直接为你安排。'}
          </small>
        </div>
      </div>

      <div className="clarification-questions">
        {questions.map((question, index) => {
          const selection = selections[question.id];
          const isCustom = selection?.kind === 'custom';
          return (
            <fieldset className="clarification-question" key={`${question.id}-${questionCount}-${index}`} disabled={loading}>
              <legend>
                <span>关于「{question.evidence}」</span>
                {question.text}
              </legend>
              <div className="clarification-options">
                {question.options.map((option) => (
                  <button
                    className={`clarification-option${selection?.kind === 'option' && selection.value === option ? ' is-selected' : ''}`}
                    type="button"
                    key={option}
                    aria-pressed={selection?.kind === 'option' && selection.value === option}
                    onClick={() => chooseOption(question.id, option)}
                  >
                    {option}
                  </button>
                ))}
                <button
                  className={`clarification-option${selection?.kind === 'option' && selection.value === '我不确定' ? ' is-selected' : ''}`}
                  type="button"
                  aria-pressed={selection?.kind === 'option' && selection.value === '我不确定'}
                  onClick={() => chooseOption(question.id, '我不确定')}
                >
                  我不确定
                </button>
                <button
                  className={`clarification-option clarification-option-custom${isCustom ? ' is-selected' : ''}`}
                  type="button"
                  aria-pressed={isCustom}
                  onClick={() => chooseCustom(question.id)}
                >
                  补充一下我的情况
                </button>
              </div>
              {isCustom ? (
                <textarea
                  className="clarification-input"
                  value={customTexts[question.id] || ''}
                  onChange={(event) =>
                    setCustomTexts((current) => ({ ...current, [question.id]: event.target.value }))
                  }
                  placeholder="只补充和这个问题有关的情况"
                  rows={2}
                />
              ) : null}
            </fieldset>
          );
        })}
      </div>

      <div className="clarification-actions">
        <div className="clarification-main-actions">
          <button className="clarification-stop" type="button" onClick={() => onStop(currentAnswers)} disabled={loading}>
            按已有信息给建议
          </button>
          <button
            className="clarification-continue"
            type="button"
            onClick={() => onContinue(currentAnswers)}
            disabled={currentAnswers.length !== questions.length || loading}
          >
            {loading ? <Loader2 className="spin" size={17} /> : null}
            {loading ? '正在安排' : '按这些信息安排'}
          </button>
        </div>
      </div>
    </section>
  );
}
