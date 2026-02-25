import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CellStatus } from '@/types';

interface CellUpdate {
  position: number;
  content?: string | null;
  status?: CellStatus;
}

// PUT /api/plans/[id]/cells - Update multiple cells
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params;
  console.log('[API] PUT /api/plans/' + planId + '/cells');

  try {
    const body = await request.json();
    const { cells } = body as { cells: CellUpdate[] };

    if (!cells || !Array.isArray(cells)) {
      return NextResponse.json({ error: 'Cells array is required' }, { status: 400 });
    }

    console.log('[API] Updating', cells.length, 'cells');

    // Update each cell
    const updates = cells.map(async (cell) => {
      const updateData: Record<string, unknown> = {};
      if (cell.content !== undefined) updateData.content = cell.content;
      if (cell.status !== undefined) updateData.status = cell.status;

      const { error } = await supabase
        .from('cells')
        .update(updateData)
        .eq('plan_id', planId)
        .eq('position', cell.position);

      if (error) {
        console.error('[API] Error updating cell at position', cell.position, ':', error);
        throw error;
      }
    });

    await Promise.all(updates);

    // Fetch updated cells
    const { data: updatedCells, error: fetchError } = await supabase
      .from('cells')
      .select('*')
      .eq('plan_id', planId)
      .order('position', { ascending: true });

    if (fetchError) {
      console.error('[API] Error fetching updated cells:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    console.log('[API] Cells updated successfully');
    return NextResponse.json(updatedCells);
  } catch (err) {
    console.error('[API] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
