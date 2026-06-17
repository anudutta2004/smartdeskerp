/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// User and Session Roles
export enum UserRole {
  ADMIN = "Admin",
  EMPLOYEE = "Employee",
}

export interface SmartDeskUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  mobile: string;
  position: string;
  address: string;
  joiningDate: string;
  status: "Active" | "Disabled";
  passwordHash?: string; 
  monthlySalary: number; // Added for Module 8 (HR & Payroll)
  baseSalary?: number;
  bankAccount?: string;
}

// Module 3: Inventory Management
export interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  supplier: string;
  barcode: string;
  gstRate: number; // Added for Indian GST calculations (e.g. 18 for 18%)
}

// Module 5: Customer Management
export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  address: string;
  createdAt: string;
}

// Module 6: Supplier Management
export interface Supplier {
  id: string;
  name: string;
  mobile: string;
  gstNumber: string;
  address: string;
}

// Purchase Item
export interface PurchaseItem {
  productId: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  total: number;
}

// Purchase Entry
export interface PurchaseEntry {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  date: string;
  createdBy: string;
  status: "Completed" | "Returned";
}

// Module 4: Sales Invoice Items
export interface SalesInvoiceItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  total: number;
}

// Module 4: Sales Invoice & POS Billing
export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  companyName: string;
  customerName: string;
  customerMobile: string; // Customer Mobile Number added for Module 4
  customerId: string; // "walk-in" or registered customer id
  items: SalesInvoiceItem[];
  subtotal: number;
  cgst: number; // Indian CGST
  sgst: number; // Indian SGST
  igst: number; // Indian IGST
  gstAmount: number; // Total GST collected
  totalAmount: number;
  paymentMethod: "Cash" | "Card" | "UPI" | string; // Payment Method added for Module 4
  createdAt: string;
  createdBy: string; // Username of employee or admin
  status: "Paid" | "Returned";
}

// Module 7: Expense Management
export interface Expense {
  id: string;
  category: "Rent" | "Salary" | "Electricity" | "Internet" | "Transport" | "Maintenance" | string;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  createdBy?: string;
}

// Module 8: Attendance Record
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  status: "Present" | "Absent" | "Half Day" | "Leave";
}

// Module 8: Payroll Record
export interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string; // YYYY-MM
  baseSalary: number;
  bonus: number;
  deductions: number;
  netPaid: number;
  paymentDate: string;
  status: "Paid" | "Pending";
}

// System Settings Entity
export interface SystemSettings {
  companyName: string;
  logoText: string;
  logoBgColor: string; // Hex code or tailwind color
  gstNumber: string;
  businessAddress: string;
  contactNumber: string;
  invoicePrefix: string;
  userManagementActive: boolean;
}

// Module Return & Replacement Types
export type ReturnReason = "Defective Product" | "Damaged Product" | "Wrong Product Delivered" | "Customer Changed Mind" | "Expired Product" | "Other";
export type ReturnAction = "Refund" | "Replacement" | "Store Credit";

export interface ReturnRecord {
  id: string;
  returnNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerMobile?: string;
  productId: string;
  productName: string;
  quantity: number;
  returnReason: ReturnReason;
  actionChosen: ReturnAction;
  totalRefundAmount: number;
  status: "Pending Approval" | "Approved" | "Rejected";
  createdBy: string;
  createdAt: string;
}

export interface ReplacementRecord {
  id: string;
  replacementNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerMobile?: string;
  oldProductId: string;
  oldProductName: string;
  oldProductQuantity: number;
  newProductId: string;
  newProductName: string;
  newProductQuantity: number;
  priceDifference: number; // Balance to be paid or refunded
  createdBy: string;
  createdAt: string;
  status: "Completed";
}

// Security: Activity Ledger
export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

// Full Database State encapsulation for SmartDeskERP
export interface ERPDatabaseState {
  users: SmartDeskUser[];
  inventory: InventoryProduct[];
  customers: Customer[];
  suppliers: Supplier[]; // New
  purchases: PurchaseEntry[]; // New
  attendance: AttendanceRecord[]; // New
  payroll: PayrollRecord[]; // New
  expenses: Expense[];
  settings: SystemSettings; // New
  logs: ActivityLog[];
  sales: SalesInvoice[]; // sales was missing from the written type originally but is fully utilized
  returns?: ReturnRecord[];
  replacements?: ReplacementRecord[];
}
