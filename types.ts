
export interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  response?: string;
}

export interface UserProfile {
  companyName: string;
  companyAddress: string;
  directorName: string;
  siret: string;
  logoUrl?: string;
  avatarUrl?: string;
  gmbConnected: boolean;
  gmbData?: any;
  autoReplyEnabled: boolean;
  influenceRadius: number; // En kilomètres
  lat?: number;
  lng?: number;
  selectedDepartments: string[]; // Codes postaux/départements (ex: ["75", "92", "78"])
}

export interface Intervention {
  id: string;
  client: string;
  location: string;
  time: string;
  status: 'completed' | 'ongoing' | 'missed';
  type: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'urgent' | 'info' | 'success';
  time: string;
  read: boolean;
}

export interface Invoice {
  id: string;
  client: string;
  clientEmail?: string;
  amount: number; // TTC total
  amountHT: number;
  status: 'paid' | 'pending' | 'draft' | 'signed';
  date: string;
  items?: QuoteItem[];
  laborCost?: number;
  travelCost?: number;
  startDate?: string;
  duration?: string;
  companyAddress?: string;
  signature?: string; // Base64 signature image
}

export type DashboardView = 'vision' | 'action' | 'gestion' | 'profile';
