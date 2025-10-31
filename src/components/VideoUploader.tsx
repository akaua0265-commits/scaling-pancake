import { useCallback, useState } from "react";
import { Upload, FileVideo } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface VideoUploaderProps {
  onVideoSelect: (file: File) => void;
}

export const VideoUploader = ({ onVideoSelect }: VideoUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith("video/")) {
          onVideoSelect(file);
        } else {
          toast({
            title: "Arquivo inválido",
            description: "Por favor, envie um arquivo de vídeo.",
            variant: "destructive",
          });
        }
      }
    },
    [onVideoSelect, toast]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith("video/")) {
          onVideoSelect(file);
        } else {
          toast({
            title: "Arquivo inválido",
            description: "Por favor, envie um arquivo de vídeo.",
            variant: "destructive",
          });
        }
      }
    },
    [onVideoSelect, toast]
  );

  return (
    <Card
      className={`relative overflow-hidden border-2 border-dashed transition-all duration-300 ${
        isDragging
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
      }`}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <label className="flex flex-col items-center justify-center py-16 px-8 cursor-pointer">
        <input
          type="file"
          className="hidden"
          accept="video/*"
          onChange={handleFileInput}
        />
        
        <div className={`mb-6 transition-transform duration-300 ${isDragging ? "scale-110" : ""}`}>
          {isDragging ? (
            <FileVideo className="w-20 h-20 text-primary animate-pulse-soft" />
          ) : (
            <Upload className="w-20 h-20 text-muted-foreground" />
          )}
        </div>

        <h3 className="text-2xl font-semibold mb-3 text-foreground">
          {isDragging ? "Solte o vídeo aqui" : "Envie seu vídeo"}
        </h3>
        
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          Arraste e solte seu vídeo aqui ou clique para selecionar
        </p>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileVideo className="w-4 h-4" />
          <span>MP4, MOV, AVI, WebM</span>
        </div>
      </label>
    </Card>
  );
};
