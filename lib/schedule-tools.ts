import { supabase } from './supabase';

export async function getBusinessHours() {
  try {
    const { data, error } = await supabase
      .from('business_hours')
      .select('*')
      .order('day_of_week', { ascending: true });
      
    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateBusinessHours(id: number, data: any) {
  try {
    const { data: updated, error } = await supabase
      .from('business_hours')
      .update(data)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getScheduleBlocks() {
  try {
    const { data, error } = await supabase
      .from('schedule_blocks')
      .select('*')
      .order('block_date', { ascending: true })
      .order('start_time', { ascending: true });
      
    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createScheduleBlock(data: any) {
  try {
    const { data: newBlock, error } = await supabase
      .from('schedule_blocks')
      .insert([data])
      .select()
      .single();
      
    if (error) throw error;
    return { success: true, data: newBlock };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteScheduleBlock(id: string) {
  try {
    const { error } = await supabase
      .from('schedule_blocks')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
