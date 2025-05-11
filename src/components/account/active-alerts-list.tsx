// src/components/account/active-alerts-list.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import type { PriceAlert, CryptoSymbol } from '@/lib/types';
import { getAllPriceAlertsForUser, deletePriceAlert, updatePriceAlert } from '@/lib/firebase/alerts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Edit2, Trash2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { AlertModal } from '@/components/dashboard/alert-modal'; // Re-use the modal
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

export function ActiveAlertsList() {
  const { user } = useAuth();
  const { translations } = useLanguage();
  const t = useCallback((key: string, fallback?: string, vars?: Record<string, string | number>) => {
    let msg = translations[key] || fallback || key;
    if (vars) {
        Object.keys(vars).forEach(varKey => {
            msg = msg.replace(`{${varKey}}`, String(vars[varKey]));
        });
    }
    return msg;
  }, [translations]);
  const { toast } = useToast();

  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<PriceAlert | null>(null);
  // Need current prices to pass to modal for context, even if not strictly used by modal logic
  // This part is tricky as this component doesn't naturally have live prices.
  // For now, we'll pass null or a placeholder. A better solution would involve a shared price context or service.
  const [mockCurrentPrices, setMockCurrentPrices] = useState<Partial<Record<CryptoSymbol, number>>>({});


  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const userAlerts = await getAllPriceAlertsForUser(user.id);
      setAlerts(userAlerts);
      // Populate mock prices for symbols in alerts if not already present (very basic)
      setMockCurrentPrices(prev => {
        const updatedPrices = {...prev};
        userAlerts.forEach(alert => {
          if (!updatedPrices[alert.symbol]) {
            updatedPrices[alert.symbol] = alert.targetPrice; // Use target as a placeholder
          }
        });
        return updatedPrices;
      });
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
      toast({ title: t('activeAlerts.toast.fetchErrorTitle', 'Error'), description: t('activeAlerts.toast.fetchErrorDescription', 'Could not load your price alerts.'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user, t, toast]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleEdit = (alert: PriceAlert) => {
    setSelectedAlert(alert);
    setIsModalOpen(true);
  };

  const handleDelete = async (alertId: string, symbol: CryptoSymbol) => {
    if (!confirm(t('activeAlerts.confirmDelete', 'Are you sure you want to delete this alert for {symbol}?', {symbol}))) return;
    try {
      await deletePriceAlert(alertId);
      toast({ title: t('activeAlerts.toast.deletedTitle', 'Alert Deleted'), description: t('activeAlerts.toast.deletedDescription', 'The alert for {symbol} has been removed.', {symbol}) });
      fetchAlerts(); // Refresh list
    } catch (error) {
      toast({ title: t('activeAlerts.toast.deleteErrorTitle', 'Error Deleting'), description: t('activeAlerts.toast.deleteErrorDescription', 'Could not delete the alert.'), variant: 'destructive' });
    }
  };

  const handleToggleActive = async (alert: PriceAlert) => {
    try {
      await updatePriceAlert(alert.id, { active: !alert.active });
      toast({ 
        title: alert.active ? t('activeAlerts.toast.deactivatedTitle', 'Alert Deactivated') : t('activeAlerts.toast.activatedTitle', 'Alert Activated'), 
        description: alert.active 
          ? t('activeAlerts.toast.deactivatedDescription', 'The alert for {symbol} is now inactive.', {symbol: alert.symbol})
          : t('activeAlerts.toast.activatedDescription', 'The alert for {symbol} is now active.', {symbol: alert.symbol})
      });
      fetchAlerts(); // Refresh list
    } catch (error) {
      toast({ title: t('activeAlerts.toast.toggleErrorTitle', 'Error Updating Alert'), description: t('activeAlerts.toast.toggleErrorDescription', 'Could not update alert status.'), variant: 'destructive' });
    }
  };


  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedAlert(null);
  };
  
  const handleAlertSaved = () => {
    fetchAlerts();
  }

  return (
    <Card className="shadow-lg mt-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>{t('activeAlerts.title', 'My Price Alerts')}</CardTitle>
            <CardDescription>{t('activeAlerts.description', 'Manage your active and inactive price alerts.')}</CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={fetchAlerts} disabled={isLoading} title={t('activeAlerts.refreshButton', 'Refresh Alerts')}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && alerts.length === 0 ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
            <p>{t('activeAlerts.loading', 'Loading alerts...')}</p>
          </div>
        ) : alerts.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">{t('activeAlerts.noAlerts', 'You have no price alerts set up yet.')}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('activeAlerts.table.symbol', 'Crypto')}</TableHead>
                  <TableHead>{t('activeAlerts.table.condition', 'Condition')}</TableHead>
                  <TableHead>{t('activeAlerts.table.status', 'Status')}</TableHead>
                  <TableHead>{t('activeAlerts.table.createdAt', 'Created')}</TableHead>
                  <TableHead>{t('activeAlerts.table.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">{alert.symbol}</TableCell>
                    <TableCell>
                      {alert.direction === 'above' ? t('activeAlerts.table.directionAbove', '> ') : t('activeAlerts.table.directionBelow', '< ')}
                      ${alert.targetPrice.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                            id={`alert-toggle-${alert.id}`}
                            checked={alert.active}
                            onCheckedChange={() => handleToggleActive(alert)}
                            aria-label={alert.active ? t('activeAlerts.table.deactivateSwitch', 'Deactivate Alert') : t('activeAlerts.table.activateSwitch', 'Activate Alert')}
                        />
                        <Badge variant={alert.active ? 'default' : 'secondary'} className={alert.active ? 'bg-primary' : ''}>
                            {alert.active ? 
                                (<><CheckCircle className="mr-1 h-3 w-3" />{t('activeAlerts.table.statusActive', 'Active')}</>) : 
                                (<><XCircle className="mr-1 h-3 w-3" />{t('activeAlerts.table.statusInactive', 'Inactive')}</>)
                            }
                        </Badge>
                      </div>
                    </TableCell>
                     <TableCell>{new Date(alert.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(alert)} title={t('activeAlerts.button.edit', 'Edit Alert')}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(alert.id, alert.symbol)} title={t('activeAlerts.button.delete', 'Delete Alert')}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {selectedAlert && isModalOpen && (
        <AlertModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          cryptoSymbol={selectedAlert.symbol}
          currentPrice={mockCurrentPrices[selectedAlert.symbol] || selectedAlert.targetPrice} // Pass a mock or existing target price
          existingAlert={selectedAlert}
          onAlertSaved={handleAlertSaved}
        />
      )}
    </Card>
  );
}
