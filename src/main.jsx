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
const loadingComfortMessages = ['马上好', '再等等', '不要急', '快好了'];

const SYSTEM_PROMPT =
  '你是一个温柔、克制、专业的心理支持型任务澄清助手。用户可能正处在焦虑、低落、拖延、自责或现实压力很重的状态。你要先在内部做深度分析：识别用户描述中的情绪负荷、现实压力来源、模糊概念、隐藏任务、回避点、完成阻力、时间约束、依赖关系、重要程度、紧急程度、用户当前精力和可执行性。分析时参考心理学视角：认知负荷、情绪调节、任务启动阻力、自我效能感、模糊性带来的焦虑、下一步行动的清晰度。\n\n排程时必须主动校正“规划谬误”：人通常会低估工作所需时间、被打断的损耗和启动成本。把 time 视为用户真实预留的完整时间窗口，不是只计算顺利执行所需的理想时长。根据任务难度、不确定性、创造性、沟通协作、等待依赖和用户当前情绪负荷，保守估算完成时间，并把缓冲直接放进 time。默认给日常明确任务至少 50% 缓冲；写代码、排错、剪辑、写作、学习、资料整理、需要沟通或结果不确定的任务至少 100% 缓冲；陌生、复杂或高度不确定的任务可给更多缓冲。每个任务之间至少留 15 分钟空档；一天只安排约 60% 的可用时间，保留其余时间给突发情况、休息和拖延恢复。除非用户明确要求或存在硬截止，不要把一天排满，也不要为了凑数量拆出没有意义的微步骤。优先在白天安排需要专注的工作，避免把任务排到用户当前时间之前或过晚。若存在真实截止时间，先保护截止时间；若工作量明显不可能按时完成，优先安排最能推进结果的部分和尽早沟通/交付初稿的动作，不要假装能全部赶完。\n\n输出时绝对不要展示分析、解释、原因、建议讲解或长段文字。你只给用户最低阅读成本的结果：左侧一句鼓励，右侧一个纯待办清单。遇到笼统、复杂、过大的事情时，必须把它去模糊化，拆成几条可以马上执行的小任务；每条待办本身就要完整、具体、可勾选。不要做医学诊断，不替代专业心理治疗；如果用户表达自伤或伤害他人的风险，要把 summary 写成温和的求助提醒，并把 schedule 安排成立刻联系身边可信任的人、当地紧急电话或专业危机热线等现实动作。必须只输出 JSON，不要 Markdown。';

const OUTPUT_CONTRACT =
  '输出 JSON：{"summary":"","schedule":[{"date":"YYYY-MM-DD","time":"HH:mm-HH:mm","title":"","estimated_minutes":30,"buffer_minutes":30,"completed":false}],"later":[]}。summary 只能一句话，18 个中文字以内，必须鼓励、安定、不夸张。不要输出 advice、reason、why、action、description 等解释字段。schedule 是最终核心，按日期时间升序。小而明确的一件事可只排 1 到 3 条；普通事项排 3 到 5 条；事情多或笼统时才排 6 到 10 条。time 必须精确为 HH:mm-HH:mm，且表示已包含缓冲的完整预留时间窗口；estimated_minutes 是乐观但合理的纯执行分钟数，buffer_minutes 是已包含在 time 中的缓冲分钟数，二者为正整数，仅用于排程校验、不向用户展示。buffer_minutes 不得少于 15 分钟，且必须符合系统提示词中的比例。即使用户没有给具体时间，也要结合当前日期、当前时间、任务长短和现实节奏合理安排；不要输出上午、下午、晚上等模糊词。每条 title 是唯一会显示给用户的待办文字，必须是事情本身，不要描述、不要讲解、不要原因、不要价值判断；18 个中文字以内，动词开头，具体到下一步动作。遇到“工作很乱、客户要跟、项目推进、论文、找工作、搬家、学习、变好、做副业”等大概念时，主动拆成几条明确小任务；但不要为了凑数量加入无价值的准备动作。不要要求用户再补很多表单信息。';

const modelOptions = [
  {
    id: 'deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    provider: 'DeepSeek',
    model: 'deepseek-v4-pro',
    baseUrl: 'https://api.deepseek.com',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    reasoning: true,
  },
  {
    id: 'doubao-seed-2-1-pro-260628',
    label: '豆包 Seed 2.1 Pro',
    provider: '字节跳动',
    model: 'doubao-seed-2-1-pro-260628',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKeyUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apikey',
    api: 'responses',
  },
  {
    id: 'glm-5-2',
    label: 'GLM 5.2',
    provider: '智谱清言',
    model: 'glm-5.2',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
    apiKeyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
  },
];

const defaultModel = modelOptions[0];
const legacyProviderIds = {
  'doubao-seed-2-1-pro': 'doubao-seed-2-1-pro-260628',
};
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

