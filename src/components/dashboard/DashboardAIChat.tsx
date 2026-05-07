import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KPIData, Tunnel, Charges, Salary, CoachingExpense } from '@/types/business';
import { toast } from '@/hooks/use-toast';

interface DashboardAIChatProps {
  kpis: KPIData;
  tunnels: Tunnel[];
  allTunnels?: Tunnel[];
  charges: Charges;
  salaries: Salary[];
  coachingExpenses: CoachingExpense[];
  selectedMonth: string;
}

type Msg = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  "Quel tunnel est le plus rentable globalement ?",
  "Compare les 3 derniers mois",
  "Quel est mon meilleur closer ?",
  "Quels clients ont des paiements en retard ?",
];

export function DashboardAIChat({ kpis, tunnels, allTunnels = [], charges, salaries, coachingExpenses, selectedMonth }: DashboardAIChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const buildContext = () => {
    const sourceTunnels = allTunnels.length > 0 ? allTunnels : tunnels;

    // Aggregate per-month summary across ALL data
    const monthMap = new Map<string, {
      month: string;
      tunnelsCount: number;
      adBudget: number;
      callsGenerated: number;
      callsClosed: number;
      salesCount: number;
      contracted: number;
      collected: number;
      refunded: number;
    }>();

    for (const t of sourceTunnels) {
      const m = monthMap.get(t.month) ?? {
        month: t.month, tunnelsCount: 0, adBudget: 0, callsGenerated: 0, callsClosed: 0,
        salesCount: 0, contracted: 0, collected: 0, refunded: 0,
      };
      m.tunnelsCount += 1;
      m.adBudget += t.adBudget || 0;
      m.callsGenerated += t.callsGenerated || 0;
      m.callsClosed += t.callsClosed || 0;
      m.salesCount += t.sales.length;
      m.contracted += t.sales.reduce((s, x) => s + x.totalPrice - (x.refundedAmount || 0), 0);
      m.collected += t.sales.reduce((s, x) => s + x.amountCollected - (x.refundedAmount || 0), 0);
      m.refunded += t.sales.reduce((s, x) => s + (x.refundedAmount || 0), 0);
      monthMap.set(t.month, m);
    }

    const monthlySummary = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    // Detailed tunnels (all months) with sales
    const allTunnelsDetail = sourceTunnels.map(t => ({
      id: t.id,
      name: t.name,
      type: t.type,
      month: t.month,
      date: t.date,
      endDate: t.endDate,
      isActive: t.isActive,
      adBudget: t.adBudget,
      callsGenerated: t.callsGenerated,
      callsClosed: t.callsClosed,
      averagePrice: t.averagePrice,
      registrations: t.registrations,
      registrationsAds: t.registrationsAds,
      registrationsOrganic: t.registrationsOrganic,
      attendees: t.attendees,
      callsBooked: t.callsBooked,
      closerStats: t.closerStats,
      salesCount: t.sales.length,
      totalContracted: t.sales.reduce((s, x) => s + x.totalPrice - (x.refundedAmount || 0), 0),
      totalCollected: t.sales.reduce((s, x) => s + x.amountCollected - (x.refundedAmount || 0), 0),
      refundedAmount: t.sales.reduce((s, x) => s + (x.refundedAmount || 0), 0),
      sales: t.sales.map(s => ({
        id: s.id,
        clientName: s.clientName,
        clientEmail: s.clientEmail,
        closerId: s.closerId,
        offerId: s.offerId,
        saleDate: s.saleDate,
        paymentMethod: s.paymentMethod,
        trafficSource: s.trafficSource,
        basePrice: s.basePrice,
        totalPrice: s.totalPrice,
        numberOfPayments: s.numberOfPayments,
        amountCollected: s.amountCollected,
        nextPaymentDate: s.nextPaymentDate,
        isDefaulted: s.isDefaulted,
        refundedAmount: s.refundedAmount || 0,
        isFullyRefunded: s.isFullyRefunded,
      })),
    }));

    return {
      selectedMonth,
      currentMonthKpis: kpis,
      monthlySummaryAllTime: monthlySummary,
      allTunnels: allTunnelsDetail,
      charges: {
        paymentProcessorPercent: charges.paymentProcessorPercent,
        closersPercent: charges.closersPercent,
        agencyPercent: charges.agencyPercent,
        agencyThreshold: charges.agencyThreshold,
        associatePercent: charges.associatePercent,
        klarnaPercent: charges.klarnaPercent,
        klarnaMaxAmount: charges.klarnaMaxAmount,
        taxPercent: charges.taxPercent,
        advertising: charges.advertising,
        marketing: charges.marketing,
        software: charges.software,
        otherCosts: charges.otherCosts,
        closers: charges.closers,
        offers: charges.offers,
      },
      salaries: salaries.map(s => ({ name: s.name, monthlyAmount: s.monthlyAmount })),
      totalSalaries: salaries.reduce((s, x) => s + x.monthlyAmount, 0),
      coachingExpenses: coachingExpenses.map(e => ({ name: e.name, amount: e.amount, month: e.month, type: e.type })),
      totalCoachingExpenses: coachingExpenses.reduce((s, x) => s + x.amount, 0),
    };
  };

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dashboard-ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg], context: buildContext() }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erreur inconnue' }));
        toast({ title: 'Erreur IA', description: err.error || 'Impossible de répondre', variant: 'destructive' });
        setLoading(false);
        return;
      }

      if (!resp.body) throw new Error('Pas de réponse');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantText = '';
      let done = false;

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || !line.trim()) continue;
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantText += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
                }
                return [...prev, { role: 'assistant', content: assistantText }];
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : 'Erreur réseau', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105"
      >
        <Sparkles className="h-5 w-5" />
        <span className="font-medium text-sm">Assistant IA</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-6rem)] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-primary/20 p-2">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Assistant IA</h3>
            <p className="text-xs text-muted-foreground">Analyse de vos données</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Posez vos questions sur vos performances business du mois.
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs rounded-lg border border-border/60 bg-background hover:bg-accent px-3 py-2 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
              m.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}>
              {m.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="p-3 border-t border-border flex gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Posez votre question..."
          disabled={loading}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
