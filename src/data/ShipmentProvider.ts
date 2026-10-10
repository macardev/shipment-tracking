import type { Shipment } from './types';

/**
 * Veri kaynağı arayüzü. Demo `MockProvider` kullanır; gerçek üründe
 * buraya konteyner takip API'si (Vizion, Shipsgo vb.) + AIS verisi bağlanır.
 */
export interface ShipmentProvider {
  getShipment(trackingNo: string): Promise<Shipment | null>;
  listSamples(): { trackingNo: string; hintKey: string }[];
}
