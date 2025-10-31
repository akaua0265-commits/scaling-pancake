import { useState } from "react";
import { Scissors, Sparkles } from "lucide-react";
import { VideoUploader } from "@/components/VideoUploader";
import { VideoProcessor } from "@/components/VideoProcessor";

const Index = () => {
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);

  const handleReset = () => {
    setSelectedVideo(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                SilenceCut
              </h1>
              <p className="text-xs text-muted-foreground">
                Editor automático para YouTube
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      {!selectedVideo && (
        <section className="container mx-auto px-4 py-12 text-center animate-fade-in">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              <span>100% Automático</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent">
              Remova silêncios dos seus vídeos automaticamente
            </h2>
            
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
              Agilize sua edição para YouTube. Envie seu vídeo e deixe nossa IA detectar e remover todas as pausas e silêncios desnecessários.
            </p>
          </div>
        </section>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          {!selectedVideo ? (
            <VideoUploader onVideoSelect={setSelectedVideo} />
          ) : (
            <VideoProcessor videoFile={selectedVideo} onReset={handleReset} />
          )}
        </div>
      </main>

      {/* Features */}
      {!selectedVideo && (
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "⚡",
                title: "Rápido e Fácil",
                description: "Envie seu vídeo e receba o resultado em minutos",
              },
              {
                icon: "🎯",
                title: "Detecção Precisa",
                description: "Algoritmo avançado identifica silêncios com precisão",
              },
              {
                icon: "✨",
                title: "Qualidade Preservada",
                description: "Mantém a qualidade original do seu vídeo",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Feito para criadores de conteúdo que valorizam seu tempo</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
