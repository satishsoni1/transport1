export type PublicAppSettings = {
  company_name: string;
  company_tagline: string;
  app_title: string;
  support_email: string;
  company_email?: string;
  company_phone?: string;
};

export const DEFAULT_APP_SETTINGS: PublicAppSettings = {
  company_name: 'Transport Company',
  company_tagline: 'Transport Management System',
  app_title: 'Transport Management System',
  support_email: 'support@example.com',
  company_email: '',
  company_phone: '',
};
