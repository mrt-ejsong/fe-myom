import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SUB_GOAL_POSITIONS, ULTIMATE_GOAL_POSITION, SUB_GOAL_TO_ACTION_POSITIONS, MINI_GRID_CENTERS } from '@/types';

interface AIRecommendation {
  sub_goals: string[];
  action_items: Record<string, string[]>;
}

// POST /api/ai/recommend - Generate AI recommendations for Mandalart
export async function POST(request: NextRequest) {
  console.log('[API] POST /api/ai/recommend - Generating AI recommendations');

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[API] GEMINI_API_KEY not configured');
      return NextResponse.json(
        { error: 'AI 서비스가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const body = await request.json();
    const { core_objective } = body;

    if (!core_objective || core_objective.trim().length < 5) {
      return NextResponse.json(
        { error: '목표를 조금 더 구체적으로 입력해 주세요. (예: 2024년 시니어 개발자 되기)' },
        { status: 400 }
      );
    }

    console.log('[API] Generating recommendations for:', core_objective);

    const prompt = `당신은 만다라트(Mandalart) 목표 설정 전문가입니다.

사용자의 핵심 목표: "${core_objective}"

이 핵심 목표를 달성하기 위한 만다라트를 생성해주세요.

규칙:
1. 8개의 서브 목표(sub_goals)를 생성하세요. 각각 2-3단어로 간결하게.
2. 각 서브 목표마다 8개의 실행 항목(action_items)을 생성하세요. 각각 15자 이내로 간결하게.
3. 실행 항목은 구체적이고 실행 가능해야 합니다.
4. 한국어로 작성하세요.

JSON 형식으로만 응답하세요 (다른 텍스트 없이 JSON만):
{
  "sub_goals": ["서브목표1", "서브목표2", "서브목표3", "서브목표4", "서브목표5", "서브목표6", "서브목표7", "서브목표8"],
  "action_items": {
    "서브목표1": ["실행1", "실행2", "실행3", "실행4", "실행5", "실행6", "실행7", "실행8"],
    "서브목표2": ["실행1", "실행2", "실행3", "실행4", "실행5", "실행6", "실행7", "실행8"],
    ...
  }
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    console.log('[API] Gemini response received');

    if (!responseText) {
      console.error('[API] Empty response from Gemini');
      return NextResponse.json(
        { error: 'AI 추천을 불러오지 못했습니다. 다시 시도해 주세요.' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let recommendation: AIRecommendation;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      recommendation = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('[API] Failed to parse Gemini response:', parseError);
      console.error('[API] Response text:', responseText);
      return NextResponse.json(
        { error: 'AI 응답을 처리하지 못했습니다. 다시 시도해 주세요.' },
        { status: 500 }
      );
    }

    // Validate the response
    if (!recommendation.sub_goals || recommendation.sub_goals.length !== 8) {
      console.error('[API] Invalid sub_goals count:', recommendation.sub_goals?.length);
      return NextResponse.json(
        { error: 'AI 추천 형식이 올바르지 않습니다. 다시 시도해 주세요.' },
        { status: 500 }
      );
    }

    // Convert to cells format
    const cells = [];

    // Ultimate goal (position 40)
    cells.push({
      position: ULTIMATE_GOAL_POSITION,
      content: core_objective.substring(0, 50),
    });

    // Sub-goals (positions 30, 31, 32, 39, 41, 48, 49, 50)
    for (let i = 0; i < 8; i++) {
      const subGoal = recommendation.sub_goals[i];
      const position = SUB_GOAL_POSITIONS[i];

      cells.push({
        position,
        content: subGoal.substring(0, 50),
      });

      // Action items for this sub-goal
      const actionItems = recommendation.action_items[subGoal] || [];
      const actionPositions = SUB_GOAL_TO_ACTION_POSITIONS[position];

      // Filter out the center position (where sub-goal label appears in outer grids)
      const centerPos = MINI_GRID_CENTERS[position];
      const availablePositions = actionPositions.filter(p => p !== centerPos);

      for (let j = 0; j < Math.min(8, availablePositions.length); j++) {
        if (actionItems[j]) {
          cells.push({
            position: availablePositions[j],
            content: actionItems[j].substring(0, 50),
          });
        }
      }
    }

    console.log('[API] Generated', cells.length, 'cells from AI recommendation');

    return NextResponse.json({
      recommendation,
      cells,
    });
  } catch (err) {
    console.error('[API] Unexpected error:', err);
    return NextResponse.json(
      { error: 'AI 추천을 불러오지 못했습니다. 다시 시도해 주세요.' },
      { status: 500 }
    );
  }
}
