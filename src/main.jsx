import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertCircle,
  ChevronDown,
  CheckCircle2,
  Download,
  FileText,
  KeyRound,
  Loader2,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import './styles.css';

const INPUT_KEY = 'anxiety-planner.input.v1';
const RESULT_KEY = 'anxiety-planner.result.v1';
const AI_KEY = 'anxiety-planner.ai.v1';

const defaultInput = '';
const defaultResult = null;

const modelOptions = [
  {
    id: 'deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    provider: 'DeepSeek',
    model: 'deepseek-v4-pro',
    baseUrl: 'https://api.deepseek.com',
    reasoning: true,
  },
  {
    id: 'kimi-k2-6',
    label: 'Kimi K2.6',
    provider: 'Kimi',
    model: 'kimi-k2.6',
    baseUrl: 'https://api.moonshot.ai/v1',
  },
  {
    id: 'glm-5-2',
    label: 'GLM 5.2',
    provider: 'Z.AI',
    model: 'glm-5.2',
    baseUrl: 'https://api.z.ai/api/paas/v4/',
  },
  {
    id: 'minimax-m3',
    label: 'MiniMax M3',
    provider: 'MiniMax',
    model: 'MiniMax-M3',
    baseUrl: 'https://api.minimax.io/v1',
  },
];

const defaultModel = modelOptions[0];
const defaultAi = {
  providerId: defaultModel.id,
  baseUrl: defaultModel.baseUrl,
  model: defaultModel.model,
  apiKey: '',
  apiKeys: {},
};

const floatingNotes = [
  { text: '慢慢来', className: 'note-one' },
  { text: '先写下来', className: 'note-two' },
  { text: '你已经很棒了', className: 'note-three' },
  { text: '今天也辛苦啦～', className: 'note-four' },
  { text: '先照顾好自己', className: 'note-five' },
  { text: '不用一次做完', className: 'note-six' },
  { text: '完成一点也算数', className: 'note-seven' },
  { text: '要记得爱自己哦～', className: 'note-eight' },
  { text: '给自己一点时间', className: 'note-nine' },
  { text: '你不用独自扛着', className: 'note-ten' },
];

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => readStorage(key, fallback));
  const setStoredValue = (next) => {
    setValue((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      localStorage.setItem(key, JSON.stringify(resolved));
      return resolved;
    });
  };
  return [value, setStoredValue];
}

function todayText() {
  return new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
  });
}

function parseJsonFromModel(content) {
  const clean = content.replace(/```json|```/g, '').trim();
  const jsonText = clean.match(/\{[\s\S]*\}/)?.[0] || clean;
  return JSON.parse(jsonText);
}

function normalizePlan(parsed) {
  return {
    summary: parsed.summary || '先做最重要的一小步。',
    advice: Array.isArray(parsed.advice) ? parsed.advice.slice(0, 2) : [],
    schedule: Array.isArray(parsed.schedule)
      ? parsed.schedule.slice(0, 10).map((item) => ({
          ...item,
          completed: Boolean(item.completed),
        }))
      : [],
    later: Array.isArray(parsed.later) ? parsed.later : [],
  };
}

function getSelectedModel(ai) {
  return (
    modelOptions.find((option) => option.id === ai.providerId) ||
    modelOptions.find((option) => option.model === ai.model && option.baseUrl === ai.baseUrl) ||
    defaultModel
  );
}

