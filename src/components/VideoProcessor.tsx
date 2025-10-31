import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Download, Play, Settings2, Zap, Loader2, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoProcessorProps {
  videoFile: File;
  onReset: () => void;
}

export const VideoProcessor = ({ videoFile, onReset }: VideoProcessorProps) => {
  type ProcessingStage = 'idle' | 'processing' | 'processed';

  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [threshold, setThreshold] = useState([30]);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const videoUrl = URL.createObjectURL(videoFile);

  const handleProcessVideo = async () => {
    setStage('processing');
    setProcessedUrl(null);

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('threshold', threshold[0].toString());

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      if (!backendUrl) {
        throw new Error("A URL do backend não está configurada. Por favor, configure VITE_BACKEND_URL no seu arquivo .env");
      }

      const response = await fetch(`${backendUrl}/process`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ocorreu um erro no servidor: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setProcessedUrl(url);
      setStage('processed');
      
      toast({ title: "Processamento concluído! 🎉", description: "Seu vídeo está pronto para ser baixado." });

    } catch (error) {
      console.error('Erro ao processar vídeo:', error);
      toast({ title: "Erro ao processar vídeo", description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido", variant: "destructive" });
      setStage('idle');
    }
  };

  const handleDownload = () => {
    if (!processedUrl) return;
    const a = document.createElement("a");
    a.href = processedUrl;
    a.download = `${videoFile.name.replace(/\.[^/.]+$/, "")}_sem_silencios.mp4`;
    a.click();
  };

  const isBusy = stage === 'processing';

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Play className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Vídeo Original</h3>
        </div>
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          <video src={videoUrl} controls className="w-full h-full" />
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{videoFile.name}</span>
          <span>{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</span>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings2 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Configurações</h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Sensibilidade de Detecção</label>
              <span className="text-sm text-muted-foreground">{threshold[0]}%</span>
            </div>
            <Slider value={threshold} onValueChange={setThreshold} min={10} max={50} step={5} className="w-full" disabled={isBusy || stage === 'processed'} />
            <p className="text-xs text-muted-foreground mt-2">Quanto menor, mais silêncios serão detectados</p>
          </div>
        </div>
      </Card>

      {stage === 'idle' && (
        <Button onClick={handleProcessVideo} className="w-full h-14 text-lg bg-gradient-primary hover:opacity-90 transition-opacity" size="lg">
          <Wand2 className="w-5 h-5 mr-2" />
          Processar Vídeo
        </Button>
      )}

      {isBusy && (
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="font-medium">Processando seu vídeo...</span>
            <p className="text-sm text-muted-foreground">Isso pode levar alguns minutos.</p>
          </div>
        </Card>
      )}

      {stage === 'processed' && processedUrl && (
        <Card className="p-6 animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-semibold">Vídeo Processado</h3>
          </div>
          <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
            <video src={processedUrl} controls className="w-full h-full" />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleDownload} className="flex-1 bg-gradient-primary hover:opacity-90">
              <Download className="w-4 h-4 mr-2" />
              Baixar Vídeo
            </Button>
            <Button onClick={onReset} variant="outline">Novo Vídeo</Button>
          </div>
        </Card>
      )}
    </div>
  );
};