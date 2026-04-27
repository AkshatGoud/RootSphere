import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { storage } from '@/lib/storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

interface AddImageDialogProps {
  fieldId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddImageDialog({ fieldId, open, onOpenChange, onSuccess }: AddImageDialogProps) {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith('image/')) {
      toast.error(t('Please select an image file'));
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleRemove = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('field_id', fieldId);
      formData.append('notes', notes.trim());

      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/upload/image`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('farmer_name');
          storage.clearAll();
          window.location.href = '/';
          return;
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Upload failed');
      }

      toast.success(t('Image uploaded successfully'));
      handleRemove();
      setNotes('');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || t('Failed to upload image'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleRemove(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("Upload Field Image")}</DialogTitle>
          <DialogDescription>
            {t("Add a photo for Visual AI analysis. Mention symptoms in notes.")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Drop zone / file picker */}
          <div className="space-y-2">
            <Label>{t("Photo")}</Label>
            {!preview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
              >
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-3xl text-slate-400">add_a_photo</span>
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("Click to select a photo")}</p>
                <p className="text-xs text-slate-400 mt-1">JPEG, PNG, WebP</p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-white text-xs font-medium truncate">{file?.name}</p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t("Notes (Symptoms)")}</Label>
            <Textarea
              id="notes"
              placeholder={t("e.g. Yellowing leaves, brown spots...")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={isLoading || !file}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("Upload")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
