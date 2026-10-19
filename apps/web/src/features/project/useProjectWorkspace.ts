import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { Activity, DeliveryOrder, DocumentRecord, Invoice, Project, PurchaseOrder, Quotation } from '../../types';

export type WorkspaceData = {
  project: Project;
  quotations: Quotation[];
  purchaseOrders: PurchaseOrder[];
  deliveryOrders: DeliveryOrder[];
  invoices: Invoice[];
  documents: DocumentRecord[];
  activity: Activity[];
};

export function useProjectWorkspace(projectId?: string) {
  const [data,setData]=useState<WorkspaceData|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const reload=useCallback(async()=>{ if(!projectId)return; setLoading(true); setError(''); try{
    const [project,quotations,purchaseOrders,invoices,documents,activity]=await Promise.all([
      api<Project>(`/projects/${projectId}`), api<Quotation[]>(`/projects/${projectId}/quotations`), api<PurchaseOrder[]>(`/projects/${projectId}/purchase-orders`), api<Invoice[]>(`/projects/${projectId}/invoices`), api<DocumentRecord[]>(`/projects/${projectId}/documents`), api<Activity[]>(`/projects/${projectId}/activity`),
    ]);
    const doGroups=await Promise.all(purchaseOrders.map(po=>api<DeliveryOrder[]>(`/purchase-orders/${po.id}/delivery-orders`)));
    setData({project,quotations,purchaseOrders,deliveryOrders:doGroups.flat(),invoices,documents,activity});
  }catch(e){setError(e instanceof Error?e.message:'Gagal memuat project');}finally{setLoading(false);}},[projectId]);
  useEffect(()=>{reload();},[reload]); return {data,loading,error,reload};
}
