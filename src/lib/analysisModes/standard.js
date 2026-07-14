import { needsGoalClarification } from '../clarification.js';
import { SHARED_OUTPUT_CONTRACT } from './sharedContract.js';

const MINIMUM_QUESTION_COUNT = 1;
const MAXIMUM_QUESTION_COUNT = 4;
const MAXIMUM_FOCUS_AREAS = 4;

const routingContract = `${SHARED_OUTPUT_CONTRACT}

这是普通分析模式。信息足够时直接输出 type 为 "plan"，不要为了追问而追问。只有缺失信息会实质改变下一步或排程时才允许输出 type 为 "clarify"，一次最多 ${MAXIMUM_QUESTION_COUNT} 个问题。当 clarification_state.must_clarify_before_planning 为 true 时必须先 clarify；当 selected_answers 非空或 clarification_state.force_plan_now 为 true 时必须直接 plan，不得继续追问。对于学习一项技能但缺少起点或时间范围的输入，优先问当前基础、准备投入多久或希望学到什么程度。`;

function shouldClarify({ input, answers, questionCount, forcePlan, forceClarification }) {
  if (forcePlan || answers.length > 0) return false;
  return forceClarification || (questionCount === 0 && needsGoalClarification(input));
}

function getReasoningStrategy({ input, answerCount, questionCount, forcePlan, requireClarification }) {
  const source = String(input || '');
  const structureCount = (source.match(/[，、；。！？\n]/g) || []).length;
  const constraintCount = (source.match(/今天|明天|本周|下周|月底|截止|必须|同时|另外|还有|以及|一边|论文|答辩|工作|面试|搬家|客户/g) || [])
    .length;

  if ((forcePlan && questionCount >= MAXIMUM_QUESTION_COUNT) || source.length >= 360 || structureCount + constraintCount >= 8) {
    return 'deep-max';
  }
  if (requireClarification || source.length >= 140 || structureCount + constraintCount >= 4 || answerCount >= 2) {
    return 'deep';
  }
  return 'fast';
}

function buildClarificationState({ questionCount, round, forcePlan, mustClarify }) {
  return {
    agent_mode: 'bounded_planning_agent',
    analysis_mode: 'standard',
    max_focus_areas: MAXIMUM_FOCUS_AREAS,
    prioritization: ['硬截止', '阻塞多件事', '高代价或高情绪负荷', '用户明确强调'],
    workflow: ['判断信息是否足够', '只询问会改变安排的缺失信息', '收到答案后收束为计划'],
    asked_question_count: questionCount,
    remaining_question_count: Math.max(0, MAXIMUM_QUESTION_COUNT - questionCount),
    round,
    force_plan_now: forcePlan,
    must_clarify_before_planning: mustClarify,
    minimum_question_batch_size: mustClarify ? MINIMUM_QUESTION_COUNT : 0,
    maximum_question_batch_size: MAXIMUM_QUESTION_COUNT,
  };
}

function buildInstruction({ forcePlan, mustClarify, repairAttempt }) {
  if (forcePlan) {
    return '现在必须输出 type 为 plan 的最终计划。不要再提出问题；只使用已有原文和选择。';
  }
  if (mustClarify) {
    return `这是一项缺少起点或时间范围的目标。现在必须输出 1 到 2 个 type 为 clarify 的选择题，不能直接排程。${repairAttempt ? '上一次问题未通过校验，这次必须严格遵守 evidence 和 options 格式。' : ''}`;
  }
  return '若原始信息已足够，请直接输出 type 为 plan。不要为了追问而追问。';
}

export const standardAnalysisStrategy = {
  id: 'standard',
  routingContract,
  minimumQuestionCount: MINIMUM_QUESTION_COUNT,
  maximumQuestionCount: MAXIMUM_QUESTION_COUNT,
  shouldClarify,
  getReasoningStrategy,
  buildClarificationState,
  buildInstruction,
  isQuestionBatchValid: ({ mustClarify, questionCount }) => !mustClarify || questionCount >= MINIMUM_QUESTION_COUNT,
  invalidQuestionMessage: '这件事还缺少关键信息，请重新分析一次。',
};
