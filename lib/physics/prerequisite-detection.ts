import {
  CONCEPT_NODES,
  getNodeById,
  getPrerequisiteChain,
  getMasteryLevel,
  type MasteryOverlay,
} from "./knowledge-graph";

export interface PrerequisiteGap {
  weakNode: string;
  weakNodeName: string;
  weakMastery: number;
  affectedNode: string;
  affectedNodeName: string;
  recommendation: string;
}

export interface StudyRecommendation {
  nodeId: string;
  nodeName: string;
  reason: string;
  priority: number; // higher = more urgent
}

export function detectPrerequisiteGaps(
  masteryData: MasteryOverlay[]
): PrerequisiteGap[] {
  const masteryMap = new Map(masteryData.map((m) => [m.nodeId, m]));
  const gaps: PrerequisiteGap[] = [];

  for (const node of CONCEPT_NODES) {
    const nodeMastery = masteryMap.get(node.id);
    if (!nodeMastery || nodeMastery.attempts === 0) continue;

    // Only check nodes the student is actively struggling with
    if (nodeMastery.mastery >= 0.6) continue;

    // Check each prerequisite
    for (const prereqId of node.prerequisites) {
      const prereqMastery = masteryMap.get(prereqId);
      const prereqNode = getNodeById(prereqId);
      if (!prereqNode) continue;

      const prereqScore = prereqMastery?.mastery ?? 0;
      const prereqAttempts = prereqMastery?.attempts ?? 0;

      // Gap: prerequisite is weak or untouched
      if (prereqAttempts === 0 || prereqScore < 0.6) {
        gaps.push({
          weakNode: prereqId,
          weakNodeName: prereqNode.name,
          weakMastery: prereqScore,
          affectedNode: node.id,
          affectedNodeName: node.name,
          recommendation:
            prereqAttempts === 0
              ? `You haven't studied "${prereqNode.name}" yet — it's needed for "${node.name}"`
              : `Strengthen "${prereqNode.name}" (${Math.round(prereqScore * 100)}%) to improve at "${node.name}"`,
        });
      }
    }
  }

  // Sort by impact: gaps that affect the most downstream nodes first
  gaps.sort((a, b) => {
    const aDownstream = countDownstream(a.weakNode);
    const bDownstream = countDownstream(b.weakNode);
    return bDownstream - aDownstream;
  });

  return gaps;
}

function countDownstream(nodeId: string): number {
  const visited = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const node of CONCEPT_NODES) {
      if (node.prerequisites.includes(current) && !visited.has(node.id)) {
        visited.add(node.id);
        queue.push(node.id);
      }
    }
  }
  return visited.size;
}

export function getStudyRecommendations(
  masteryData: MasteryOverlay[]
): StudyRecommendation[] {
  const masteryMap = new Map(masteryData.map((m) => [m.nodeId, m]));
  const recommendations: StudyRecommendation[] = [];
  const seen = new Set<string>();

  // Priority 1: Untouched prerequisites of topics the student is working on
  for (const node of CONCEPT_NODES) {
    const nodeMastery = masteryMap.get(node.id);
    if (!nodeMastery || nodeMastery.attempts === 0) continue;

    for (const prereqId of node.prerequisites) {
      const prereqMastery = masteryMap.get(prereqId);
      if ((!prereqMastery || prereqMastery.attempts === 0) && !seen.has(prereqId)) {
        const prereqNode = getNodeById(prereqId);
        if (!prereqNode) continue;
        seen.add(prereqId);
        recommendations.push({
          nodeId: prereqId,
          nodeName: prereqNode.name,
          reason: `Required for ${node.name}`,
          priority: 3,
        });
      }
    }
  }

  // Priority 2: Weak prerequisites blocking current progress
  const gaps = detectPrerequisiteGaps(masteryData);
  for (const gap of gaps) {
    if (seen.has(gap.weakNode)) continue;
    seen.add(gap.weakNode);
    recommendations.push({
      nodeId: gap.weakNode,
      nodeName: gap.weakNodeName,
      reason: gap.recommendation,
      priority: 2,
    });
  }

  // Priority 3: Next natural nodes to learn (all prereqs mastered)
  for (const node of CONCEPT_NODES) {
    const nodeMastery = masteryMap.get(node.id);
    if (nodeMastery && nodeMastery.attempts > 0) continue;
    if (seen.has(node.id)) continue;

    const allPrereqsMet = node.prerequisites.every((prereqId) => {
      const m = masteryMap.get(prereqId);
      return m && m.mastery >= 0.6;
    });

    if (allPrereqsMet && node.prerequisites.length > 0) {
      recommendations.push({
        nodeId: node.id,
        nodeName: node.name,
        reason: "You've mastered the prerequisites — ready to learn this",
        priority: 1,
      });
    }
  }

  recommendations.sort((a, b) => b.priority - a.priority);
  return recommendations;
}

export function computeNodeMasteryFromProgress(
  topicProgress: Array<{
    topic: string;
    questions_attempted: number;
    questions_correct: number;
    last_studied_at: string | null;
  }>,
  attempts: Array<{
    is_correct: boolean;
    question_topic: string;
    question_subtopic: string | null;
  }>
): MasteryOverlay[] {
  const topicAccuracy = new Map<string, { correct: number; total: number; lastStudied: string | null }>();

  for (const tp of topicProgress) {
    topicAccuracy.set(tp.topic, {
      correct: tp.questions_correct,
      total: tp.questions_attempted,
      lastStudied: tp.last_studied_at,
    });
  }

  const subtopicAccuracy = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) {
    const key = (a.question_subtopic ?? a.question_topic).toLowerCase();
    const existing = subtopicAccuracy.get(key) ?? { correct: 0, total: 0 };
    existing.total++;
    if (a.is_correct) existing.correct++;
    subtopicAccuracy.set(key, existing);
  }

  return CONCEPT_NODES.map((node) => {
    // Try subtopic-level match first for per-node granularity
    let nodeCorrect = 0;
    let nodeTotal = 0;
    for (const key of node.subtopicKeys) {
      const stats = subtopicAccuracy.get(key.toLowerCase());
      if (stats) {
        nodeCorrect += stats.correct;
        nodeTotal += stats.total;
      }
    }

    // Fall back to topic-level if no subtopic data exists for this node
    if (nodeTotal === 0) {
      const topicData = topicAccuracy.get(node.topic);
      nodeTotal = topicData?.total ?? 0;
      nodeCorrect = topicData?.correct ?? 0;
    }

    const mastery = nodeTotal > 0 ? nodeCorrect / nodeTotal : 0;
    const topicData = topicAccuracy.get(node.topic);

    return {
      nodeId: node.id,
      mastery,
      attempts: nodeTotal,
      lastStudied: topicData?.lastStudied ?? null,
    };
  });
}
