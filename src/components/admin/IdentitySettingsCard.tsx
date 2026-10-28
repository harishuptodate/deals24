import { useEffect, useState } from 'react';
import { BrainCircuit, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import {
  getAdminSettings,
  updateGeminiIdentitySetting,
  type GeminiIdentitySetting,
} from '@/services/api';

export default function IdentitySettingsCard() {
  const { toast } = useToast();
  const [setting, setSetting] = useState<GeminiIdentitySetting | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getAdminSettings()
      .then(setSetting)
      .catch(() => toast({
        title: 'Could not load identity settings',
        description: 'The backend setting is unavailable right now.',
        variant: 'destructive',
      }));
  }, [toast]);

  const handleChange = async (enabled: boolean) => {
    setIsSaving(true);
    try {
      const updatedSetting = await updateGeminiIdentitySetting(enabled);
      setSetting(updatedSetting);
      toast({
        title: enabled ? 'Gemini enrichment enabled' : 'Local-only extraction enabled',
        description: enabled
          ? 'Eligible new deals may use Gemini for identity enrichment.'
          : 'New deals will not send identity extraction requests to Gemini.',
      });
    } catch {
      toast({
        title: 'Setting was not changed',
        description: 'Please retry after checking the backend connection.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="mb-8 border-stone-200/80 bg-white/95 dark:border-white/10 dark:bg-[#111113]">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Gemini identity enrichment</CardTitle>
              <CardDescription className="mt-1 max-w-2xl leading-6">
                Local rules always extract available brand, model, product type, and variants.
                Enable this only when eligible new deals may also use Gemini.
              </CardDescription>
            </div>
          </div>
          {setting ? (
            <Switch
              checked={setting.enabled}
              disabled={isSaving}
              onCheckedChange={handleChange}
              aria-label="Toggle Gemini identity enrichment"
            />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-stone-500" />
          )}
        </div>
      </CardHeader>
      {setting && (
        <CardContent className="pt-0 text-xs text-stone-500 dark:text-stone-400">
          Current value comes from {setting.source === 'admin' ? 'the saved admin override' : 'GEMINI_IDENTITY_EXTRACTION_ENABLED'}.
        </CardContent>
      )}
    </Card>
  );
}
