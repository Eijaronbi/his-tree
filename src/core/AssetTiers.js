const MOBILE_VARIANTS = {
  'scenery/playbill.webp': 'scenery/playbill.mobile.webp',
  'scenery/theatre_drop_wide.webp': 'scenery/theatre_drop_wide.mobile.webp'
};

const TEX_BASE = './assets/textures/';

let tier = 'high';

export function setAssetTier(value) {
  tier = value === 'low' || value === 'medium' || value === 'high' ? value : 'high';
}

export function getAssetTier() {
  return tier;
}

export function texturePath(path) {
  const raw = String(path || '');
  const rel = raw.startsWith(TEX_BASE)
    ? raw.slice(TEX_BASE.length)
    : raw.replace(/^\.\/assets\/textures\//, '');
  const useMobile = (tier === 'low' || tier === 'medium') && MOBILE_VARIANTS[rel];
  return TEX_BASE + (useMobile || rel);
}

export function mobileVariantFor(path) {
  const raw = String(path || '');
  const rel = raw.startsWith(TEX_BASE)
    ? raw.slice(TEX_BASE.length)
    : raw.replace(/^\.\/assets\/textures\//, '');
  return MOBILE_VARIANTS[rel] || null;
}
