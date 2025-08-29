import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Loader2 } from 'lucide-react';
import { AlertService } from '@/services/alertService';
import { useToast } from '@/hooks/use-toast';

interface StopAlertProps {
  alertId: string;
  onAlertStopped: () => void;
}

export const StopAlert = ({ alertId, onAlertStopped }: StopAlertProps) => {
  const [stopCode, setStopCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleStop = async () => {
    if (!stopCode.trim()) {
      toast({
        title: "Code requis",
        description: "Veuillez entrer le code d'arrêt",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      await AlertService.stopAlert(alertId, stopCode.trim());

      toast({
        title: "✅ Alerte arrêtée",
        description: "L'alerte d'urgence a été stoppée avec succès",
      });

      onAlertStopped();

    } catch (error: any) {
      console.error('Error stopping alert:', error);
      
      toast({
        title: "Erreur",
        description: error.message || "Code d'arrêt incorrect",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleStop();
    }
  };

  return (
    <Card className="status-card status-active max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-emergency flex items-center justify-center gap-2 text-base sm:text-lg">
          <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
          Arrêter l'alerte
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="space-y-2">
          <label htmlFor="stopCode" className="text-xs sm:text-sm font-medium">
            Code d'arrêt d'urgence
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="stopCode"
              type="password"
              value={stopCode}
              onChange={(e) => setStopCode(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Entrez le code secret"
              className="pl-10 text-sm sm:text-base"
              disabled={isLoading}
            />
          </div>
        </div>

        <Button
          onClick={handleStop}
          disabled={isLoading || !stopCode.trim()}
          className="btn-stop w-full text-sm sm:text-base"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Arrêt en cours...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              ARRÊTER L'ALERTE
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          L'arrêt stopera immédiatement tous les envois automatiques
        </p>
      </CardContent>
    </Card>
  );
};