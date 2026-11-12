/// <reference types="vite/client" />
declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    ATLAS_DM_EMAIL?: string;
    BUCKET?: R2Bucket;
  }
}