function getStoredApiKey(ai, modelId) {
  return ai?.apiKeys?.[modelId] || '';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function priorityClass(priority) {
  if (priority === '高') {
    return 'priority-high';
  }
  if (priority === '低') {
    return 'priority-low';
  }
  return 'priority-medium';
}

function buildExportHtml(result) {
  const schedule = Array.isArray(result?.schedule) ? result.schedule.slice(0, 10) : [];
  const advice = Array.isArray(result?.advice) ? result.advice.slice(0, 2) : [];
  const rows = schedule
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.date)}</td>
          <td>${escapeHtml(item.time)}</td>
          <td>${escapeHtml(item.title)}</td>
          <td>${escapeHtml(item.action)}</td>
          <td><span class="priority priority-${escapeHtml(item.priority || '中')}">${escapeHtml(item.priority || '中')}</span></td>
          <td class="done-cell">${item.completed ? '✓' : ''}</td>
        </tr>`
    )
    .join('');
  const createdAt = new Date(result?.createdAt || Date.now()).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>待办清单</title>
      <style>
        @page { size: A4; margin: 14mm; }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          color: #162234;
          background: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
          font-size: 12px;
          line-height: 1.55;
        }
        .sheet {
          width: 100%;
        }
        .doc-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          padding-bottom: 12px;
          border-bottom: 2px solid #cfe5e8;
        }
        h1 {
          margin: 0;
          color: #112033;
          font-size: 24px;
          line-height: 1.25;
        }
        .date {
          margin: 0;
          color: #58706f;
          white-space: nowrap;
        }
        .advice {
          margin: 14px 0 16px;
          padding: 10px 12px;
          border: 1px solid #d8eceb;
          border-radius: 10px;
          background: #f5fbfb;
        }
        .advice p {
          margin: 4px 0;
          color: #344a57;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        th,
        td {
          border: 1px solid #d5e1e5;
          padding: 8px 9px;
          text-align: left;
          vertical-align: top;
          word-break: break-word;
        }
        th {
          color: #29464b;
          background: #edf8f8;
          font-weight: 700;
        }
        th:nth-child(1), td:nth-child(1) { width: 15%; }
        th:nth-child(2), td:nth-child(2) { width: 15%; }
        th:nth-child(3), td:nth-child(3) { width: 19%; }
        th:nth-child(4), td:nth-child(4) { width: 33%; }
        th:nth-child(5), td:nth-child(5) { width: 8%; text-align: center; }
        th:nth-child(6), td:nth-child(6) { width: 10%; text-align: center; }
        .priority {
          display: inline-block;
          min-width: 24px;
          padding: 2px 7px;
          border-radius: 999px;
          font-weight: 700;
        }
        .priority-高 { color: #9f2d26; background: #ffe4df; }
        .priority-中 { color: #8a5c00; background: #fff1c4; }
        .priority-低 { color: #23675f; background: #dff5f0; }
        .done-cell {
          height: 32px;
          color: #16835f;
          font-size: 18px;
          font-weight: 800;
          line-height: 1;
        }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <main class="sheet">
        <header class="doc-head">
          <h1>${escapeHtml(result?.summary || '先做最重要的一步')}</h1>
          <p class="date">${createdAt}</p>
        </header>
        ${advice.length ? `<section class="advice">${advice.map((item) => `<p>${escapeHtml(item)}</p>`).join('')}</section>` : ''}
        <table>
          <thead>
            <tr><th>日期</th><th>时间</th><th>事项</th><th>具体动作</th><th>重要性</th><th>完成</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </main>
    </body>
  </html>`;
}

function downloadWord(result) {
  const blob = new Blob(['\ufeff', buildExportHtml(result)], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `AI待办菜单-${new Date().toISOString().slice(0, 10)}.doc`;
  link.click();
  URL.revokeObjectURL(url);
}

function printPdf(result) {
  const printWindow = window.open('', '_blank', 'width=920,height=720');
  if (!printWindow) {
    window.print();
    return;
  }
  printWindow.document.write(buildExportHtml(result));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function playCompletionDing() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.34);
    gain.connect(context.destination);

    [880, 1174.66].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, context.currentTime + index * 0.065);
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * 0.065);
      oscillator.stop(context.currentTime + 0.3 + index * 0.065);
    });

    setTimeout(() => context.close(), 520);
  } catch {
    // Completion sound is a small delight, not a required workflow.
  }
}

