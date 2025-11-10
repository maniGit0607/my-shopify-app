import { ShopTokenData } from '../types';

export class KVStorage {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  /**
   * Store shop access token in KV
   */
  async storeShopToken(shop: string, tokenData: ShopTokenData): Promise<void> {
    const key = `shop_tokens:${shop}`;
    await this.kv.put(key, JSON.stringify(tokenData));
    console.log(`Stored access token for shop: ${shop}`);
  }

  /**
   * Retrieve shop access token from KV
   */
  async getShopToken(shop: string): Promise<ShopTokenData | null> {
    const key = `shop_tokens:${shop}`;
    const data = await this.kv.get(key);
    
    if (!data) {
      console.log(`No access token found for shop: ${shop}`);
      return null;
    }

    return JSON.parse(data) as ShopTokenData;
  }

  /**
   * Delete shop access token from KV
   */
  async deleteShopToken(shop: string): Promise<void> {
    const key = `shop_tokens:${shop}`;
    await this.kv.delete(key);
    console.log(`Deleted access token for shop: ${shop}`);
  }

  /**
   * Check if shop has an access token
   */
  async hasShopToken(shop: string): Promise<boolean> {
    const token = await this.getShopToken(shop);
    return token !== null;
  }
}