function currentPlanningContext() {
  const now = new Date();
  const currentDate = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join(
    '-',
  );
  const currentTime = [String(now.getHours()).padStart(2, '0'), String(now.getMinutes()).padStart(2, '0')].join(':');
  return {
    today: todayText(),
    current_date: currentDate,
    current_time: currentTime,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

function parseJsonFromModel(content) {
  const clean = content.replace(/```json|```/g, '').trim();
  const jsonText = clean.match(/\{[\s\S]*\}/)?.[0] || clean;
  return JSON.parse(jsonText);
}

function getResponseContent(data) {
  if (typeof data?.output_text === 'string') {
    return data.output_text;
  }

  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') {
        return content.text;
      }
    }
  }

  return '';
}

function normalizePlan(parsed) {
  return {
    summary: parsed.summary || '先做最重要的一小步。',
    advice: [],
    schedule: Array.isArray(parsed.schedule)
      ? parsed.schedule.slice(0, 10).map((item) => ({
          ...item,
          estimated_minutes: Number.isFinite(Number(item.estimated_minutes))
            ? Number(item.estimated_minutes)
            : undefined,
          buffer_minutes: Number.isFinite(Number(item.buffer_minutes))
            ? Number(item.buffer_minutes)
            : undefined,
          completed: Boolean(item.completed),
        }))
      : [],
    later: Array.isArray(parsed.later) ? parsed.later : [],
  };
}

function getSelectedModel(ai) {
  const providerId = legacyProviderIds[ai?.providerId] || ai?.providerId;
  return (
    modelOptions.find((option) => option.id === providerId) ||
    modelOptions.find((option) => option.model === ai.model && option.baseUrl === ai.baseUrl) ||
    defaultModel
  );
}

