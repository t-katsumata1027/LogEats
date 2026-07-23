export type PublicAffiliateBanner = {
  id: number;
  name: string;
  affiliate_network: string;
  campaign_id: string | null;
  creative_id: string | null;
  target_domain: string | null;
  html_content: string;
};

export type PublicAffiliateBannerResponse = {
  banner: PublicAffiliateBanner | null;
};

export type AffiliateEventProperties = {
  banner_id: number;
  placement_id: string;
  affiliate_network?: string;
  campaign_id?: string;
  creative_id?: string;
  target_domain?: string;
  page_path?: string;
};
