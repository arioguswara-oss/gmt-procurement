import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorBox, PageHeader } from '../components/Ui';
import { StatusBadge } from '../components/StatusBadge';
import { ActivityTab } from '../features/project/ActivityTab';
import { BillingTab } from '../features/project/BillingTab';
import { DeliveryTab } from '../features/project/DeliveryTab';
import { DocumentsTab } from '../features/project/DocumentsTab';
import { OverviewTab } from '../features/project/OverviewTab';
import { PurchaseOrdersTab } from '../features/project/PurchaseOrdersTab';
import { QuotationTab } from '../features/project/QuotationTab';
import { useProjectWorkspace } from '../features/project/useProjectWorkspace';

const tabs=[['overview','Overview'],['quotation','Quotation'],['po','Purchase Order'],['delivery','Delivery'],['billing','Invoice & Billing'],['documents','Documents'],['activity','Activity']];
export default function ProjectPage(){const {projectId}=useParams();const {data,loading,error,reload}=useProjectWorkspace(projectId);const [tab,setTab]=useState('overview');if(loading)return <div className="app-loading">Memuat project...</div>;if(!data)return <><ErrorBox error={error||'Project tidak ditemukan'}/><Link to="/projects">Kembali ke Projects</Link></>;
 return <><PageHeader title={data.project.gmtReference} subtitle={data.project.projectName} actions={<StatusBadge status={data.project.workflowStatus}/>} /><div className="project-summary"><span><b>Customer</b>{data.project.customer.companyName}</span><span><b>Owner</b>{data.project.projectOwner?.name||'-'}</span><span><b>Source</b>{data.project.sourceType.replaceAll('_',' ')}</span></div><div className="tabs">{tabs.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}</div><ErrorBox error={error}/><div className="tab-content">{tab==='overview'&&<OverviewTab data={data}/>} {tab==='quotation'&&<QuotationTab data={data} reload={reload}/>} {tab==='po'&&<PurchaseOrdersTab data={data} reload={reload}/>} {tab==='delivery'&&<DeliveryTab data={data} reload={reload}/>} {tab==='billing'&&<BillingTab data={data} reload={reload}/>} {tab==='documents'&&<DocumentsTab data={data} reload={reload}/>} {tab==='activity'&&<ActivityTab data={data}/>}</div></>;
}
