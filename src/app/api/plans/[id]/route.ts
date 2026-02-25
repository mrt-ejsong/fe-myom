import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/plans/[id] - Get a single plan with cells
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[API] GET /api/plans/' + id);

  try {
    // Fetch plan
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', id)
      .single();

    if (planError) {
      console.error('[API] Error fetching plan:', planError);
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Fetch cells
    const { data: cells, error: cellsError } = await supabase
      .from('cells')
      .select('*')
      .eq('plan_id', id)
      .order('position', { ascending: true });

    if (cellsError) {
      console.error('[API] Error fetching cells:', cellsError);
      return NextResponse.json({ error: cellsError.message }, { status: 500 });
    }

    console.log('[API] Plan fetched with', cells?.length || 0, 'cells');

    return NextResponse.json({ ...plan, cells });
  } catch (err) {
    console.error('[API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/plans/[id] - Update a plan
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[API] PUT /api/plans/' + id);

  try {
    const body = await request.json();
    const { title, core_objective, target_date } = body;

    const { data, error } = await supabase
      .from('plans')
      .update({ title, core_objective, target_date })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[API] Error updating plan:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[API] Plan updated successfully');
    return NextResponse.json(data);
  } catch (err) {
    console.error('[API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/plans/[id] - Delete a plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[API] DELETE /api/plans/' + id);

  try {
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[API] Error deleting plan:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[API] Plan deleted successfully');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
