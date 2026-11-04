import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Agent qui rédige la réponse à un email de prospect et le pousse à venir au live du dimanche.
// Entrée (POST JSON): { from_name?, from_email?, subject?, body }
// Sortie: { subject, body } — le lien du live est TOUJOURS le lien officiel ci-dessous.

const LIVE_URL = "https://www.youtube.com/@CaroleAnne-conciergerie/live";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Garantit le bon lien : remplace tout lien YouTube/live inventé par le lien officiel, et l'ajoute s'il manque.
export function enforceLiveLink(text: string): string {
  let out = text
    .replace(/\{\{?\s*LIVE_URL\s*\}?\}/g, LIVE_URL)
    .replace(/https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/[^\s)<>"']*/gi, LIVE_URL);
  if (!out.includes(LIVE_URL)) {
    out += `\n\n👉 Le lien pour rejoindre le live de dimanche : ${LIVE_URL}`;
  }
  return out;
}

const SYSTEM_PROMPT = `Tu es l'assistante de Carole-Anne (formation conciergerie). Tu réponds aux emails des prospects.
Objectif n°1 : répondre sincèrement à leur message ET leur donner envie de venir au LIVE YOUTUBE de DIMANCHE.
Règles :
- Français, ton chaleureux, enthousiaste, humain, tutoiement si le prospect tutoie, sinon vouvoiement.
- Réponds d'abord à la question ou à la situation du prospect (2-4 phrases), sans inventer de prix, dates ou promesses chiffrées.
- Puis chauffe-le pour le live : ce qu'il va apprendre, pouvoir poser ses questions en direct, moment à ne pas rater, bloque ton dimanche, active la cloche / le rappel.
- Pour le lien du live, écris EXACTEMENT le texte {{LIVE_URL}} (il sera remplacé automatiquement). N'écris aucun autre lien.
- N'invente pas d'horaire précis s'il n'est pas fourni.
- Signe "Carole-Anne".
Réponds UNIQUEMENT en JSON : {"subject": "...", "body": "..."}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { from_name, from_email, subject, body } = await req.json();
    if (!body) return json({ error: "body manquant" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-5",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Email du prospect :\nDe : ${from_name ?? ""} <${from_email ?? ""}>\nObjet : ${subject ?? ""}\n\n${body}`,
        }],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return json({ error: "Erreur du service IA" }, response.status === 429 || response.status === 402 ? response.status : 500);
    }

    const data = await response.json();
    const raw: string = data?.content?.map((c: { text?: string }) => c.text ?? "").join("") ?? "";
    let reply: { subject?: string; body?: string };
    try {
      reply = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    } catch {
      reply = { body: raw };
    }

    return json({
      subject: reply.subject || (subject ? `Re: ${subject}` : "On se retrouve dimanche en live ?"),
      body: enforceLiveLink(reply.body ?? ""),
      live_url: LIVE_URL,
    });
  } catch (e) {
    console.error("prospect-email-agent error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
