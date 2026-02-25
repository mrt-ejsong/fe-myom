import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getCellType } from '@/types';

// GET /api/plans - Get all plans
export async function GET() {
  console.log('[API] GET /api/plans - Fetching all plans');

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API] Error fetching plans:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[API] Plans fetched successfully, count:', data?.length || 0);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/plans - Create a new plan
export async function POST(request: NextRequest) {
  console.log('[API] POST /api/plans - Creating new plan');

  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { title, core_objective, target_date, cells } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Create the plan
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .insert({
        title,
        core_objective,
        target_date,
      })
      .select()
      .single();

    if (planError) {
      console.error('[API] Error creating plan:', planError);
      return NextResponse.json({ error: planError.message }, { status: 500 });
    }

    console.log('[API] Plan created with ID:', plan.id);

    // Create cells (81 cells for 9x9 grid)
    const cellsToInsert = [];

    if (cells && Array.isArray(cells)) {
      // Use provided cells (from AI recommendation)
      for (let i = 0; i < 81; i++) {
        const providedCell = cells.find((c: { position: number }) => c.position === i);
        cellsToInsert.push({
          plan_id: plan.id,
          position: i,
          content: providedCell?.content || null,
          cell_type: getCellType(i),
          status: 'pending',
        });
      }
    } else {
      // Create empty cells
      for (let i = 0; i < 81; i++) {
        cellsToInsert.push({
          plan_id: plan.id,
          position: i,
          content: null,
          cell_type: getCellType(i),
          status: 'pending',
        });
      }
    }

    const { error: cellsError } = await supabase
      .from('cells')
      .insert(cellsToInsert);

    if (cellsError) {
      console.error('[API] Error creating cells:', cellsError);
      // Rollback: delete the plan
      await supabase.from('plans').delete().eq('id', plan.id);
      return NextResponse.json({ error: cellsError.message }, { status: 500 });
    }

    console.log('[API] Cells created successfully, count:', cellsToInsert.length);

    return NextResponse.json(plan, { status: 201 });
  } catch (err) {
    console.error('[API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
