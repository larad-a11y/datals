import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `Tu es un assistant IA expert en analyse business pour une agence de vente / coaching.
Tu as accès à TOUTES les données de l'utilisateur (tous les mois, tous les tunnels, toutes les ventes, tous les clients, charges, salaires, dépenses coaching).
- "selectedMonth" = mois actuellement filtré dans l'UI (utilise-le comme contexte par défaut SI la question ne précise pas de période).
- "currentMonthKpis" = KPIs du mois sélectionné.
- "monthlySummaryAllTime" = résumé agrégé par mois sur TOUTE la période disponible (utilise-le pour comparer plusieurs mois, tendances, totaux annuels).
- "allTunnels" = liste détaillée de TOUS les tunnels (tous mois confondus) avec leurs ventes individuelles (clients, emails, montants, échéances, remboursements, closers, offres).
Réponds en français, de manière concise, structurée et orientée décision business. Utilise des chiffres précis, des pourcentages et des comparaisons. Quand pertinent, propose des recommandations actionnables. Si une donnée demandée n'existe pas dans le contexte, dis-le clairement.

Données contextuelles complètes (JSON):
${JSON.stringify(context, null, 2)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans un instant." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés. Ajoutez des crédits dans Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