function App() {
  const [input, setInput] = useStoredState(INPUT_KEY, defaultInput);
  const [result, setResult] = useStoredState(RESULT_KEY, defaultResult);
  const [ai, setAi] = useStoredState(AI_KEY, defaultAi);
  const [status, setStatus] = useState({ loading: false, error: '' });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(() => !Boolean(readStorage(RESULT_KEY, defaultResult)));
  const [completionToast, setCompletionToast] = useState('');
  const [celebrating, setCelebrating] = useState(false);
  const toastTimerRef = useRef(null);
  const celebrationTimerRef = useRef(null);
  const selectedModel = getSelectedModel(ai);

  const canSubmit = input.trim().length >= 8 && !status.loading;
  const activeApiKey = ai.apiKey || getStoredApiKey(ai, selectedModel.id);
  const hasResult = Boolean(result);
  const showComposer = !hasResult || composerOpen;
  const appClassName = ['app', hasResult ? 'app-has-result' : '', showComposer ? 'composer-open' : 'composer-closed']
    .filter(Boolean)
    .join(' ');

  const clearAll = () => {
    setInput('');
    setResult(null);
    setStatus({ loading: false, error: '' });
    setComposerOpen(true);
  };

  const continueWriting = () => {
    setComposerOpen(true);
    setStatus({ loading: false, error: '' });
  };

  const showCompletionToast = () => {
    setCompletionToast('恭喜您已完成');
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setCompletionToast('');
      toastTimerRef.current = null;
    }, 1800);
  };

  const showCelebration = () => {
    setCelebrating(true);
    if (celebrationTimerRef.current) {
      window.clearTimeout(celebrationTimerRef.current);
    }
    celebrationTimerRef.current = window.setTimeout(() => {
      setCelebrating(false);
      celebrationTimerRef.current = null;
    }, 2600);
  };

  const changeModel = (modelId) => {
    const nextModel = modelOptions.find((option) => option.id === modelId) || defaultModel;
    setAi((current) => {
      const currentModel = getSelectedModel(current);
      const nextApiKeys = {
        ...(current.apiKeys || {}),
        [currentModel.id]: current.apiKey || '',
      };
      return {
        ...current,
        providerId: nextModel.id,
        model: nextModel.model,
        baseUrl: nextModel.baseUrl,
        apiKeys: nextApiKeys,
        apiKey: nextApiKeys[nextModel.id] || '',
      };
    });
  };

  const toggleScheduleItem = (targetIndex) => {
    const willComplete = Boolean(result?.schedule?.[targetIndex]) && !result.schedule[targetIndex].completed;
    const nextVisibleSchedule = result?.schedule
      ? result.schedule
          .slice(0, 10)
          .map((item, index) => (index === targetIndex ? { ...item, completed: !item.completed } : item))
      : [];
    const willCompleteAll = willComplete && nextVisibleSchedule.length > 0 && nextVisibleSchedule.every((item) => item.completed);

    setResult((current) => {
      if (!current?.schedule) {
        return current;
      }

      const nextSchedule = current.schedule.map((item, index) =>
        index === targetIndex ? { ...item, completed: !item.completed } : item
      );

      return {
        ...current,
        schedule: nextSchedule,
      };
    });

    if (willComplete) {
      playCompletionDing();
      showCompletionToast();
      if (willCompleteAll) {
        showCelebration();
      }
    }
  };

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      if (celebrationTimerRef.current) {
        window.clearTimeout(celebrationTimerRef.current);
      }
    };
  }, []);

  const generatePlan = async () => {
    if (!input.trim()) {
      setStatus({ loading: false, error: '先把让你烦的事情写进去。' });
      return;
    }

    if (!activeApiKey.trim()) {
      setStatus({ loading: false, error: '先填 API Key。' });
      return;
    }

    setStatus({ loading: true, error: '' });
    try {
      const endpoint = `${selectedModel.baseUrl.replace(/\/+$/, '')}/chat/completions`;
      const requestBody = {
        model: selectedModel.model,
        response_format: {
          type: 'json_object',
        },
        messages: [
          {
            role: 'system',
            content:
              '你是一个温柔、克制、专业的心理支持型时间规划助手。用户可能正处在焦虑、低落、抑郁或现实压力很重的状态。你要先在内部做专业分析：从心理负荷、现实压力来源、任务重要程度、紧急程度、完成阻力、可执行性、用户当前精力、时间顺序和依赖关系来判断安排。输出时不要展示分析过程，只给用户最低阅读成本的结果：一句鼓励、最多两条心理舒缓建议、一个清晰可勾选的待办菜单。待办必须贴合现实，优先安排最重要且能推进局面的事项，任务要小，能完成，不压迫。不要做医学诊断，不替代专业心理治疗；如果用户表达自伤或伤害他人的风险，要温和建议立刻联系身边可信任的人、当地紧急电话或专业危机热线。必须只输出 JSON，不要 Markdown，不要解释你的思考过程。',
          },
          {
            role: 'user',
            content: JSON.stringify({
              today: todayText(),
              user_input: input.trim(),
              output_contract:
                '输出 JSON：{"summary":"","advice":[""],"schedule":[{"date":"YYYY-MM-DD","time":"HH:mm-HH:mm","title":"","action":"","why":"","priority":"高|中|低"}],"later":[""]}。summary 只能一句话，18 个中文字以内，必须鼓励、安定、不夸张。advice 只能 1 到 2 条，每条 22 个中文字以内，从心理舒缓角度给用户降低压力。schedule 是最终核心，数量要根据用户输入的事情多少和复杂度决定：简单输入 3 到 5 条，事情多时 6 到 10 条；必须按日期时间升序。time 必须尽量精确成 HH:mm-HH:mm，即使用户没有给具体时间，也要根据今天日期、任务长短、现实节奏合理估算，不要输出上午、下午、晚上这种模糊词。每条 title 14 个中文字以内，action 32 个中文字以内，必须是具体下一步动作；priority 按重要程度、紧急程度、现实压力和可完成性综合判断；why 只给内部排序参考，16 个中文字以内，前端可能不展示。不要只给建议而不给待办。不要输出长段文字。不要要求用户再补很多表单信息。',
            }),
          },
        ],
      };

      if (selectedModel.reasoning) {
        requestBody.thinking = {
          type: 'enabled',
        };
        requestBody.reasoning_effort = 'max';
      }

      const callModel = (body) =>
        fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeApiKey.trim()}`,
          },
          body: JSON.stringify(body),
        });

      let response = await callModel(requestBody);
      let errorText = '';

      if (!response.ok) {
        errorText = await response.text();
        if (response.status === 400 && requestBody.response_format) {
          const fallbackBody = { ...requestBody };
          delete fallbackBody.response_format;
          response = await callModel(fallbackBody);
          errorText = '';
        }
      }

      if (!response.ok) {
        errorText = errorText || (await response.text());
        throw new Error(errorText || `请求失败：${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const parsed = normalizePlan(parseJsonFromModel(content));
      setResult({ ...parsed, createdAt: new Date().toISOString() });
      setStatus({ loading: false, error: '' });
      setComposerOpen(false);
    } catch (error) {
      setStatus({
        loading: false,
        error: error.message?.slice(0, 260) || '生成失败，请检查 API Key、模型名称或网络限制。',
      });
    }
  };

  return (
    <main className={appClassName}>
      <div className="flow-scene" aria-hidden="true">
        <span className="flow-ribbon ribbon-one" />
        <span className="flow-ribbon ribbon-two" />
        <span className="flow-ribbon ribbon-three" />
        <span className="light-thread thread-one" />
        <span className="light-thread thread-two" />
        <span className="soft-noise" />
      </div>

      <button
        className="settings-trigger"
        type="button"
        onPointerDown={(event) => {
          event.preventDefault();
          setSettingsOpen(true);
        }}
        onClick={() => setSettingsOpen(true)}
        aria-label="打开模型设置"
        title="模型设置"
      >
        <Settings size={19} />
      </button>

      {showComposer ? (
        <section className="home-stage">
          <div className="composer-orbit">
            {!hasResult ? (
              <div className="floating-notes" aria-hidden="true">
                {floatingNotes.map((note) => (
                  <span className={`float-note ${note.className}`} key={note.text}>
                    {note.text}
                  </span>
                ))}
              </div>
            ) : null}

            <section className="composer" aria-label="输入事情">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="把脑子里堆着的事都写在这里。"
              />

              <div className="composer-footer">
                <div className="main-actions">
                  <button className="clear-button" type="button" onClick={clearAll} title="清空" aria-label="清空">
                    <Trash2 size={16} />
                  </button>
                  <button className="primary-button" type="button" onClick={generatePlan} disabled={!canSubmit}>
                    {status.loading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
                    {status.loading ? '分析中' : hasResult ? '重新分析' : '开始分析'}
                  </button>
                </div>
              </div>

              {status.error ? (
                <div className="notice">
                  <AlertCircle size={17} />
                  {status.error}
                </div>
              ) : null}
            </section>
          </div>
        </section>
      ) : null}

      {result ? (
        <section className="result-area">
          <PlanResult result={result} onContinue={continueWriting} onToggleItem={toggleScheduleItem} />
        </section>
      ) : null}

      {settingsOpen ? (
        <div className="settings-modal" role="presentation" onMouseDown={() => setSettingsOpen(false)}>
          <section
            className="settings-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="settings-panel-head">
              <h2 id="settings-title">模型设置</h2>
              <button type="button" onClick={() => setSettingsOpen(false)} aria-label="关闭设置">
                <X size={18} />
              </button>
            </div>

            <div className="settings-body">
              <label>
                API Key
                <span className="key-input">
                  <KeyRound size={15} />
                  <input
                    type="password"
                    value={activeApiKey}
                    onChange={(event) => {
                      const nextApiKey = event.target.value;
                      setAi((current) => ({
                        ...current,
                        apiKey: nextApiKey,
                        apiKeys: {
                          ...(current.apiKeys || {}),
                          [selectedModel.id]: nextApiKey,
                        },
                      }));
                    }}
                    placeholder="sk-..."
                    autoFocus
                  />
                </span>
              </label>
              <label>
                模型
                <select value={selectedModel.id} onChange={(event) => changeModel(event.target.value)}>
                  {modelOptions.map((option) => (
                    <option value={option.id} key={option.id}>
                      {option.provider} · {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Base URL
                <input value={selectedModel.baseUrl} readOnly />
              </label>
            </div>

            <button className="modal-done" type="button" onClick={() => setSettingsOpen(false)}>
              完成
            </button>
          </section>
        </div>
      ) : null}

      {completionToast ? (
        <div className="completion-toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} />
          {completionToast}
        </div>
      ) : null}

      {celebrating ? <Celebration /> : null}
    </main>
  );
}

function Celebration() {
  return (
    <div className="celebration" aria-hidden="true">
      <div className="celebration-message">好棒！你完成了全部任务</div>
      <div className="confetti-field">
        {Array.from({ length: 18 }).map((_, index) => (
          <span className={`confetti confetti-${index + 1}`} key={index} />
        ))}
      </div>
    </div>
  );
}

function PlanResult({ result, onContinue, onToggleItem }) {
  const advice = Array.isArray(result.advice) ? result.advice.slice(0, 2) : [];
  const schedule = Array.isArray(result.schedule) ? result.schedule.slice(0, 10) : [];
  const completedCount = schedule.filter((item) => item.completed).length;
  const totalCount = schedule.length;

  return (
    <div className="result-shell">
      <div className="result-head">
        <div>
          <h1>先做最重要的一步</h1>
        </div>
        <div className="result-actions">
          <details className="export-menu">
            <summary className="export-button">
              <Download size={16} />
              导出
              <ChevronDown size={15} />
            </summary>
            <div className="export-options">
              <button
                type="button"
                onClick={(event) => {
                  event.currentTarget.closest('details')?.removeAttribute('open');
                  printPdf(result);
                }}
              >
                <FileText size={15} />
                PDF
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.currentTarget.closest('details')?.removeAttribute('open');
                  downloadWord(result);
                }}
              >
                <Download size={15} />
                Word
              </button>
            </div>
          </details>
          <button className="continue-button" type="button" onClick={onContinue}>
            <Plus size={17} />
            继续补充
          </button>
        </div>
      </div>

      <div className="plan">
      <section className="advice-panel">
        <h2>{result.summary || '先把最堵的事情拆成第一步。'}</h2>
        {advice.length ? (
          <div className="advice-list">
            {advice.map((item, index) => (
              <p key={`${item}-${index}`}>
                <CheckCircle2 size={17} />
                {item}
              </p>
            ))}
          </div>
        ) : null}
      </section>

      <section className="schedule-panel">
        <div className="schedule-panel-head">
          <p className="eyebrow">待办清单</p>
          {totalCount ? (
            <span>
              {completedCount}/{totalCount} 已完成
            </span>
          ) : null}
        </div>
        <div className="schedule-list">
          {schedule.map((item, index) => (
            <article className={`schedule-item ${item.completed ? 'is-complete' : ''}`} key={`${item.date}-${item.time}-${index}`}>
              <div className="schedule-time">
                <strong>{item.date || '待定日期'}</strong>
                <span>{item.time || '待定时间'}</span>
              </div>
              <div className="schedule-content">
                <button
                  className="todo-check"
                  type="button"
                  onClick={() => onToggleItem(index)}
                  aria-label={item.completed ? '标记为未完成' : '标记为已完成'}
                  aria-pressed={item.completed}
                >
                  {item.completed ? <CheckCircle2 size={18} /> : null}
                </button>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.action}</p>
                </div>
                <span className={`priority ${priorityClass(item.priority)}`}>{item.priority || '中'}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
