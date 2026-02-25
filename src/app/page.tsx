'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plan, Cell, PlanWithCells, getCellType, ULTIMATE_GOAL_POSITION, SUB_GOAL_POSITIONS, MINI_GRID_CENTERS, CellStatus } from '@/types';

// Reverse mapping: outer grid center position -> sub-goal position
const OUTER_CENTER_TO_SUBGOAL: Record<number, number> = Object.entries(MINI_GRID_CENTERS).reduce(
  (acc, [subGoalPos, centerPos]) => {
    acc[centerPos] = Number(subGoalPos);
    return acc;
  },
  {} as Record<number, number>
);

export default function Home() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<PlanWithCells | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCell, setEditingCell] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  // Fetch plans on mount
  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      console.log('[UI] Fetching plans...');
      const res = await fetch('/api/plans');
      const data = await res.json();
      console.log('[UI] Plans fetched:', data.length);
      setPlans(data);

      // If there's at least one plan, load the first one
      if (data.length > 0) {
        fetchPlan(data[0].id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('[UI] Error fetching plans:', error);
      setLoading(false);
    }
  };

  const fetchPlan = async (planId: string) => {
    try {
      console.log('[UI] Fetching plan:', planId);
      const res = await fetch(`/api/plans/${planId}`);
      const data = await res.json();
      console.log('[UI] Plan fetched with', data.cells?.length, 'cells');
      setCurrentPlan(data);
      setLoading(false);
    } catch (error) {
      console.error('[UI] Error fetching plan:', error);
      setLoading(false);
    }
  };

  const updateCell = async (position: number, content: string | null, status?: CellStatus) => {
    if (!currentPlan) return;

    try {
      console.log('[UI] Updating cell at position:', position);
      const res = await fetch(`/api/plans/${currentPlan.id}/cells`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cells: [{ position, content, status }],
        }),
      });

      if (res.ok) {
        const updatedCells = await res.json();
        setCurrentPlan({ ...currentPlan, cells: updatedCells });
      }
    } catch (error) {
      console.error('[UI] Error updating cell:', error);
    }
  };

  const handleCellClick = (cell: Cell) => {
    setEditingCell(cell.position);
    setEditContent(cell.content || '');
  };

  const handleCellSave = () => {
    if (editingCell !== null) {
      updateCell(editingCell, editContent);
      setEditingCell(null);
      setEditContent('');
    }
  };

  const handleStatusChange = (cell: Cell) => {
    const statusOrder: CellStatus[] = ['pending', 'in_progress', 'completed', 'failed'];
    const currentIndex = statusOrder.indexOf(cell.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    updateCell(cell.position, cell.content, nextStatus);
  };

  // Calculate statistics
  const getStats = useCallback(() => {
    if (!currentPlan?.cells) return { total: 0, completed: 0, inProgress: 0, failed: 0, percentage: 0 };

    const actionCells = currentPlan.cells.filter(c => c.cell_type === 'action_item');
    const completed = actionCells.filter(c => c.status === 'completed').length;
    const inProgress = actionCells.filter(c => c.status === 'in_progress').length;
    const failed = actionCells.filter(c => c.status === 'failed').length;
    const total = actionCells.length;
    const percentage = total > 0 ? Math.round(((completed + inProgress) / total) * 100) : 0;

    return { total, completed, inProgress, failed, percentage };
  }, [currentPlan]);

  // Calculate D-Day
  const getDDay = () => {
    if (!currentPlan?.target_date) return null;
    const target = new Date(currentPlan.target_date);
    const today = new Date();
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const stats = getStats();
  const dDay = getDDay();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-[var(--primary)] animate-pulse">
            grid_view
          </span>
          <p className="mt-4 text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[var(--primary)]/10 bg-white/80 backdrop-blur-md px-6 md:px-12 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-[var(--primary)] p-2 rounded-xl text-white">
            <span className="material-symbols-outlined text-2xl">grid_view</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-[var(--primary)]">Mandalart</h2>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-[var(--primary)]/10 rounded-full transition-colors">
            <span className="material-symbols-outlined text-gray-600">notifications</span>
          </button>
          <button className="p-2 hover:bg-[var(--primary)]/10 rounded-full transition-colors">
            <span className="material-symbols-outlined text-gray-600">settings</span>
          </button>
          <div className="h-10 w-10 rounded-full border-2 border-[var(--primary)]/20 bg-[var(--primary)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[var(--primary)]">person</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] mx-auto w-full p-6 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* D-Day Card */}
          {currentPlan && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-[var(--primary)]/5 flex flex-col gap-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-6xl">event</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Countdown</p>
              <h3 className="text-4xl font-black text-[var(--primary)]">
                {dDay !== null ? (dDay >= 0 ? `D-${dDay}` : `D+${Math.abs(dDay)}`) : 'D-Day 없음'}
              </h3>
              <p className="text-sm text-gray-500">
                Target: {currentPlan.target_date || '설정 안됨'}
              </p>
              <div className="mt-4 w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[var(--primary)] h-full rounded-full transition-all"
                  style={{ width: `${stats.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Process Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-[var(--primary)]/5 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-800">PROCESS</h4>
              <span className="text-xs font-bold text-[var(--primary)]">{stats.percentage}% TOTAL</span>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <span className="material-symbols-outlined">check_circle</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-bold uppercase">Success</p>
                  <p className="text-lg font-bold">{stats.completed} <span className="text-sm font-normal text-gray-400">Items</span></p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                  <span className="material-symbols-outlined">pending</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-bold uppercase">In Progress</p>
                  <p className="text-lg font-bold">{stats.inProgress} <span className="text-sm font-normal text-gray-400">Items</span></p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                  <span className="material-symbols-outlined">cancel</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-bold uppercase">Failed</p>
                  <p className="text-lg font-bold">{stats.failed} <span className="text-sm font-normal text-gray-400">Items</span></p>
                </div>
              </div>
            </div>
            <button className="w-full py-3 bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)] font-bold rounded-xl transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">analytics</span>
              Full Statistics
            </button>
          </div>

          {/* My Plans Section */}
          {plans.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-[var(--primary)]/5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-800">MY PLANS</h4>
                <span className="text-xs font-bold text-gray-400">{plans.length}개</span>
              </div>
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => fetchPlan(plan.id)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      currentPlan?.id === plan.id
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <p className={`font-bold text-sm truncate ${currentPlan?.id === plan.id ? 'text-white' : 'text-gray-800'}`}>
                      {plan.title}
                    </p>
                    <p className={`text-xs truncate mt-1 ${currentPlan?.id === plan.id ? 'text-white/70' : 'text-gray-500'}`}>
                      {plan.core_objective || '목표 없음'}
                    </p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full py-2 border-2 border-dashed border-gray-200 hover:border-[var(--primary)] text-gray-500 hover:text-[var(--primary)] font-bold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                새 플랜 추가
              </button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          {currentPlan ? (
            <>
              {/* Plan Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-gray-900 leading-tight">{currentPlan.title}</h1>
                  <p className="text-gray-500 font-medium">Core Objective: {currentPlan.core_objective || '목표를 설정하세요'}</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-gray-50">
                    <span className="material-symbols-outlined text-sm">edit</span> Edit Grid
                  </button>
                  <button className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-[var(--primary)]/20">
                    <span className="material-symbols-outlined text-sm">share</span> Share Plan
                  </button>
                </div>
              </div>

              {/* Mandalart Grid */}
              <div className="bg-white p-4 md:p-8 rounded-3xl shadow-xl border border-[var(--primary)]/5">
                <MandalartGrid
                  cells={currentPlan.cells}
                  editingCell={editingCell}
                  editContent={editContent}
                  setEditContent={setEditContent}
                  onCellClick={handleCellClick}
                  onCellSave={handleCellSave}
                  onStatusChange={handleStatusChange}
                />

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-6 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-[var(--primary)]" />
                    <span>Ultimate Goal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-[var(--primary)]/30" />
                    <span>Sub-Goals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-[var(--primary)]/10" />
                    <span>Action Items</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <span className="material-symbols-outlined text-8xl text-[var(--primary)]/30">
                grid_view
              </span>
              <h2 className="text-2xl font-bold mt-6 text-gray-700">아직 플랜이 없어요</h2>
              <p className="text-gray-500 mt-2">새로운 만다라트 플랜을 만들어보세요!</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-6 px-6 py-3 bg-[var(--primary)] text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[var(--primary)]/20 hover:bg-[var(--primary-dark)]"
              >
                <span className="material-symbols-outlined">add</span>
                새 플랜 만들기
              </button>
            </div>
          )}
        </div>
      </main>

      {/* FAB */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-[var(--primary)] text-white rounded-full shadow-lg shadow-[var(--primary)]/30 flex items-center justify-center hover:bg-[var(--primary-dark)] transition-colors"
      >
        <span className="material-symbols-outlined text-2xl">add</span>
      </button>

      {/* Create Plan Modal */}
      {showCreateModal && (
        <CreatePlanModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(plan) => {
            setPlans([plan, ...plans]);
            fetchPlan(plan.id);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

// Mandalart Grid Component
function MandalartGrid({
  cells,
  editingCell,
  editContent,
  setEditContent,
  onCellClick,
  onCellSave,
  onStatusChange,
}: {
  cells: Cell[];
  editingCell: number | null;
  editContent: string;
  setEditContent: (content: string) => void;
  onCellClick: (cell: Cell) => void;
  onCellSave: () => void;
  onStatusChange: (cell: Cell) => void;
}) {
  const getCellByPosition = (position: number): Cell | undefined => {
    return cells.find(c => c.position === position);
  };

  const renderCell = (position: number) => {
    const cell = getCellByPosition(position);
    if (!cell) return null;

    const isUltimate = position === ULTIMATE_GOAL_POSITION;
    const isSubGoal = SUB_GOAL_POSITIONS.includes(position);
    const isOuterCenter = position in OUTER_CENTER_TO_SUBGOAL;
    const cellType = getCellType(position);

    // For outer center positions, get the corresponding sub-goal content
    let displayContent = cell.content || '';
    if (isOuterCenter) {
      const subGoalPosition = OUTER_CENTER_TO_SUBGOAL[position];
      const subGoalCell = getCellByPosition(subGoalPosition);
      displayContent = subGoalCell?.content || '';
    }

    const cellClass = isUltimate
      ? 'cell cell-ultimate'
      : isSubGoal || isOuterCenter
      ? 'cell cell-subgoal'
      : `cell cell-action ${cell.status}`;

    // Don't allow editing outer center cells (they mirror sub-goals)
    if (editingCell === position && !isOuterCenter) {
      return (
        <div className={cellClass}>
          <input
            type="text"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={onCellSave}
            onKeyDown={(e) => e.key === 'Enter' && onCellSave()}
            className="w-full h-full bg-transparent text-center text-xs outline-none"
            autoFocus
            maxLength={30}
          />
        </div>
      );
    }

    return (
      <div
        className={cellClass}
        onClick={() => !isOuterCenter && onCellClick(cell)}
        onContextMenu={(e) => {
          e.preventDefault();
          if (cellType === 'action_item' && !isOuterCenter) onStatusChange(cell);
        }}
        title={isOuterCenter ? '서브목표 (중앙 그리드에서 수정)' : cellType === 'action_item' ? '우클릭으로 상태 변경' : undefined}
      >
        {displayContent}
      </div>
    );
  };

  const renderMiniGrid = (startRow: number, startCol: number, isCenter: boolean = false) => {
    const positions = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        positions.push((startRow + r) * 9 + (startCol + c));
      }
    }

    return (
      <div className={`sub-grid ${isCenter ? 'center-grid' : ''}`}>
        {positions.map(pos => (
          <div key={pos}>{renderCell(pos)}</div>
        ))}
      </div>
    );
  };

  return (
    <div className="mandalart-grid">
      {/* Row 1 */}
      {renderMiniGrid(0, 0)}
      {renderMiniGrid(0, 3)}
      {renderMiniGrid(0, 6)}
      {/* Row 2 */}
      {renderMiniGrid(3, 0)}
      {renderMiniGrid(3, 3, true)} {/* Center grid */}
      {renderMiniGrid(3, 6)}
      {/* Row 3 */}
      {renderMiniGrid(6, 0)}
      {renderMiniGrid(6, 3)}
      {renderMiniGrid(6, 6)}
    </div>
  );
}

// Create Plan Modal Component
function CreatePlanModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (plan: Plan) => void;
}) {
  const [title, setTitle] = useState('');
  const [coreObjective, setCoreObjective] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCells, setAiCells] = useState<{ position: number; content: string }[] | null>(null);

  const handleAIRecommend = async () => {
    if (!coreObjective || coreObjective.trim().length < 5) {
      alert('AI 추천을 받으려면 핵심 목표를 5자 이상 입력해 주세요.');
      return;
    }

    setAiLoading(true);
    try {
      console.log('[UI] Requesting AI recommendation...');
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ core_objective: coreObjective }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'AI 추천을 불러오지 못했습니다.');
        return;
      }

      console.log('[UI] AI recommendation received:', data.cells?.length, 'cells');
      setAiCells(data.cells);
      setUseAI(true);
    } catch (error) {
      console.error('[UI] Error getting AI recommendation:', error);
      alert('AI 추천을 불러오지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!title) {
      alert('플랜 제목을 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      console.log('[UI] Creating plan...');
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          core_objective: coreObjective,
          target_date: targetDate || null,
          cells: useAI && aiCells ? aiCells : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || '플랜 생성에 실패했습니다.');
        return;
      }

      console.log('[UI] Plan created:', data.id);
      onCreated(data);
    } catch (error) {
      console.error('[UI] Error creating plan:', error);
      alert('플랜 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">새 플랜 만들기</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">플랜 제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: Dream Career 2024"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">핵심 목표</label>
            <input
              type="text"
              value={coreObjective}
              onChange={(e) => {
                setCoreObjective(e.target.value);
                setAiCells(null);
                setUseAI(false);
              }}
              placeholder="예: 2024년 시니어 UI/UX 디자이너 되기"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">목표 달성일</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={handleAIRecommend}
              disabled={aiLoading || coreObjective.trim().length < 5}
              className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:from-violet-600 hover:to-purple-700 transition-all"
            >
              {aiLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  AI가 추천 중...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  AI로 만다라트 채우기
                </>
              )}
            </button>
            {aiCells && (
              <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                AI 추천이 준비되었습니다! ({aiCells.length}개 항목)
              </p>
            )}
          </div>

        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !title}
            className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                생성 중...
              </>
            ) : (
              '생성하기'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
