/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLISH_MODE?: string;
  readonly VITE_QA_TOOLS?: string;
  readonly VITE_SPONSOR_URL?: string;
  readonly VITE_AO_MODE?: string;
  readonly VITE_SEJIRE_FACTORY_ID?: string;
  readonly VITE_AO_HB_NODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
