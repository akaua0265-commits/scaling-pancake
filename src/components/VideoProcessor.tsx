import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Download, Play, Settings2, Zap, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { loadFFmpeg, detectSilences, removeSilences, getVideoDuration } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

interface VideoProcessorProps {
  videoFile: File;
  onReset: () => void;
}

export const VideoProcessor = ({ videoFile, onReset }: VideoProcessorProps) => {
  const [threshold, setThreshold] = useState([30]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingFFmpeg, setIsLoadingFFmpeg] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [silenceCount, setSilenceCount] = useState<number>(0);
  const [timeSaved, setTimeSaved] = useState<number>(0);
  const { toast } = useToast();

  const videoUrl = URL.createObjectURL(videoFile);

  const handleProcess = async () => {
    try {
      setIsProcessing(true);
      setProgress(0);
      setSilenceCount(0);
      setTimeSaved(0);
      
      // Carregar FFmpeg
      setStatusMessage("Carregando processador de vídeo...");
      setIsLoadingFFmpeg(true);
      const ffmpeg = await loadFFmpeg();
      setIsLoadingFFmpeg(false);
      setProgress(10);

      // Escrever arquivo de entrada
      setStatusMessage("Carregando vídeo...");
      const inputData = await fetchFile(videoFile);
      await ffmpeg.writeFile('input.mp4', inputData);
      setProgress(20);

      // Obter duração do vídeo
      setStatusMessage("Analisando vídeo...");
      const duration = await getVideoDuration(ffmpeg, 'input.mp4');
      setProgress(30);

      // Detectar silêncios
      setStatusMessage("Detectando silêncios...");
      const silences = await detectSilences(ffmpeg, 'input.mp4', threshold[0]);
      setSilenceCount(silences.length);
      
      // Calcular tempo economizado
      const totalSilenceTime = silences.reduce((sum, s) => sum + (s.end - s.start), 0);
      setTimeSaved(Math.round(totalSilenceTime));
      
      setProgress(50);

      if (silences.length === 0) {
        toast({
          title: "Nenhum silêncio encontrado",
          description: "Seu vídeo não possui silêncios detectáveis com essa sensibilidade. Tente aumentar a sensibilidade.",
        });
        setIsProcessing(false);
        return;
      }

      // Remover silêncios
      setStatusMessage(`Removendo ${silences.length} silêncios detectados...`);
      const outputData = await removeSilences(
        ffmpeg,
        'input.mp4',
        silences,
        duration,
        (p) => setProgress(50 + (p * 0.5))
      );

      // Criar URL do resultado
      const blob = new Blob([outputData as BlobPart], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setProcessedUrl(url);

      setProgress(100);
      setStatusMessage("Concluído!");
      
      toast({
        title: "Processamento concluído! 🎉",
        description: `Removidos ${silences.length} silêncios, economizando ${timeSaved}s`,
      });

      // Limpar arquivo de entrada
      await ffmpeg.deleteFile('input.mp4');
      
    } catch (error) {
      console.error('Erro ao processar vídeo:', error);
      toast({
        title: "Erro ao processar vídeo",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setIsLoadingFFmpeg(false);
    }
  };

  const handleDownload = () => {
    if (!processedUrl) return;
    
    const a = document.createElement("a");
    a.href = processedUrl;
    a.download = `${videoFile.name.replace(/\.[^/.]+$/, "")}_sem_silencios.mp4`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Preview do vídeo original */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Play className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Vídeo Original</h3>
        </div>
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          <video
            src={videoUrl}
            controls
            className="w-full h-full"
          />
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{videoFile.name}</span>
          <span>{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</span>
        </div>
      </Card>

      {/* Configurações */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings2 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Configurações</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">
                Sensibilidade de Detecção
              </label>
              <span className="text-sm text-muted-foreground">
                {threshold[0]}%
              </span>
            </div>
            <Slider
              value={threshold}
              onValueChange={setThreshold}
              min={10}
              max={50}
              step={5}
              className="w-full"
              disabled={isProcessing}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Quanto menor, mais silêncios serão detectados
            </p>
          </div>
        </div>
      </Card>

      {/* Botão de processar */}
      {!processedUrl && (
        <Button
          onClick={handleProcess}
          disabled={isProcessing}
          className="w-full h-14 text-lg bg-gradient-primary hover:opacity-90 transition-opacity"
          size="lg"
        >
          {isLoadingFFmpeg ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Carregando processador...
            </>
          ) : isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 mr-2" />
              Remover Silêncios
            </>
          )}
        </Button>
      )}

      {/* Progresso */}
      {isProcessing && (
        <Card className="p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{statusMessage}</span>
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            {silenceCount > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{silenceCount} silêncios detectados</span>
                {timeSaved > 0 && <span>~{timeSaved}s economizados</span>}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Vídeo processado */}
      {processedUrl && (
        <Card className="p-6 animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-semibold">Vídeo Processado</h3>
            {silenceCount > 0 && (
              <span className="ml-auto text-sm text-muted-foreground">
                {silenceCount} cortes • {timeSaved}s economizados
              </span>
            )}
          </div>
          <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
            <video
              src={processedUrl}
              controls
              className="w-full h-full"
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleDownload}
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar Vídeo
            </Button>
            <Button
              onClick={onReset}
              variant="outline"
            >
              Novo Vídeo
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
