export type User = { id: string; name: string; email: string; role: string };

export type PartnerContact = {
  id: string;
  name: string;
  department?: string | null;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type Partner = {
  id: string;
  partnerCode?: string | null;
  companyName: string;
  npwp?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
  contacts?: PartnerContact[];
};

export type ProjectOrigin = {
  id?: string;
  externalReference?: string | null;
  emailSubject?: string | null;
  senderName?: string | null;
  senderEmail?: string | null;
  receivedAt?: string | null;
  quotationDeadline?: string | null;
  notes?: string | null;
};

export type QuotationItem = {
  id?: string;
  lineNo?: number;
  description: string;
  partNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  origin?: string | null;
  qty: string | number;
  uom: string;
  unitPrice: string | number;
  lineTotal?: string | number;
  notes?: string | null;
};

export type Quotation = {
  id: string;
  quotationNo: string;
  revisionNo: number;
  quotationDate: string;
  validUntil?: string | null;
  rfqNo?: string | null;
  subject?: string | null;
  currency: string;
  subtotal: string | number;
  discountRate?: string | number | null;
  discountAmount: string | number;
  taxRate?: string | number | null;
  taxBase: string | number;
  taxAmount: string | number;
  grandTotal: string | number;
  deliveryTerm?: string | null;
  deliveryTime?: string | null;
  paymentTerm?: string | null;
  certificateTerm?: string | null;
  additionalNotes?: string | null;
  status: string;
  items: QuotationItem[];
};

export type PurchaseOrderItem = {
  id: string;
  lineNo: number;
  description: string;
  partNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  qtyOrdered: string | number;
  uom: string;
  unitPrice: string | number;
  lineTotal: string | number;
};

export type PurchaseOrder = {
  id: string;
  poNo: string;
  poDate: string;
  prNo?: string | null;
  requestorName?: string | null;
  currency: string;
  subtotal: string | number;
  taxIncluded: boolean;
  taxAmount: string | number;
  grandTotal: string | number;
  status: string;
  buyer?: Partner;
  billTo?: Partner | null;
  shipTo?: Partner | null;
  receivingParty?: Partner | null;
  quotationId?: string | null;
  items: PurchaseOrderItem[];
  documents?: DocumentRecord[];
};

export type DeliveryOrderItem = {
  id: string;
  purchaseOrderItemId: string;
  qtyDelivered: string | number;
  notes?: string | null;
  purchaseOrderItem?: PurchaseOrderItem;
};

export type DeliveryOrder = {
  id: string;
  purchaseOrderId: string;
  doNo: string;
  doDate: string;
  status: string;
  deliveryAddress?: string | null;
  deliveryContact?: string | null;
  vehicleNo?: string | null;
  driverName?: string | null;
  receivedAt?: string | null;
  items: DeliveryOrderItem[];
  documents?: DocumentRecord[];
};

export type Payment = {
  id: string;
  invoiceId?: string;
  paymentDate: string;
  amount: string | number;
  paymentMethod: string;
  referenceNo?: string | null;
  notes?: string | null;
  documents?: DocumentRecord[];
};

export type Receipt = {
  id: string;
  invoiceId: string;
  receiptNo: string;
  receiptDate: string;
  receivedFrom: string;
  amount: string | number;
  amountInWords: string;
  description?: string | null;
  status: string;
  finalizedAt?: string | null;
  documents?: DocumentRecord[];
};

export type TaxDocument = {
  id: string;
  invoiceId: string;
  documentNo?: string | null;
  documentDate?: string | null;
  status: string;
  uploadedAt: string;
  verifiedById?: string | null;
  verifiedAt?: string | null;
  documents?: DocumentRecord[];
};

export type Invoice = {
  id: string;
  purchaseOrderId: string;
  invoiceNo: string;
  invoiceDate: string;
  status: string;
  currency: string;
  subtotal: string | number;
  taxRate?: string | number | null;
  taxBase: string | number;
  taxAmount: string | number;
  grandTotal: string | number;
  dueDate?: string | null;
  finalizedAt?: string | null;
  payments?: Payment[];
  receipt?: Receipt | null;
  taxDocuments?: TaxDocument[];
  documents?: DocumentRecord[];
  deliveryLinks?: Array<{ deliveryOrder?: DeliveryOrder }>;
};

export type Project = {
  id: string;
  gmtReference: string;
  projectName: string;
  sourceType: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  workflowStatus: string;
  customer: Partner;
  projectOwner?: User;
  createdBy?: User;
  origin?: ProjectOrigin | null;
  quotations?: Quotation[];
  purchaseOrders?: PurchaseOrder[];
  invoices?: Invoice[];
};

export type DocumentRecord = {
  id: string;
  documentType: string;
  originalFilename: string;
  mimeType: string;
  fileSize: string | number;
  uploadedAt: string;
  notes?: string | null;
  deliveryOrderId?: string | null;
  purchaseOrderId?: string | null;
  invoiceId?: string | null;
};

export type Activity = {
  id: string;
  action: string;
  entityType: string;
  description: string;
  createdAt: string;
  user?: User;
};
