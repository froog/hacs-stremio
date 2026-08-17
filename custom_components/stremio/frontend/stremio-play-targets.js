/**
 * Stremio Play Targets — shared "Open on …" actions for the cards.
 *
 * One button per configured target (Stremio / Fire TV / Apple TV). Stremio and
 * Fire TV open the Stremio app to the title, which resumes from your synced
 * watch position. Apple TV has no Stremio app, so it AirPlays the resolved
 * stream (starts from the beginning — it can't resume-from-position).
 *
 * Used by the Continue Watching, Browse and Library cards so they behave
 * identically. Each card supplies a normalized item {id, type, season, episode}
 * and the `html` tag from its runtime LitElement helper.
 */

const _drop = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  );

/** Open the deep link locally, on the device viewing the dashboard. */
export function openInStremioLocal(type, id) {
  // Validate ID to prevent protocol injection: only safe id characters.
  const sanitized = String(id || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!sanitized) {
    console.warn('[Stremio] Invalid media ID for deep link:', id);
    return;
  }
  window.open(`stremio://detail/${type}/${sanitized}`, '_blank');
}

/** Open the title in the Stremio app on a Fire TV (resumes from position). */
export function handoverToFireTv(hass, entity, { id, type, season, episode }) {
  return hass.callService(
    'stremio',
    'handover_to_fire_tv',
    _drop({ device_id: entity, media_id: id, media_type: type, season, episode })
  );
}

/** AirPlay the title's stream to an Apple TV. */
export function handoverToAppleTv(hass, entity, { id, type, season, episode }) {
  return hass.callService(
    'stremio',
    'handover_to_apple_tv',
    _drop({ device_id: entity, media_id: id, media_type: type, season, episode })
  );
}

/**
 * Render the "Open on …" buttons for a card's detail view.
 *
 * @param {Function} html   The card's runtime lit `html` tag.
 * @param {Object}   opts
 * @param {Object}   opts.config       The card config (reads show_open_in_stremio,
 *                                      fire_tv_entity, apple_tv_entity).
 * @param {Function} opts.onStremio    Click handler for "Open in Stremio".
 * @param {Function} opts.onFireTv     Click handler for "Open on Fire TV".
 * @param {Function} opts.onAppleTv    Click handler for "Open on Apple TV".
 */
export function renderOpenTargets(html, { config, onStremio, onFireTv, onAppleTv }) {
  return html`
    ${config.show_open_in_stremio !== false
      ? html`
          <button class="detail-button primary" @click=${onStremio}>
            <ha-icon icon="mdi:play"></ha-icon>
            Open in Stremio
          </button>
        `
      : ''}
    ${config.fire_tv_entity
      ? html`
          <button class="detail-button primary" @click=${onFireTv}>
            <ha-icon icon="mdi:television-play"></ha-icon>
            Open on Fire TV
          </button>
        `
      : ''}
    ${config.apple_tv_entity
      ? html`
          <button class="detail-button primary" @click=${onAppleTv}>
            <ha-icon icon="mdi:apple"></ha-icon>
            Open on Apple TV
          </button>
        `
      : ''}
  `;
}
