import { SHARED_OUTPUT_CONTRACT } from './sharedContract.js';

const MINIMUM_QUESTION_COUNT = 6;
const MAXIMUM_QUESTION_COUNT = 8;
const MAXIMUM_FOCUS_AREAS = 8;

const routingContract = `${SHARED_OUTPUT_CONTRACT}

这是深度分析模式。深度来自一次性获得更完整的现实上下文并进行更充分的内部推理，不来自延长对话或输出冗长分析。当 selected_answers 为空且 clarification_state.force_plan_now 为 false 时，必须输出 type 为 "clarify"，并一次性给出 ${MINIMUM_QUESTION_COUNT} 到 ${MAXIMUM_QUESTION_COUNT} 个互不重复的问题；优先覆盖与当前事项有关的预期结果、当前进度、硬性时间、可用时间与精力、现实阻碍、已有资源、协作依赖和不可挪动安排。不要机械凑题，每一题都要补足一个会让最终计划更贴合现实的不同信息维度。当 selected_answers 非空或 clarification_state.force_plan_now 为 true 时，必须直接输出 type 为 "plan"，绝不能开启第二轮追问。`;

function shouldClarify({ answers, forcePlan }) {
  return !forcePlan && answers.length === 0;
}

function buildClarificationState({ questionCount, round, forcePlan, mustClarify }) {
  return {
    agent_mode: 'deep_context_planning_agent',
    analysis_mode: 'deep',
    max_focus_areas: MAXIMUM_FOCUS_AREAS,
    context_dimensions: ['预期结果', '当前进度', '硬性时间', '可用时间与精力', '现实阻碍', '已有资源', '协作依赖', '不可挪动安排'],
    workflow: ['一次获取完整上下文', '综合约束与冲突', '深入推理', '直接收束为最终计划'],
    asked_question_count: questionCount,
    remaining_question_count: Math.max(0, MAXIMUM_QUESTION_COUNT - questionCount),
    round,
    force_plan_now: forcePlan,
    must_clarify_before_planning: mustClarify,
    minimum_question_batch_size: mustClarify ? MINIMUM_QUESTION_COUNT : 0,
    maximum_question_batch_size: MAXIMUM_QUESTION_COUNT,
    allow_follow_up_round: false,
  };
}

function buildInstruction({ forcePlan, repairAttempt }) {
  if (forcePlan) {
    return '现在必须输出 type 为 plan 的最终计划，不要再提出问题。请在内部深入综合原始输入与全部选择，检查时间约束、现实阻碍、资源、依赖和安排冲突，让这些上下文真正改变计划；不要展示分析过程。';
  }
  return `用户主动选择了深度分析。现在必须一次性提出 ${MINIMUM_QUESTION_COUNT} 到 ${MAXIMUM_QUESTION_COUNT} 个具体选择题，不能少于 ${MINIMUM_QUESTION_COUNT} 个。问题要分别获取会帮助你深入规划的不同现实上下文。${repairAttempt ? `上一次返回的问题不足 ${MINIMUM_QUESTION_COUNT} 个或有问题未通过校验；这次请完整返回合规的 ${MINIMUM_QUESTION_COUNT} 到 ${MAXIMUM_QUESTION_COUNT} 题。` : ''}用户会在一个页面里一次回答完；收到答案后不得再追问，必须直接输出计划。不要询问隐私、诊断心理状态或重复已回答的信息。`;
}

export const deepAnalysisStrategy = {
  id: 'deep',
  routingContract,
  minimumQuestionCount: MINIMUM_QUESTION_COUNT,
  maximumQuestionCount: MAXIMUM_QUESTION_COUNT,
  shouldClarify,
  getReasoningStrategy: () => 'deep-max',
  buildClarificationState,
  buildInstruction,
  isQuestionBatchValid: ({ mustClarify, questionCount }) => !mustClarify || questionCount >= MINIMUM_QUESTION_COUNT,
  invalidQuestionMessage: `深度分析需要一次整理出 ${MINIMUM_QUESTION_COUNT} 到 ${MAXIMUM_QUESTION_COUNT} 个有效问题，请重新分析一次。`,
};
