import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Loader2 } from 'lucide-react';
import { AlertService } from '@/services/alertService';
import { GeolocationService } from '@/services/geolocation';
import { useToast } from '@/hooks/use-toast';

interface EmergencyButtonProps {
  onAlertCreated: (alertId: string) => void;
  disabled?: boolean;
}

export const EmergencyButton = ({ onAlertCreated, disabled }: EmergencyButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSOS = async () => {
    try {
      setIsLoading(true);

      toast({
        title: "Localisation en cours...",
        description: "Recherche de votre position GPS précise",
      });

      // Get precise location
      const location = await GeolocationService.getCurrentLocation();
      
      if (location.accuracy > 50) {
        toast({
          title: "⚠️ Précision GPS limitée",
          description: `Précision: ${location.accuracy.toFixed(0)}m. Alerte envoyée quand même.`,
          variant: "destructive"
        });
      }

      // Create alert in database
      const alert = await AlertService.createAlert(location);

      // Send immediate alert
      await AlertService.sendImmediateAlert(alert.id, location);

      toast({
        title: "🚨 Alerte envoyée !",
        description: "SMS et email d'urgence envoyés. Les envois vont continuer toutes les 5 minutes.",
      });

      onAlertCreated(alert.id);

    } catch (error: any) {
      console.error('Error creating SOS alert:', error);
      
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'alerte. Vérifiez votre connexion.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="text-center space-y-4">
      <Button
        onClick={handleSOS}
        disabled={disabled || isLoading}
        className="btn-emergency w-48 h-48 rounded-full text-2xl font-bold"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin mr-3" />
            Localisation...
          </>
        ) : (
          <>
            <AlertTriangle className="w-12 h-12 mr-4" />
            SOS
          </>
        )}
      </Button>

      <div className="text-center">
        <p className="text-lg font-semibold text-primary mb-2">
          Appuyez en cas d'urgence
        </p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Envoi immédiat de votre position par SMS et email, puis toutes les 5 minutes pendant 2 heures
        </p>
      </div>
    </div>
  );
};