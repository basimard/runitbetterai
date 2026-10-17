declare namespace Cloudflare {
  interface Env {
    CRM_SETUP_TOKEN?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
