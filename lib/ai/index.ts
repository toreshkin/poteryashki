import { AiProvider } from "@/lib/ai/types";
import { mockProvider } from "@/lib/ai/mock";
import { geminiProvider } from "@/lib/ai/gemini";
import { deepseekProvider } from "@/lib/ai/deepseek";
import { claudeProvider } from "@/lib/ai/claude";

const PROVIDERS: Record<string, AiProvider> = {
  mock: mockProvider,
  gemini: geminiProvider,
  deepseek: deepseekProvider,
  claude: claudeProvider,
};

/** null — ИИ выключен, сайт работает без него. */
export function getAiProvider(): AiProvider | null {
  const name = (process.env.AI_PROVIDER ?? "off").toLowerCase();
  return PROVIDERS[name] ?? null;
}

export function aiStatus(): { enabled: boolean; vision: boolean } {
  const provider = getAiProvider();
  return { enabled: Boolean(provider), vision: provider?.vision ?? false };
}
