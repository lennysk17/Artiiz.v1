
import React, { useState, useEffect } from 'react';
import { CreditCard, FileText, Send, ChevronRight, Clock, CheckCircle, Download, Mic, Sparkles, Plus, X, Save, Trash2, PenTool, Mail, CheckCircle2, Camera } from 'lucide-react';
import { Invoice, QuoteItem, UserProfile } from '../types';
import { jsPDF } from 'jspdf';
import VocalAssistant from '../components/VocalAssistant';
import SignatureModal from '../components/SignatureModal';
import { supabase } from '../services/supabaseClient';

interface GestionDashboardProps {
  profile: UserProfile;
}

const GestionDashboard: React.FC<GestionDashboardProps> = ({ profile }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);

  const fetchInvoices = async () => {
    setIsInvoicesLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        const mappedInvoices = data.map(i => ({
          id: i.invoice_number,
          dbId: i.id,
          client: i.client_name,
          clientEmail: i.client_email || '',
          amount: i.amount_ttc,
          amountHT: i.amount_ht,
          status: i.status as any,
          date: new Date(i.created_at).toLocaleDateString('fr-FR'),
          items: i.items || [],
          laborCost: i.labor_cost,
          travelCost: i.travel_cost,
          signature: i.signature,
          raw: i
        }));
        setInvoices(mappedInvoices);

        // Calcul du CA total (factures payées uniquement)
        const revenue = mappedInvoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
        setTotalRevenue(revenue);
      }
    } catch (err) {
      console.error("Erreur fetch invoices:", err);
    } finally {
      setIsInvoicesLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();

    const channel = supabase
      .channel('invoices-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => fetchInvoices())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);
  const [isVocalOpen, setIsVocalOpen] = useState(false);
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [pendingQuotes, setPendingQuotes] = useState<any[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);

  const fetchPendingInterventions = async () => {
    setIsLoadingPending(true);
    try {
      const { data, error } = await supabase
        .from('interventions')
        .select('*')
        .not('diag_photos', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        // Filtrer ceux qui n'ont pas encore de facture (simulation ici)
        const pending = data.filter(inter =>
          !invoices.some(inv => inv.client === inter.client_name)
        );
        setPendingQuotes(pending);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPending(false);
    }
  };

  useEffect(() => {
    fetchPendingInterventions();

    // Temps réel pour capter les nouveaux diagnostics clients
    const channel = supabase
      .channel('gestion-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'interventions' },
        () => fetchPendingInterventions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [invoices]);

  const calculateTotals = (invoice: Partial<Invoice>) => {
    const itemsHT = (invoice.items || []).reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const totalHT = itemsHT + (Number(invoice.laborCost) || 0) + (Number(invoice.travelCost) || 0);
    return {
      amountHT: Math.round(totalHT * 100) / 100,
      amount: Math.round(totalHT * 1.2 * 100) / 100 // TVA 20%
    };
  };

  const handleQuoteCreated = (data: any) => {
    const totals = calculateTotals(data);
    const newInvoice: Invoice = {
      id: `D24-0${invoices.length + 1}`,
      client: data.clientName,
      clientEmail: '',
      amount: totals.amount,
      amountHT: totals.amountHT,
      status: 'draft',
      date: new Date().toLocaleDateString('fr-FR'),
      items: data.items || [],
      laborCost: data.laborCost || 0,
      travelCost: data.travelCost || 0,
      startDate: data.startDate || 'À définir',
      duration: data.duration || 'À définir'
    };
    setInvoices([newInvoice, ...invoices]);
    setEditingInvoice(newInvoice);
  };

  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingInvoice) return;
    const totals = calculateTotals(editingInvoice);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .upsert({
          id: (editingInvoice as any).dbId, // uuid si existe
          invoice_number: editingInvoice.id,
          user_id: user.id,
          client_name: editingInvoice.client,
          client_email: editingInvoice.clientEmail,
          amount_ht: totals.amountHT,
          amount_ttc: totals.amount,
          status: editingInvoice.status,
          items: editingInvoice.items,
          labor_cost: editingInvoice.laborCost,
          travel_cost: editingInvoice.travelCost,
          signature: editingInvoice.signature
        });

      if (error) throw error;
      setEditingInvoice(null);
    } catch (err) {
      console.error("Save error:", err);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const handleSignatureSave = (signature: string) => {
    if (!editingInvoice) return;
    const updated: Invoice = {
      ...editingInvoice,
      signature,
      status: 'signed'
    };
    setInvoices(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
    setEditingInvoice(updated);
  };

  const convertToInvoice = () => {
    if (!editingInvoice) return;
    const updated: Invoice = {
      ...editingInvoice,
      id: editingInvoice.id.replace('D', 'F'),
      status: 'pending',
      date: new Date().toLocaleDateString('fr-FR')
    };
    setInvoices(prev => prev.map(inv => inv.id === editingInvoice.id ? updated : inv));
    setEditingInvoice(updated);
  };

  const sendByEmail = () => {
    setSendingEmail(true);
    setTimeout(() => {
      setSendingEmail(false);
      alert(`Facture envoyée avec succès à ${editingInvoice?.clientEmail || editingInvoice?.client}`);
    }, 2000);
  };

  const handleDelete = async (id: string) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;

    if (confirm("Supprimer ce document ?")) {
      const { error } = await supabase.from('invoices').delete().eq('id', (inv as any).dbId);
      if (error) console.error(error);
      setEditingInvoice(null); // Clear editing invoice if deleted
    }
  };
  const handleDownload = (invoice: Invoice) => {
    const doc = new jsPDF();
    const primary = [139, 92, 246];
    const textMain = [31, 41, 55];
    const secondary = [107, 114, 128];

    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, 0, 210, 50, 'F');

    if (profile.logoUrl) {
      try {
        doc.addImage(profile.logoUrl, 'PNG', 15, 7, 35, 35, undefined, 'FAST');
      } catch (e) { console.error(e); }
    } else {
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(32);
      doc.text("A", 20, 32);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(profile.companyName.toUpperCase(), 55, 25);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Gérant: ${profile.directorName}`, 55, 32);
    doc.text(profile.companyAddress, 55, 36);
    if (profile.siret) doc.text(`SIRET: ${profile.siret}`, 55, 40);

    doc.setTextColor(textMain[0], textMain[1], textMain[2]);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    const label = invoice.id.startsWith('D') ? "DEVIS" : "FACTURE";
    doc.text(`${label} N° ${invoice.id}`, 20, 75);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENT :", 135, 75);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.client, 135, 83);

    doc.setFontSize(10);
    doc.setTextColor(secondary[0], secondary[1], secondary[2]);
    doc.text(`Date : ${invoice.date}`, 20, 85);

    let y = 115;
    doc.setFillColor(248, 248, 250);
    doc.rect(20, y - 6, 170, 10, 'F');
    doc.setFont("helvetica", "bold");
    doc.setTextColor(textMain[0], textMain[1], textMain[2]);
    doc.text("DESCRIPTION", 25, y);
    doc.text("QTÉ", 110, y);
    doc.text("P.U. HT", 135, y);
    doc.text("TOTAL HT", 165, y);
    y += 12;

    doc.setFont("helvetica", "normal");
    invoice.items?.forEach((item) => {
      doc.text(item.description, 25, y);
      doc.text(item.quantity.toString(), 110, y);
      doc.text(`${item.unitPrice.toFixed(2)}€`, 135, y);
      doc.text(`${(item.quantity * item.unitPrice).toFixed(2)}€`, 165, y);
      y += 8;
    });

    if (invoice.laborCost) {
      doc.text("Main d'œuvre qualifiée", 25, y);
      doc.text("1", 110, y);
      doc.text(`${invoice.laborCost.toFixed(2)}€`, 135, y);
      doc.text(`${invoice.laborCost.toFixed(2)}€`, 165, y);
      y += 8;
    }
    if (invoice.travelCost) {
      doc.text("Déplacement & Logistique", 25, y);
      doc.text("1", 110, y);
      doc.text(`${invoice.travelCost.toFixed(2)}€`, 135, y);
      doc.text(`${invoice.travelCost.toFixed(2)}€`, 165, y);
      y += 8;
    }

    y += 15;
    doc.setDrawColor(230, 230, 235);
    doc.line(115, y, 190, y);
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL HT :", 115, y);
    doc.text(`${invoice.amountHT.toFixed(2)}€`, 190, y, { align: 'right' });
    y += 10;

    doc.setFontSize(12);
    doc.text("TOTAL TTC (TVA 20%) :", 115, y);
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(`${invoice.amount.toFixed(2)}€`, 190, y, { align: 'right' });

    if (invoice.signature) {
      y += 20;
      doc.setTextColor(secondary[0], secondary[1], secondary[2]);
      doc.setFontSize(8);
      doc.text("Accord client (Bon pour travaux) :", 135, y);
      doc.addImage(invoice.signature, 'PNG', 135, y + 5, 40, 20);
    }

    doc.setTextColor(secondary[0], secondary[1], secondary[2]);
    doc.setFontSize(8);
    doc.text(`Document généré via Artiiz`, 105, 285, { align: 'center' });
    doc.save(`${label}_${invoice.id}.pdf`);
  };

  return (
    <div className="space-y-8 pb-24 lg:pb-0 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Artiiz Gestion</h1>
          <p className="text-gray-500 dark:text-gray-400">Documents certifiés de {profile.companyName}</p>
        </div>
        <button
          onClick={() => setIsVocalOpen(true)}
          className="px-6 py-4 bg-accent text-white rounded-2xl shadow-xl shadow-accent/20 hover:scale-105 transition-all flex items-center gap-3"
        >
          <Mic size={22} />
          <span className="font-black text-sm uppercase tracking-wide">Nouveau Devis Vocal</span>
        </button>
      </div>

      <VocalAssistant isOpen={isVocalOpen} onClose={() => setIsVocalOpen(false)} onQuoteCreated={handleQuoteCreated} />
      <SignatureModal isOpen={isSignatureOpen} onClose={() => setIsSignatureOpen(false)} onSave={handleSignatureSave} />

      {/* Section : En attente de Devis (Opportunités) */}
      {pendingQuotes.length > 0 && (
        <div className="space-y-4 animate-in slide-in-from-top-4 duration-700">
          <h2 className="text-xs font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
            <Sparkles size={14} /> Opportunités - Devis à générer ({pendingQuotes.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingQuotes.map((inter) => (
              <div
                key={inter.id}
                className="p-6 bg-orange-500/5 border border-orange-500/20 rounded-[32px] flex items-center justify-between group hover:border-orange-500 transition-all cursor-pointer"
                onClick={() => {
                  handleQuoteCreated({
                    clientName: inter.client_name,
                    items: [{ description: `Réparation suite diagnostic ${inter.intervention_type}`, quantity: 1, unitPrice: 0 }]
                  });
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 relative">
                    <Camera size={24} />
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-white text-orange-500 text-[10px] font-black rounded-lg flex items-center justify-center border-2 border-orange-500">
                      {inter.diag_photos?.length || 0}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-gray-900 dark:text-white">{inter.client_name}</h3>
                    <p className="text-xs font-bold text-orange-500/70 uppercase tracking-widest">Diagnostic reçu • Prêt pour Devis</p>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-night-surface rounded-xl text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all">
                  <Plus size={24} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border shadow-sm">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Chiffre d'Affaires</p>
          <p className="text-3xl font-black text-green-500">
            {isInvoicesLoading ? '...' : `${totalRevenue.toLocaleString('fr-FR')} €`}
          </p>
        </div>
        <div className="p-6 rounded-3xl bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border shadow-sm">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">En attente</p>
          <p className="text-3xl font-black text-orange-500">{invoices.filter(i => i.status === 'draft' || i.status === 'signed').length}</p>
        </div>
        <div className="p-6 rounded-3xl bg-[#635BFF] text-white shadow-xl flex justify-between items-center group cursor-pointer overflow-hidden relative">
          <div className="relative z-10">
            <p className="text-xs font-black uppercase opacity-80 mb-1 tracking-widest">Paiement</p>
            <h3 className="text-xl font-black">Terminal Stripe</h3>
          </div>
          <CreditCard size={32} className="opacity-40 group-hover:scale-110 transition-transform" />
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-black flex items-center gap-2 text-gray-400 uppercase tracking-widest text-xs">Historique Documents</h2>
        <div className="grid grid-cols-1 gap-4">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              onClick={() => setEditingInvoice(inv)}
              className="p-5 rounded-3xl bg-day-surface dark:bg-night-surface border border-day-border dark:border-night-border shadow-sm flex items-center gap-4 hover:border-accent transition-all cursor-pointer group"
            >
              <div className={`p-4 rounded-2xl ${inv.status === 'paid' ? 'bg-green-500/10 text-green-500' :
                inv.status === 'signed' ? 'bg-blue-500/10 text-blue-500' : 'bg-accent/10 text-accent'
                }`}>
                {inv.status === 'paid' ? <CheckCircle size={24} /> : <FileText size={24} />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-lg group-hover:text-accent transition-colors">{inv.client}</h3>
                    <p className="text-xs font-mono text-gray-400">
                      {inv.id.startsWith('D') ? 'Devis' : 'Facture'} • {inv.id} • {inv.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black">{inv.amount.toFixed(2)} €</p>
                    {inv.status === 'signed' && <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded">Signé</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(inv); }}
                className="p-3 bg-gray-100 dark:bg-night-bg text-gray-500 rounded-xl hover:bg-accent hover:text-white transition-all"
              >
                <Download size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {editingInvoice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-day-surface dark:bg-night-surface w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-day-border dark:border-night-border flex justify-between items-center bg-day-bg/50 dark:bg-night-bg/50">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">
                  {editingInvoice.id.startsWith('D') ? 'Inspecteur de Devis' : 'Inspecteur de Facture'}
                </h2>
                <p className="text-xs font-mono text-gray-400">{editingInvoice.id}</p>
              </div>
              <button onClick={() => setEditingInvoice(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Client</label>
                  <input
                    value={editingInvoice.client}
                    onChange={e => setEditingInvoice({ ...editingInvoice, client: e.target.value })}
                    className="w-full bg-day-bg dark:bg-night-bg border border-day-border dark:border-night-border p-4 rounded-xl font-bold focus:border-accent outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Email Client</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="email"
                      value={editingInvoice.clientEmail}
                      onChange={e => setEditingInvoice({ ...editingInvoice, clientEmail: e.target.value })}
                      className="w-full pl-12 bg-day-bg dark:bg-night-bg border border-day-border dark:border-night-border p-4 rounded-xl font-bold focus:border-accent outline-none"
                      placeholder="client@mail.com"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Prestations</label>
                  <button type="button" onClick={() => setEditingInvoice({ ...editingInvoice, items: [...(editingInvoice.items || []), { description: 'Nouvelle ligne', quantity: 1, unitPrice: 0 }] })} className="text-accent text-xs font-black flex items-center gap-1">
                    <Plus size={14} /> AJOUTER
                  </button>
                </div>
                <div className="space-y-3">
                  {editingInvoice.items?.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-end">
                      <div className="flex-1 space-y-1">
                        <input
                          value={item.description}
                          onChange={e => {
                            const newItems = [...(editingInvoice.items || [])];
                            newItems[idx].description = e.target.value;
                            setEditingInvoice({ ...editingInvoice, items: newItems });
                          }}
                          className="w-full bg-day-bg dark:bg-night-bg border border-day-border dark:border-night-border p-3 rounded-xl text-sm font-semibold outline-none"
                        />
                      </div>
                      <div className="w-20 space-y-1">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => {
                            const newItems = [...(editingInvoice.items || [])];
                            newItems[idx].quantity = Number(e.target.value);
                            setEditingInvoice({ ...editingInvoice, items: newItems });
                          }}
                          className="w-full bg-day-bg dark:bg-night-bg border border-day-border dark:border-night-border p-3 rounded-xl text-sm font-semibold outline-none"
                        />
                      </div>
                      <div className="w-28 space-y-1">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={e => {
                            const newItems = [...(editingInvoice.items || [])];
                            newItems[idx].unitPrice = Number(e.target.value);
                            setEditingInvoice({ ...editingInvoice, items: newItems });
                          }}
                          className="w-full bg-day-bg dark:bg-night-bg border border-day-border dark:border-night-border p-3 rounded-xl text-sm font-semibold outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {editingInvoice.signature && (
                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-blue-500" size={20} />
                    <span className="text-xs font-black uppercase text-blue-500 tracking-widest">Accord Client Signé</span>
                  </div>
                  <img src={editingInvoice.signature} alt="Signature" className="h-10 bg-white p-1 rounded border border-blue-200" />
                </div>
              )}
            </form>

            <div className="px-8 py-6 bg-day-bg dark:bg-night-bg/50 border-t border-day-border dark:border-night-border">
              <div className="flex justify-between items-center mb-6">
                <div className="text-2xl font-black uppercase tracking-tighter">Total TTC: {calculateTotals(editingInvoice).amount} €</div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleDelete(editingInvoice.id)} className="p-4 text-red-500 hover:bg-red-500/10 rounded-2xl transition-colors">
                    <Trash2 size={24} />
                  </button>
                  <button type="button" onClick={() => handleDownload(editingInvoice)} className="p-4 bg-gray-100 dark:bg-white/10 rounded-2xl text-gray-500 hover:text-accent transition-all" title="Télécharger PDF">
                    <Download size={24} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {editingInvoice.id.startsWith('D') && !editingInvoice.signature && (
                  <button
                    onClick={() => setIsSignatureOpen(true)}
                    className="flex-1 py-4 bg-white dark:bg-night-bg border-2 border-accent text-accent rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-accent hover:text-white transition-all shadow-lg"
                  >
                    <PenTool size={20} /> Signer pour accord
                  </button>
                )}

                {editingInvoice.id.startsWith('D') && editingInvoice.signature && (
                  <button
                    onClick={convertToInvoice}
                    className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-green-500/20 hover:scale-105 transition-all"
                  >
                    <CheckCircle size={20} /> Transformer en Facture
                  </button>
                )}

                {editingInvoice.id.startsWith('F') && (
                  <button
                    onClick={sendByEmail}
                    disabled={sendingEmail}
                    className="flex-1 py-4 bg-accent text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-accent/20 hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {sendingEmail ? <Sparkles className="animate-spin" size={20} /> : <Mail size={20} />}
                    Envoyer Facture par Email
                  </button>
                )}

                <button
                  onClick={() => handleSaveEdit()}
                  className="flex-1 py-4 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionDashboard;
