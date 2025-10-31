import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Download, Play, Settings2, Zap, Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { loadFFmpeg, detectSilences, removeSilences, getVideoDuration, SilenceSegment } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

interface VideoProcessorProps {
  videoFile: File;
  onReset: () => void;
}

export const VideoProcessor = ({ videoFile, onReset }: VideoProcessorProps) => {
  type ProcessingStage = 'idle' | 'analyzing' | 'analyzed' | 'processing' | 'processed';

  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [threshold, setThreshold] = useState([30]);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [silenceCount, setSilenceCount] = useState<number>(0);
  const [timeSaved, setTimeSaved] = useState<number>(0);
  const [detectedSilences, setDetectedSilences] = useState<SilenceSegment[] | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const { toast } = useToast();

  const videoUrl = URL.createObjectURL(videoFile);

  const handleAnalyze = async () => {
    try {
      setStage('analyzing');
      setProgress(0);
      setSilenceCount(0);
      setTimeSaved(0);
      setDetectedSilences(null);
      
      setStatusMessage("Carregando processador de vídeo...");
      const ffmpeg = await loadFFmpeg();
      setProgress(10);

      setStatusMessage("Carregando vídeo...");
      const inputData = await fetchFile(videoFile);
      await ffmpeg.writeFile('input.mp4', inputData);
      setProgress(20);

      setStatusMessage("Analisando vídeo...");
      const duration = await getVideoDuration(ffmpeg, 'input.mp4');
      setVideoDuration(duration);
      setProgress(30);

      setStatusMessage("Detectando silêncios...");
      const silences = await detectSilences(ffmpeg, 'input.mp4', threshold[0]);
      setDetectedSilences(silences);
      setSilenceCount(silences.length);
      
      const totalSilenceTime = silences.reduce((sum, s) => sum + (s.end - s.start), 0);
      setTimeSaved(Math.round(totalSilenceTime));
      
      setProgress(100);
      setStatusMessage("Análise concluída!");
      setStage('analyzed');

      if (silences.length === 0) {
        toast({
          title: "Nenhum silêncio encontrado",
          description: "Seu vídeo não possui silêncios detectáveis com essa sensibilidade. Tente ajustar.",
        });
      } else {
        toast({
          title: "Análise concluída!",
          description: `Encontrados ${silences.length} silêncios, totalizando ${Math.round(totalSilenceTime)}s.`,
        });
      }
    } catch (error) {
      console.error('Erro ao analisar vídeo:', error);
      toast({
        title: "Erro ao analisar vídeo",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
        variant: "destructive",
      });
      setStage('idle');
    }
  };

  const handleRemove = async () => {
    if (!detectedSilences) return;

    try {
      setStage('processing');
      setProgress(0);
      setStatusMessage(`Removendo ${silenceCount} silêncios...`);

      const ffmpeg = await loadFFmpeg();

      const outputData = await removeSilences(
        ffmpeg,
        'input.mp4',
        detectedSilences,
        videoDuration,
        (p) => setProgress(p)
      );

      const blob = new Blob([outputData as BlobPart], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setProcessedUrl(url);

      setProgress(100);
      setStatusMessage("Concluído!");
      setStage('processed');
      
      toast({
        title: "Processamento concluído! 🎉",
        description: `Removidos ${silenceCount} silêncios, economizando ${timeSaved}s`,
      });

      await ffmpeg.deleteFile('input.mp4');
      
    } catch (error) {
      console.error('Erro ao remover silêncios:', error);
      toast({
        title: "Erro ao remover silêncios",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
        variant: "destructive",
      });
      setStage('analyzed');
    }
  };

  const handleDownload = () => {
    if (!processedUrl) return;
    
    const a = document.createElement("a");
    a.href = processedUrl;
    a.download = `${videoFile.name.replace(/\.[^/.]+$/, "")}_sem_silencios.mp4`;
    a.click();
  };

  const isBusy = stage === 'analyzing' || stage === 'processing';

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
              disabled={isBusy || stage === 'processed'}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Quanto menor, mais silêncios serão detectados
            </p>
          </div>
        </div>
      </Card>

      {/* Botões de Ação e Progresso */}
      {stage === 'idle' && (
        <Button onClick={handleAnalyze} className="w-full h-14 text-lg" size="lg">
          <Search className="w-5 h-5 mr-2" />
          Analisar Silêncios
        </Button>
      )}

      {isBusy && (
        <Card className="p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium flex items-center">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {statusMessage}
              </span>
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </Card>
      )}

      {stage === 'analyzed' && (
        <>
          <Card className="p-6 bg-primary/5 border-primary/20 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Análise Concluída</h4>
                {silenceCount > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {silenceCount} silêncios detectados, economizando ~{timeSaved}s.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum silêncio detectado. Tente ajustar a sensibilidade.
                  </p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={handleAnalyze}>
                Analisar Novamente
              </Button>
            </div>
          </Card>
          <Button 
            onClick={handleRemove} 
            disabled={silenceCount === 0} 
            className="w-full h-14 text-lg bg-gradient-primary hover:opacity-90 transition-opacity" 
            size="lg"
          >
            <Zap className="w-5 h-5 mr-2" />
            Remover {silenceCount} Silêncios
          </Button>
        </>
      )}

      {/* Vídeo processado */}
      {stage === 'processed' && processedUrl && (
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