function getStoredApiKey(ai, modelId) {
  const legacyModelId = Object.entries(legacyProviderIds).find(([, currentId]) => currentId === modelId)?.[0];
  return ai?.apiKeys?.[modelId] || ai?.apiKeys?.[legacyModelId] || '';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildExportHtml(result) {
  const schedule = Array.isArray(result?.schedule) ? result.schedule.slice(0, 10) : [];
  const rows = schedule
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.date)}</td>
          <td>${escapeHtml(item.time)}</td>
          <td>${escapeHtml(item.title)}</td>
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
      <title>先做一点 · 待办清单</title>
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
        th:nth-child(3), td:nth-child(3) { width: 58%; }
        th:nth-child(4), td:nth-child(4) { width: 12%; text-align: center; }
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
          <h1>${escapeHtml(result?.summary || '慢慢来，先完成眼前这一小步。')}</h1>
          <p class="date">${createdAt}</p>
        </header>
        <table>
          <thead>
            <tr><th>日期</th><th>时间</th><th>待办事项</th><th>完成</th></tr>
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
  link.download = `先做一点-${new Date().toISOString().slice(0, 10)}.doc`;
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
  const [loadingLabel, setLoadingLabel] = useState('分析中');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(() => !Boolean(readStorage(RESULT_KEY, defaultResult)));
  const [completionToast, setCompletionToast] = useState('');
  const [celebrating, setCelebrating] = useState(false);
  const toastTimerRef = useRef(null);
  const celebrationTimerRef = useRef(null);
  const modelPickerRef = useRef(null);
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

  const toggleComposer = () => {
    setComposerOpen((current) => !current);
    setStatus((current) => ({ ...current, error: '' }));
  };

  const openSettings = () => {
    setModelPickerOpen(false);
    setSettingsOpen(true);
  };

  const closeSettings = () => {
    setModelPickerOpen(false);
    setSettingsOpen(false);
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
        if (modelPickerOpen) {
          setModelPickerOpen(false);
          modelPickerRef.current?.querySelector('.model-picker-trigger')?.focus();
          return;
        }
        closeSettings();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [modelPickerOpen]);

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

  useEffect(() => {
    if (!status.loading) {
      setLoadingLabel('分析中');
      return undefined;
    }

    let messageIndex = 0;
    let rotationTimer = null;
    const comfortTimer = window.setTimeout(() => {
      setLoadingLabel(loadingComfortMessages[messageIndex]);
      messageIndex = (messageIndex + 1) % loadingComfortMessages.length;
      rotationTimer = window.setInterval(() => {
        setLoadingLabel(loadingComfortMessages[messageIndex]);
        messageIndex = (messageIndex + 1) % loadingComfortMessages.length;
      }, 3000);
    }, 3200);

    return () => {
      window.clearTimeout(comfortTimer);
      if (rotationTimer) {
        window.clearInterval(rotationTimer);
      }
    };
  }, [status.loading]);

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
      const isResponsesApi = selectedModel.api === 'responses';
      const endpoint = `${selectedModel.baseUrl.replace(/\/+$/, '')}/${isResponsesApi ? 'responses' : 'chat/completions'}`;
      const userContent = JSON.stringify({
        ...currentPlanningContext(),
        user_input: input.trim(),
        output_contract: OUTPUT_CONTRACT,
      });
      const requestBody = isResponsesApi
        ? {
            model: selectedModel.model,
            instructions: `${SYSTEM_PROMPT}\n\n${OUTPUT_CONTRACT}`,
            input: [
              {
                role: 'user',
                content: [{ type: 'input_text', text: userContent }],
              },
            ],
          }
        : {
            model: selectedModel.model,
            response_format: {
              type: 'json_object',
            },
            messages: [
              {
                role: 'system',
                content: SYSTEM_PROMPT,
              },
              {
                role: 'user',
                content: userContent,
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
      const content = isResponsesApi ? getResponseContent(data) : data.choices?.[0]?.message?.content || '';
      if (!content) {
        throw new Error('模型没有返回可解析的文本。');
      }
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

      <div className="brand-lockup" aria-label="先做一点">
        <img src="/logo.png" alt="" />
        <span>先做一点</span>
      </div>

      <div className="top-tools">
        {result ? <ExportMenu result={result} /> : null}
        <button
          className="settings-trigger"
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            openSettings();
          }}
          onClick={openSettings}
          aria-label="打开模型设置"
          title="模型设置"
        >
          <Settings size={19} />
        </button>
      </div>

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
                    {status.loading ? loadingLabel : hasResult ? '重新分析' : '开始分析'}
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
          <PlanResult result={result} composerOpen={composerOpen} onToggleComposer={toggleComposer} onToggleItem={toggleScheduleItem} />
        </section>
      ) : null}

      {settingsOpen ? (
        <div className="settings-modal" role="presentation" onMouseDown={closeSettings}>
          <section
            className="settings-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onMouseDown={(event) => {
              if (!modelPickerRef.current?.contains(event.target)) {
                setModelPickerOpen(false);
              }
              event.stopPropagation();
            }}
          >
            <div className="settings-panel-head">
              <h2 id="settings-title">模型设置</h2>
              <button type="button" onClick={closeSettings} aria-label="关闭设置">
                <X size={18} />
              </button>
            </div>

            <div className="settings-body">
              <label>
                <span className="field-label">
                  API Key
                  <a className="api-key-link" href={selectedModel.apiKeyUrl} target="_blank" rel="noreferrer">
                    获取 API Key
                  </a>
                </span>
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
              <div className="model-field">
                模型
                <div className="model-picker" ref={modelPickerRef}>
                  <button
                    className="model-picker-trigger"
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={modelPickerOpen}
                    aria-controls={modelPickerOpen ? 'model-option-list' : undefined}
                    aria-label={`选择模型，当前为 ${selectedModel.label}`}
                    onClick={() => setModelPickerOpen((current) => !current)}
                  >
                    <span className="model-picker-current">
                      <span>{selectedModel.label}</span>
                      <small>{selectedModel.provider}</small>
                    </span>
                    <ChevronDown className={modelPickerOpen ? 'is-open' : ''} size={18} aria-hidden="true" />
                  </button>
                  {modelPickerOpen ? (
                    <div className="model-picker-menu" id="model-option-list" role="listbox" aria-label="选择模型">
                      {modelOptions.map((option) => {
                        const isSelected = option.id === selectedModel.id;
                        return (
                          <button
                            className={`model-picker-option${isSelected ? ' is-selected' : ''}`}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            key={option.id}
                            onClick={() => {
                              changeModel(option.id);
                              setModelPickerOpen(false);
                            }}
                          >
                            <span className="model-picker-option-copy">
                              <span>{option.label}</span>
                              <small>{option.provider}</small>
                            </span>
                            {isSelected ? <CheckCircle2 size={18} aria-hidden="true" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
              <label>
                Base URL
                <input value={selectedModel.baseUrl} readOnly />
              </label>
            </div>

            <button className="modal-done" type="button" onClick={closeSettings}>
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

function PlanResult({ result, composerOpen, onToggleComposer, onToggleItem }) {
  const schedule = Array.isArray(result.schedule) ? result.schedule.slice(0, 10) : [];

  return (
    <div className="result-shell">
      <div className="result-top">
        <p>{result.summary || '慢慢来，先完成眼前这一小步。'}</p>
        <div className="result-actions">
          <button className="continue-button" type="button" onClick={onToggleComposer} aria-expanded={composerOpen}>
            {composerOpen ? <X size={17} /> : <Plus size={17} />}
            {composerOpen ? '收起补充' : '继续补充'}
          </button>
        </div>
      </div>

      <div className="plan">
        <section className="schedule-panel" aria-label="待办清单">
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
                  <h3>{item.title}</h3>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ExportMenu({ result }) {
  return (
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
  );
}

createRoot(document.getElementById('root')).render(<App />);
