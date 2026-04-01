import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface SOP {
  id: string
  index: number
  name: string
}

export interface SOPItem {
  id: string
  sop_id: string
  item_index: number
  name: string
  scope: string | null
  outcome: string | null
  primary_owner: string | null
  secondary_owner: string | null
  role_access_level: number | null
  is_active: boolean | null
  attachment_link: string | null
  value: string | null
}

export interface SOPSubItem {
  id: string
  item_id: string
  sub_item_index: number
  name: string
  value: string | null
}

export interface SOPItemWithSubs extends SOPItem {
  sub_items: SOPSubItem[]
}

export interface SOPWithItems extends SOP {
  items: SOPItemWithSubs[]
}

async function fetchSOPs(): Promise<SOPWithItems[]> {
  const [sopsRes, itemsRes, subItemsRes] = await Promise.all([
    supabase.from('sops').select('*').order('index'),
    supabase.from('sop_items').select('*').order('item_index'),
    supabase.from('sop_sub_items').select('*').order('sub_item_index'),
  ])

  if (sopsRes.error) throw sopsRes.error
  if (itemsRes.error) throw itemsRes.error
  if (subItemsRes.error) throw subItemsRes.error

  const sops = sopsRes.data as SOP[]
  const items = (itemsRes.data as SOPItem[]).filter((i) => i.is_active === true)
  const subItems = subItemsRes.data as SOPSubItem[]

  // Group sub-items by item_id
  const subsByItem = new Map<string, SOPSubItem[]>()
  for (const sub of subItems) {
    const list = subsByItem.get(sub.item_id) ?? []
    list.push(sub)
    subsByItem.set(sub.item_id, list)
  }

  // Group items by sop_id, attach sub-items
  const itemsBySop = new Map<string, SOPItemWithSubs[]>()
  for (const item of items) {
    const withSubs: SOPItemWithSubs = {
      ...item,
      sub_items: subsByItem.get(item.id) ?? [],
    }
    const list = itemsBySop.get(item.sop_id) ?? []
    list.push(withSubs)
    itemsBySop.set(item.sop_id, list)
  }

  return sops.map((sop) => ({
    ...sop,
    items: itemsBySop.get(sop.id) ?? [],
  }))
}

export function useSOPs() {
  return useQuery({
    queryKey: ['sops'],
    queryFn: fetchSOPs,
  })
}
